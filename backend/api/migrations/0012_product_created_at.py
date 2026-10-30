import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_populate_product_brand"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                db_index=True,
                default=django.utils.timezone.now,
                help_text="Data/ora di inserimento a catalogo (per ordinamenti 'novità' / ultimi arrivi).",
            ),
            preserve_default=False,
        ),
    ]
