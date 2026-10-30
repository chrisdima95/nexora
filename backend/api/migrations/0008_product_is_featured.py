# -*- coding: utf-8 -*-
from django.db import migrations, models


def seed_featured_products(apps, schema_editor):
    """Marca i primi prodotti per id come in evidenza (demo / ITS)."""
    Product = apps.get_model("api", "Product")
    ids = list(Product.objects.order_by("id").values_list("id", flat=True)[:6])
    if ids:
        Product.objects.filter(pk__in=ids).update(is_featured=True)


def clear_featured_products(apps, schema_editor):
    Product = apps.get_model("api", "Product")
    Product.objects.update(is_featured=False)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_seed_promotional_original_prices"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="is_featured",
            field=models.BooleanField(
                default=False,
                help_text="Se vero, il prodotto può comparire in homepage (sezione Prodotti in evidenza).",
            ),
        ),
        migrations.RunPython(seed_featured_products, clear_featured_products),
    ]
