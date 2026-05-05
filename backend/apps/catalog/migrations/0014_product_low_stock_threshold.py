from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0013_recommendationinteraction"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="low_stock_threshold",
            field=models.PositiveIntegerField(default=10),
        ),
    ]
