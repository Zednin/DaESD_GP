from django.db import models
from apps.producers.models import Producer

# Create your models here.
# PRODUCTS TABLE
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Product(models.Model):

    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('litre', 'Litre'),
        ('ml', 'Millilitre'),
        ('unit', 'Unit'),
        ('dozen', 'Dozen'),
    ]
    
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('unavailable', 'Unavailable'),
    ]
    # ForeignKey means many Products can belong to ONE Producer
    # on_delete=CASCADE means if Producer is deleted, delete their Products too
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)            
    price = models.DecimalField(max_digits=10, decimal_places=2)     
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='unit')
    stock = models.IntegerField(default=0)                         
    allergens = models.ManyToManyField("traceability.Allergen", blank=True, related_name="products")
    availability_start = models.DateField()
    availability_end = models.DateField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='available')
    created_at = models.DateTimeField(auto_now_add=True)             

    def __str__(self):
        return self.name



