from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
import secrets
import sqlite3
from threading import Barrier
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError, OperationalError, close_old_connections, connection, connections
from django.db.models.query import QuerySet
from django.test import TransactionTestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Order, OrderItem, Product


class OrderStockTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="checkout-test")
        cls.product = Product.objects.create(
            name="Prodotto test", brand="Demo", category="computer",
            price=Decimal("12.50"), stock_quantity=3,
        )
        cls.second = Product.objects.create(
            name="Secondo prodotto test", brand="Demo", category="computer",
            price=Decimal("7.25"), stock_quantity=2,
        )

    def setUp(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}"
        )

    def order(self, items, **extra):
        return self.client.post("/api/orders/", {"items": items, **extra}, format="json")

    def item(self, product=None, quantity=1):
        return {"product_id": (product or self.product).pk, "quantity": quantity}

    def assert_unchanged(self):
        self.product.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual((self.product.stock_quantity, self.second.stock_quantity), (3, 2))
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)

    def test_available_product_consumes_stock_and_uses_server_price(self):
        item = {**self.item(quantity=2), "unit_price": "0.01", "subtotal": "0.02"}
        response = self.order([item], total_amount="0.02", user=999)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total_amount"], "25.00")
        order = Order.objects.get()
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.items.get().unit_price, Decimal("12.50"))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 1)

    def test_exact_stock_is_allowed_and_catalog_becomes_out_of_stock(self):
        self.assertEqual(self.order([self.item(quantity=3)]).status_code, 201)
        response = self.client.get(f"/api/products/{self.product.pk}/")
        self.assertEqual(response.data["stock_quantity"], 0)
        self.assertEqual(response.data["availability_status"], "out_of_stock")
        self.assertEqual(self.order([self.item()]).status_code, 409)
        self.assertEqual(Order.objects.count(), 1)

    def test_sold_out_product_is_rejected(self):
        Product.objects.filter(pk=self.product.pk).update(stock_quantity=0)
        response = self.order([self.item()])
        self.assertEqual(response.status_code, 409)
        self.assertIn(self.product.name, str(response.data["detail"]))
        self.assertIn("disponibili 0", str(response.data["detail"]))
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 0)

    def test_quantity_above_stock_is_rejected(self):
        self.assertEqual(self.order([self.item(quantity=4)]).status_code, 409)
        self.assert_unchanged()

    def test_duplicate_lines_are_aggregated_and_cannot_bypass_stock(self):
        self.assertEqual(self.order([self.item(quantity=2), self.item(quantity=2)]).status_code, 409)
        self.assert_unchanged()

    def test_duplicate_lines_within_stock_create_one_item(self):
        response = self.order([self.item(), self.item(quantity=2)])
        self.assertEqual(response.status_code, 201)
        self.assertEqual(OrderItem.objects.get().quantity, 3)
        self.assertEqual(response.data["total_amount"], "37.50")
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 0)

    def test_multiple_available_products_are_saved_together(self):
        response = self.order([self.item(quantity=2), self.item(self.second)])
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total_amount"], "32.25")
        self.assertEqual(OrderItem.objects.count(), 2)
        self.product.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual((self.product.stock_quantity, self.second.stock_quantity), (1, 1))

    def test_unavailable_second_product_rolls_back_previous_stock_update(self):
        response = self.order([self.item(quantity=2), self.item(self.second, quantity=3)])
        self.assertEqual(response.status_code, 409)
        self.assert_unchanged()

    def test_missing_product_rolls_back_previous_stock_update(self):
        response = self.order([self.item(), {"product_id": self.second.pk + 1, "quantity": 1}])
        self.assertEqual(response.status_code, 400)
        self.assert_unchanged()

    def test_invalid_requests_do_not_change_stock(self):
        payloads = [
            {}, {"items": []}, {"items": None}, {"items": "invalid"},
            {"items": [{}]}, {"items": [self.item(quantity=0)]},
            {"items": [self.item(quantity=-1)]}, {"items": [self.item(quantity=1.5)]},
            {"items": [self.item(quantity=2**63)]},
            {"items": [{"product_id": 2**100, "quantity": 1}]},
            {"items": [{"product_id": 0, "quantity": 1}]},
        ]
        for payload in payloads:
            with self.subTest(payload=payload):
                response = self.client.post("/api/orders/", payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assert_unchanged()

    def test_persistence_failure_rolls_back_order_and_stock(self):
        with patch("api.views.OrderItem.objects.bulk_create", side_effect=IntegrityError("test failure")):
            with self.assertRaises(IntegrityError):
                self.order([self.item(), self.item(self.second)])
        self.assert_unchanged()

    def test_anonymous_requests_cannot_create_or_read_orders(self):
        self.client.credentials()
        self.assertEqual(self.order([self.item()]).status_code, 401)
        self.assertEqual(self.client.get("/api/orders/").status_code, 401)
        self.assert_unchanged()

    def test_registration_login_refresh_order_and_private_history(self):
        password = secrets.token_urlsafe(24)
        response = self.client.post("/api/auth/register/", {
            "username": "registered-checkout-test", "email": "checkout@example.test",
            "password": password, "first_name": "Demo", "last_name": "Test",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        login = self.client.post("/api/auth/login/", {
            "username": "registered-checkout-test", "password": password,
        }, format="json")
        self.assertEqual(login.status_code, 200)
        refreshed = self.client.post("/api/auth/token/refresh/", {
            "refresh": login.data["refresh"],
        }, format="json")
        self.assertEqual(refreshed.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        response = self.order([self.item()])
        self.assertEqual(response.status_code, 201)
        order_id = response.data["id"]
        history = self.client.get("/api/orders/")
        self.assertEqual([order["id"] for order in history.data], [order_id])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}")
        self.assertEqual(self.client.get("/api/orders/").data, [])
        self.assertEqual(self.client.get(f"/api/orders/{order_id}/").status_code, 404)

    def test_sqlite_lock_errors_return_retryable_503(self):
        if connection.vendor != "sqlite":
            self.skipTest("SQLite-specific lock handling")
        for code in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED):
            with self.subTest(code=code):
                cause = sqlite3.OperationalError("database is locked")
                cause.sqlite_errorcode = code
                failure = OperationalError("database is locked")
                failure.__cause__ = cause
                with patch("api.views.OrderViewSet._build_order", side_effect=failure):
                    response = self.order([self.item()])
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response["Retry-After"], "1")
                self.assert_unchanged()


class ConcurrentOrderStockTests(TransactionTestCase):
    def test_two_requests_cannot_purchase_the_same_last_unit(self):
        user = get_user_model().objects.create_user(username="concurrent-checkout-test")
        product = Product.objects.create(name="Ultima unità", price="10.00", stock_quantity=1)
        access = str(RefreshToken.for_user(user).access_token)
        barrier = Barrier(2)
        original_update = QuerySet.update

        def synchronized_update(queryset, **kwargs):
            if queryset.model is Product and "stock_quantity" in kwargs:
                barrier.wait(timeout=10)
            return original_update(queryset, **kwargs)

        def purchase():
            close_old_connections()
            try:
                client = APIClient()
                client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
                return client.post("/api/orders/", {
                    "items": [{"product_id": product.pk, "quantity": 1}],
                }, format="json").status_code
            finally:
                connections.close_all()

        with patch.object(QuerySet, "update", synchronized_update):
            with ThreadPoolExecutor(max_workers=2) as executor:
                results = list(executor.map(lambda _: purchase(), range(2)))
        self.assertEqual(results.count(201), 1)
        self.assertIn(next(code for code in results if code != 201), (409, 503))
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.get().quantity, 1)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.post("/api/orders/", {
            "items": [{"product_id": product.pk, "quantity": 1}],
        }, format="json")
        self.assertEqual(response.status_code, 409)
