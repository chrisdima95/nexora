# -*- coding: utf-8 -*-
from django.db import migrations


def rebalance_featured_by_category(apps, schema_editor):
    """
    Homepage: fino a 6 prodotti in evidenza, distribuiti tra categorie (2+2+2),
    invece dei primi 6 per id (tipicamente tutti telefoni Apple).
    """
    Product = apps.get_model("api", "Product")
    Product.objects.update(is_featured=False)

    featured_ids = []
    for cat, limit in (
        ("telefoni", 2),
        ("tv", 2),
        ("elettrodomestici", 2),
    ):
        ids = list(
            Product.objects.filter(category__iexact=cat)
            .order_by("id")
            .values_list("id", flat=True)[:limit]
        )
        featured_ids.extend(ids)

    if featured_ids:
        Product.objects.filter(pk__in=featured_ids).update(is_featured=True)


def restore_featured_first_six(apps, schema_editor):
    Product = apps.get_model("api", "Product")
    Product.objects.update(is_featured=False)
    ids = list(Product.objects.order_by("id").values_list("id", flat=True)[:6])
    if ids:
        Product.objects.filter(pk__in=ids).update(is_featured=True)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_product_is_featured"),
    ]

    operations = [
        migrations.RunPython(rebalance_featured_by_category, restore_featured_first_six),
    ]
