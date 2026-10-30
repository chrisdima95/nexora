from django.db import migrations, models


def seed_stock_quantity(apps, schema_editor):
    Product = apps.get_model("api", "Product")
    for product in Product.objects.all().only("id"):
        if product.id % 7 == 0:
            qty = 0
        elif product.id % 5 == 0:
            qty = 3
        else:
            qty = 18
        Product.objects.filter(pk=product.pk).update(stock_quantity=qty)


def reset_stock_quantity(apps, schema_editor):
    Product = apps.get_model("api", "Product")
    Product.objects.all().update(stock_quantity=0)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0013_curate_home_featured_spotlight"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="stock_quantity",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Quantita disponibile a catalogo (demo semplificata, senza gestione magazzino avanzata).",
            ),
        ),
        migrations.RunPython(seed_stock_quantity, reset_stock_quantity),
    ]
