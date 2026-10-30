from datetime import datetime
from decimal import Decimal, InvalidOperation
from sqlite3 import SQLITE_BUSY, SQLITE_LOCKED
from uuid import uuid4

from django.db import OperationalError, connection, transaction
from rest_framework.decorators import api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from django.db.models import F, Q
from .models import Order, OrderItem, Product, UserProfile
from .serializers import (
    CreateOrderSerializer,
    MeSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
)

@api_view(["GET"])
def ping(request):
    return Response({"status": "ok"})

class ProductViewSet(ModelViewSet):
    serializer_class = ProductSerializer
    http_method_names = ["get", "head", "options"]
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Product.objects.all()

        qs = self._apply_category_filter(qs)
        qs = self._apply_brand_filter(qs)
        qs = self._apply_search_filter(qs)
        qs = self._apply_price_range_filter(qs)
        qs = self._apply_on_sale_filter(qs)
        qs = self._apply_featured_filter(qs)
        qs = self._apply_exclude_featured_filter(qs)
        qs = self._apply_exclude_on_sale_filter(qs)
        qs = self._apply_purchasable_filter(qs)
        qs = self._apply_ordering(qs)
        qs = self._apply_limit(qs)

        return qs

    def _apply_category_filter(self, queryset):
        category = (self.request.query_params.get("category") or "").strip()
        if not category:
            return queryset
        return queryset.filter(category__iexact=category)

    def _apply_brand_filter(self, queryset):
        """Filtro marchio dedicato (separato da `search`, case-insensitive)."""
        brand = (self.request.query_params.get("brand") or "").strip()
        if not brand:
            return queryset
        return queryset.filter(brand__iexact=brand)

    def _apply_search_filter(self, queryset):
        search = (self.request.query_params.get("search") or "").strip()
        if not search:
            return queryset

        # Ricerca catalogo più credibile per e-commerce:
        # prioritizza nome/marchio/categoria e richiede che ogni token sia presente
        # in almeno uno di questi campi (evita match rumorosi da descrizioni lunghe).
        tokens = [token for token in search.split() if token]
        if not tokens:
            return queryset

        filtered = queryset
        for token in tokens:
            filtered = filtered.filter(
                Q(name__icontains=token)
                | Q(brand__icontains=token)
                | Q(category__icontains=token)
            )
        return filtered

    def _apply_on_sale_filter(self, queryset):
        flag = (self.request.query_params.get("on_sale") or "").strip().lower()
        if flag not in ("1", "true", "yes"):
            return queryset
        return queryset.filter(original_price__isnull=False, original_price__gt=F("price"))

    def _apply_featured_filter(self, queryset):
        flag = (self.request.query_params.get("featured") or "").strip().lower()
        if flag not in ("1", "true", "yes"):
            return queryset
        return queryset.filter(is_featured=True)

    def _apply_exclude_featured_filter(self, queryset):
        """Esclude i prodotti in evidenza (es. home: blocco offerte vs prodotti in evidenza)."""
        flag = (self.request.query_params.get("exclude_featured") or "").strip().lower()
        if flag not in ("1", "true", "yes"):
            return queryset
        return queryset.filter(is_featured=False)

    def _apply_exclude_on_sale_filter(self, queryset):
        """Esclude prodotti in promozione (original_price > price), es. home: novità vs offerte."""
        flag = (self.request.query_params.get("exclude_on_sale") or "").strip().lower()
        if flag not in ("1", "true", "yes"):
            return queryset
        return queryset.filter(
            Q(original_price__isnull=True) | Q(original_price__lte=F("price"))
        )

    def _apply_purchasable_filter(self, queryset):
        """
        Se true, mostra solo prodotti acquistabili (stock_quantity > 0),
        quindi esclude gli out_of_stock.
        """
        flag = (self.request.query_params.get("purchasable") or "").strip().lower()
        if flag not in ("1", "true", "yes"):
            return queryset
        return queryset.filter(stock_quantity__gt=0)

    def _apply_ordering(self, queryset):
        """Ordinamento default per id; supporta recent e ordering controllato."""
        flag = (self.request.query_params.get("recent") or "").strip().lower()
        if flag in ("1", "true", "yes"):
            return queryset.order_by("-created_at", "-id")

        ordering = (self.request.query_params.get("ordering") or "").strip().lower()
        ordering_map = {
            "id": ("id",),
            "-id": ("-id",),
            "price": ("price", "id"),
            "-price": ("-price", "id"),
            "name": ("name", "id"),
            "-name": ("-name", "id"),
            "created_at": ("created_at", "id"),
            "-created_at": ("-created_at", "-id"),
        }
        if ordering in ordering_map:
            return queryset.order_by(*ordering_map[ordering])

        return queryset.order_by("id")

    def _apply_limit(self, queryset):
        limit_raw = (self.request.query_params.get("limit") or "").strip()
        if not limit_raw:
            return queryset

        try:
            limit = int(limit_raw)
        except ValueError:
            return queryset

        if limit <= 0:
            return queryset

        # Cap per evitare payload eccessivi su query live.
        return queryset[: min(limit, 20)]

    def _apply_price_range_filter(self, queryset):
        min_price_raw = (self.request.query_params.get("min_price") or "").strip()
        max_price_raw = (self.request.query_params.get("max_price") or "").strip()

        def parse_decimal(raw: str):
            if not raw:
                return None
            normalized = raw.replace(",", ".")
            try:
                value = Decimal(normalized)
            except (InvalidOperation, ValueError):
                return None
            return value if value >= 0 else None

        min_price = parse_decimal(min_price_raw)
        max_price = parse_decimal(max_price_raw)

        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)
        return queryset


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile_defaults = {"address": "", "birth_date": None}
        UserProfile.objects.get_or_create(user=request.user, defaults=profile_defaults)
        return Response(MeSerializer(request.user).data)


