# -*- coding: utf-8 -*-
from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations


def seed_promotional_original_prices(apps, schema_editor):
    """
    Imposta un prezzo di listino superiore al prezzo corrente per un sottoinsieme
    di prodotti demo, così la pagina offerte ha dati credibili senza modificare i price.
    """
    Product = apps.get_model("api", "Product")
    # Mix di categorie (telefoni, TV, elettrodomestici) presenti nei seed / admin tipici
    promo_ids = [
        1,
        2,
        3,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        22,
        33,
        40,
        41,
    ]
    factor = Decimal("1.12")

    for p in Product.objects.filter(pk__in=promo_ids).iterator():
        cur = p.price
        if cur is None:
            continue
        bumped = (cur * factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if bumped > cur:
            p.original_price = bumped
            p.save(update_fields=["original_price"])


def noop_reverse(apps, schema_editor):
    Product = apps.get_model("api", "Product")
    promo_ids = [
        1,
        2,
        3,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        22,
        33,
        40,
        41,
    ]
    Product.objects.filter(pk__in=promo_ids).update(original_price=None)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_product_original_price"),
    ]

    operations = [
        migrations.RunPython(seed_promotional_original_prices, noop_reverse),
    ]
