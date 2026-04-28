from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0011_product_best_before_date_product_discount_percentage_and_more'),
    ]

    operations = [
        TrigramExtension(),
    ]
