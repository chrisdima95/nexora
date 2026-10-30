# Generated manually for explicit brand filter (e-commerce).

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0009_rebalance_featured_by_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="brand",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Marchio del prodotto (filtro dedicato lato API, separato dalla ricerca testuale).",
                max_length=80,
            ),
        ),
    ]
