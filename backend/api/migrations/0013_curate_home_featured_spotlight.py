# -*- coding: utf-8 -*-
from django.db import migrations


def curate_home_featured(apps, schema_editor):
    """
    Vetrina home: 6 SKU reali, più leggibili come “primo piano” rispetto al vecchio 2+2+2
    per primi id (due iPhone base + due TV Samsung 43\" molto simili).

    Nuova selezione (id stabili del seed):
    - telefoni: flagship Apple + Samsung (non necessariamente i primi due id categoria)
    - tv: LG OLED + Sony BRAVIA (più varietà di gamma rispetto a due LED 43\")
    - elettrodomestici: Electrolux + Hoover (marchi e famiglie distinte)
    """
    Product = apps.get_model("api", "Product")
    Product.objects.update(is_featured=False)

    spotlight_ids = [6, 16, 37, 34, 9, 42]
    existing = set(Product.objects.filter(pk__in=spotlight_ids).values_list("pk", flat=True))
    picked = [pk for pk in spotlight_ids if pk in existing]

    if picked:
        Product.objects.filter(pk__in=picked).update(is_featured=True)


def restore_previous_featured(apps, schema_editor):
    """Ripristina la logica 0009 (2+2+2 per primi id di categoria)."""
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


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_product_created_at"),
    ]

    operations = [
        migrations.RunPython(curate_home_featured, restore_previous_featured),
    ]
