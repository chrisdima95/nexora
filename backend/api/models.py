from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models.manager import Manager


class Product(models.Model):
    objects: models.Manager = models.Manager()

    name = models.CharField(max_length=200)
    brand = models.CharField(
        max_length=80,
        blank=True,
        db_index=True,
        help_text="Marchio del prodotto (filtro dedicato lato API, separato dalla ricerca testuale).",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Prezzo di listino prima dello sconto. Se maggiore di price, il prodotto è in offerta.",
    )
    image_url = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    technical_specs = models.TextField(blank=True, default="")
    is_featured = models.BooleanField(
        default=False,
        help_text="Se vero, il prodotto può comparire in homepage (sezione Prodotti in evidenza).",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Data/ora di inserimento a catalogo (per ordinamenti 'novità' / ultimi arrivi).",
    )
    stock_quantity = models.PositiveIntegerField(
        default=0,
        help_text="Quantita disponibile a catalogo (demo semplificata, senza gestione magazzino avanzata).",
    )

    def __str__(self) -> str:
        return str(self.name)


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    address = models.CharField(max_length=255, blank=True)
    birth_date = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Profile<{self.user_id}>"


class Order(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = "confirmed", "Confirmed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    order_number = models.CharField(max_length=32, unique=True, db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=200)
    product_brand = models.CharField(max_length=80, blank=True)
    product_image_url = models.CharField(max_length=255, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.order.order_number} - {self.product_name} x{self.quantity}"
