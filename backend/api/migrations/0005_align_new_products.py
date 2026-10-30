# -*- coding: utf-8 -*-
from django.db import migrations


def align_new_products(apps, schema_editor):
    """
    Allinea solo i path immagine in public/ per prodotti aggiunti in batch.
    Non sovrascrivere description / technical_specs: il contenuto editoriale
    resta quello salvato da admin (o da seed/migrazioni precedenti).
    """
    Product = apps.get_model("api", "Product")

    rows = {
        15: {"image_url": "/SAMSUNG Galaxy A16 4128GB, 128 GB, Gray.jpg"},
        16: {"image_url": "/SAMSUNG Galaxy S26 Ultra 256GB, 256 GB, Black.jpg"},
        17: {"image_url": "/SAMSUNG Galaxy S26+ 256GB, 256 GB, Sky Blue.jpg"},
        18: {"image_url": "/SAMSUNG Galaxy A17 4G 256GB, 256 GB, Black.jpg"},
        19: {"image_url": "/MOTOROLA Edge 60 Neo 256+MotoBuds, 256 GB, Grisaille.jpg"},
        20: {"image_url": "/MOTOROLA Moto G86 5G 8+256GB, 256 GB, SILVER.jpg"},
        21: {"image_url": "/MOTOROLA Moto G35 5G 4+128GB, 128 GB, Black.jpg"},
        22: {"image_url": "/MOTOROLA EDGE 60 PRO 12+512, 512 GB, GREEN.jpg"},
        23: {"image_url": "/MOTOROLA Moto E15 4G 2+64GB, 64 GB, LAVENDER.jpg"},
        24: {"image_url": "/MOTOROLA Razr 60 Ultra, 512 GB, Scarab.jpg"},
        25: {"image_url": "/XIAOMI Redmi Note 15 Pro 8+256, 256 GB, Black.jpg"},
        26: {"image_url": "/XIAOMI Redmi Note 15 5G 8+256, 256 GB, PURPLE.jpg"},
        27: {"image_url": "/XIAOMI Redmi Note 15 Pro+ 5G 8+256 GB, 256 GB, BROWN.jpg"},
        28: {"image_url": "/OPPO A5 PRO 5G, 256 GB, GREEN.jpg"},
        29: {"image_url": "/OPPO Reno15 F 5G, 256 GB, Twilight Black.jpg"},
        30: {"image_url": "/OPPO Find X9 Pro 5G, 512 GB, White.jpg"},
        31: {"image_url": "/OPPO Reno15 F 5G + Buds3, 256 GB, Twilight Black.jpg"},
        32: {"image_url": "/OPPO A6x, 128 GB, PURPLE.jpg"},
        33: {
            "image_url": (
                "/SONY 55 BRAVIA 8 A TV OLED, SMART TV, 55, OLED, "
                "Processore Cognitive Processor XR.jpg"
            ),
        },
        34: {
            "image_url": (
                "/SONY 65 BRAVIA 8M2 XR8M2 TV QD-OLED, SMART TV, 65, OLED, "
                "Processore Cognitive Processor XR, Nero.jpg"
            ),
        },
        35: {
            "image_url": (
                "/SONY FWD-65A80L 3840x2160 pixel Alta Gamma Dinamica 10 (HDR10), Dolby Vision, "
                "HLG TV OLED, SMART TV, 65, UHD 4K, Nero.jpg"
            ),
        },
        36: {"image_url": "/SONY FWD-77XR80 TV OLED, SMART TV, 77, UHD 4K, Nero.jpg"},
        37: {
            "image_url": (
                "/LG OLED evo C5 OLED42C55LA TV OLED, SMART TV, 42, OLED, "
                "Processore a9 Gen8 4K con AI, Charcoal Black.jpg"
            ),
        },
        38: {
            "image_url": (
                "/LG OLED AI B5 OLED55B56LA TV OLED, SMART TV, 55, OLED, "
                "Processore a8 Gen2 4K con AI, Umber Brown.jpg"
            ),
        },
        39: {
            "image_url": (
                "/LG OLED evo G5S OLED48G56LS TV OLED, SMART TV, 48, OLED, "
                "Processore a11 Gen2 con AI, Rocky Black.jpg"
            ),
        },
        40: {
            "image_url": (
                "/HISENSE WFQP701219VM LAVATRICE, Caricamento frontale, 7 kg, 15 programmi, "
                "Profondità 45 cm, Giri 1200 rpm, Bianco, livello rumorosità centrifuga 72 dB(A).jpg"
            ),
        },
        41: {
            "image_url": (
                "/HOOVER H7W4 49MBC8-S LAVATRICE SLIM, Caricamento frontale, 9 kg, 18 programmi, "
                "Profondità 44,7 cm, Giri 1400 rpm, Bianco, livello rumorosità centrifuga 72 dB(A.jpg"
            ),
        },
        42: {
            "image_url": (
                "/HOOVER H3WP4474TAM61-S LAVATRICE SLIM, Caricamento frontale, 7 kg, 16 programmi, "
                "Profondità 45 cm, Giri 1400 rpm, Bianco, livello rumorosità centrifuga 77 dB(A).jpg"
            ),
        },
    }

    for product_id, fields in rows.items():
        Product.objects.filter(pk=product_id).update(**fields)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_seed_product_technical_specs"),
    ]

    operations = [
        migrations.RunPython(align_new_products, noop_reverse),
    ]
