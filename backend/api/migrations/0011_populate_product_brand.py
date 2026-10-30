# -*- coding: utf-8 -*-
"""Valorizza `brand` dai nomi prodotto esistenti (prefisso marchio)."""

from django.db import migrations

# Ordine: prefissi più lunghi / specifici prima di quelli corti (es. LG).
_PREFIX_TO_LABEL = (
    ("ELECTROLUX", "Electrolux"),
    ("MOTOROLA", "Motorola"),
    ("SAMSUNG", "Samsung"),
    ("HISENSE", "Hisense"),
    ("XIAOMI", "Xiaomi"),
    ("APPLE", "Apple"),
    ("HOOVER", "Hoover"),
    ("SONY", "Sony"),
    ("BEKO", "Beko"),
    ("OPPO", "OPPO"),
    ("LG", "LG"),
)


def _brand_from_name(name: str) -> str:
    n = (name or "").strip().upper()
    if not n:
        return ""
    for prefix, label in _PREFIX_TO_LABEL:
        if n.startswith(prefix + " ") or n == prefix:
            return label
    return ""


def populate_brands(apps, schema_editor):
    Product = apps.get_model("api", "Product")
    for p in Product.objects.all().only("id", "name", "brand"):
        if (p.brand or "").strip():
            continue
        b = _brand_from_name(p.name)
        if b:
            Product.objects.filter(pk=p.pk).update(brand=b)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0010_product_brand"),
    ]

    operations = [
        migrations.RunPython(populate_brands, noop_reverse),
    ]
