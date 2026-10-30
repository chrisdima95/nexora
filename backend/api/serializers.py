from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Order, OrderItem, Product, UserProfile

ALLOWED_PRODUCT_CATEGORIES = {"telefoni", "tv", "elettrodomestici", "computer"}
User = get_user_model()


class ProductSerializer(serializers.ModelSerializer):
    discount_percentage = serializers.SerializerMethodField(read_only=True)
    availability_status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "brand",
            "price",
            "original_price",
            "discount_percentage",
            "image_url",
            "category",
            "description",
            "technical_specs",
            "is_featured",
            "created_at",
            "stock_quantity",
            "availability_status",
        ]
        extra_kwargs = {
            "name": {"trim_whitespace": True, "allow_blank": False},
            "brand": {"trim_whitespace": True, "allow_blank": False},
            "category": {"trim_whitespace": True, "allow_blank": False},
        }

    def get_discount_percentage(self, obj: Product) -> int | None:
        if obj.original_price is None or obj.price is None:
            return None
        if obj.original_price <= obj.price:
            return None
        ratio = (obj.original_price - obj.price) / obj.original_price
        pct = int((ratio * Decimal("100")).quantize(Decimal("1")))
        return pct if pct > 0 else None

    def get_availability_status(self, obj: Product) -> str:
        qty = obj.stock_quantity or 0
        if qty <= 0:
            return "out_of_stock"
        if qty <= 5:
            return "low_stock"
        return "in_stock"

    def validate_category(self, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in ALLOWED_PRODUCT_CATEGORIES:
            raise serializers.ValidationError(
                f"Categoria non valida. Valori ammessi: {', '.join(sorted(ALLOWED_PRODUCT_CATEGORIES))}."
            )
        return normalized

    def validate(self, attrs):
        price = attrs.get("price")
        original_price = attrs.get("original_price")

        if (
            original_price is not None
            and price is not None
            and original_price <= price
        ):
            raise serializers.ValidationError(
                {"original_price": "Deve essere maggiore di price per rappresentare una promozione valida."}
            )
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["address", "birth_date"]


class MeSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "profile"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    birth_date = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "address",
            "birth_date",
        ]

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Email gia in uso.")
        return normalized

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        address = validated_data.pop("address", "")
        birth_date = validated_data.pop("birth_date", None)
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "address": address or "",
                "birth_date": birth_date,
            },
        )
        return user


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_brand",
            "product_image_url",
            "unit_price",
            "quantity",
            "subtotal",
        ]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "total_amount",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = fields


class CreateOrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1, max_value=2**63 - 1)
    quantity = serializers.IntegerField(min_value=1, max_value=2**31 - 1)


class CreateOrderSerializer(serializers.Serializer):
    items = CreateOrderItemInputSerializer(many=True, allow_empty=False)
