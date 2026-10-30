# Generated manually for promotional pricing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_align_new_products"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="original_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Prezzo di listino prima dello sconto. Se maggiore di price, il prodotto è in offerta.",
                max_digits=10,
                null=True,
            ),
        ),
    ]
