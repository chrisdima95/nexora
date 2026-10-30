from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_alter_product_image_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="technical_specs",
            field=models.TextField(blank=True, default=""),
        ),
    ]
