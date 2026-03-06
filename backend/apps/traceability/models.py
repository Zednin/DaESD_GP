from django.db import models

# Create your models here.
from apps.catalog.models import Product

class Allergen(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)   
    products = models.ManyToManyField(                      
        Product,
        related_name='allergens',
        blank=True
    )

    def __str__(self):
        return self.name