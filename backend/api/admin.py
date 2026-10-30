from django.contrib import admin
from .models import Order, OrderItem, Product, UserProfile

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "brand",
        "price",
        "original_price",
        "category",
        "is_featured",
        "created_at",
    )
    list_filter = ("is_featured", "category", "brand")
    list_editable = ("is_featured",)
    search_fields = ("name", "brand", "category", "technical_specs")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "birth_date")
    search_fields = ("user__username", "user__email", "address")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "product",
        "product_name",
        "product_brand",
        "product_image_url",
        "unit_price",
        "quantity",
        "subtotal",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "order_number", "user", "status", "total_amount", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "user__username", "user__email")
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product_name", "quantity", "unit_price", "subtotal")
    search_fields = ("order__order_number", "product_name", "product_brand")