class StockUnavailable(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_code = "insufficient_stock"


class OrderDatabaseBusy(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Il servizio ordini è occupato. Riprova tra pochi secondi."
    default_code = "order_database_busy"
    wait = 1


class OrderViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("items")
            .order_by("-created_at", "-id")
        )

    def create(self, request, *args, **kwargs):
        input_serializer = CreateOrderSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        try:
            order = self._build_order(request.user, input_serializer.validated_data["items"])
        except OperationalError as exc:
            # Handle SQLite contention only after atomic() has rolled back.
            error_code = getattr(exc.__cause__, "sqlite_errorcode", 0)
            if connection.vendor == "sqlite" and error_code & 0xFF in (SQLITE_BUSY, SQLITE_LOCKED):
                raise OrderDatabaseBusy() from exc
            raise
        output_serializer = self.get_serializer(order)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def _build_order(self, user, raw_items):
        aggregated: dict[int, int] = {}
        for item in raw_items:
            product_id = int(item["product_id"])
            quantity = int(item["quantity"])
            aggregated[product_id] = aggregated.get(product_id, 0) + quantity

        # The first database operation is a conditional write, avoiding SQLite's
        # read-to-write lock upgrade. Stable ordering also limits lock inversions
        # on databases that support row locks. Never trust frontend stock values.
        for product_id, quantity in sorted(aggregated.items()):
            updated = Product.objects.filter(
                pk=product_id, stock_quantity__gte=quantity
            ).update(stock_quantity=F("stock_quantity") - quantity)
            if not updated:
                product = Product.objects.filter(pk=product_id).first()
                if product is None:
                    raise ValidationError({"items": f"Prodotto non trovato: {product_id}."})
                raise StockUnavailable(
                    f'Disponibilità insufficiente per "{product.name}": '
                    f"richiesti {quantity}, disponibili {product.stock_quantity}. "
                    "Aggiorna il carrello prima di riprovare."
                )

        products = Product.objects.in_bulk(aggregated.keys())

        order_number = self._generate_order_number()
        order = Order.objects.create(
            user=user,
            order_number=order_number,
            total_amount=Decimal("0.00"),
            status=Order.Status.CONFIRMED,
        )

        total_amount = Decimal("0.00")
        items_to_create: list[OrderItem] = []
        for product_id, quantity in aggregated.items():
            product = products[product_id]
            unit_price = product.price
            subtotal = unit_price * quantity
            total_amount += subtotal
            items_to_create.append(
                OrderItem(
                    order=order,
                    product=product,
                    product_name=product.name,
                    product_brand=product.brand or "",
                    product_image_url=product.image_url or "",
                    unit_price=unit_price,
                    quantity=quantity,
                    subtotal=subtotal,
                )
            )

        OrderItem.objects.bulk_create(items_to_create)
        order.total_amount = total_amount
        order.save(update_fields=["total_amount", "updated_at"])
        return order

    def _generate_order_number(self) -> str:
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        suffix = uuid4().hex[:6].upper()
        return f"ORD-{timestamp}-{suffix}"

