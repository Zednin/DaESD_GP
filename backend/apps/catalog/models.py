from django.db import models
from apps.producers.models import Producer
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
# Create your models here.

class Category(models.Model):
    """6 Category"""
    # Category Name 
    name = models.CharField(
        max_length=100, 
        unique=True
        )
    
    # Category Description
    description = models.TextField()

    def __str__(self):
        return self.name

class Product(models.Model):
    """7 Product"""

    # Different units for products
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('litre', 'Litre'),
        ('ml', 'Millilitre'),
        ('unit', 'Unit'),
        ('dozen', 'Dozen'),
    ]
    
    # Status of products
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('unavailable', 'Unavailable'),
    ]
    
    # Producer uuid FK
    producer = models.ForeignKey(
        Producer,                   # ForeignKey means many Products can belong to ONE Producer
        on_delete=models.CASCADE,   # on_delete=CASCADE means if Producer is deleted, delete their Products too
        related_name='products'
        )

    # Category
    category = models.ForeignKey(
        Category,               
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='products'
        )
    
    # Product Name
    name = models.CharField(max_length=255)                        
    
    # Product Description
    description = models.TextField(blank=True, null=True)            
    
    # Price in decimal
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
        )     
    
    # Unit type
    unit = models.CharField(
        max_length=10, 
        choices=UNIT_CHOICES, 
        default='unit'
        )
    
    # Amount of producr in stock
    stock = models.IntegerField(default=0)                         
    
    # Start Availability date
    availability_start = models.DateField()
    
    # End Availability date
    availability_end = models.DateField()
    
    # Availability status of Product
    status = models.CharField(
        max_length=15, 
        choices=STATUS_CHOICES, 
        default='available'
        )
    
    # Harvest date
    harvest_date = models.DateTimeField(
        blank=True, 
        null=True
        )       
    
    # Organic certification
    organic_certified = models.BooleanField(default=False)           
    
    # Product listing date
    created_at = models.DateTimeField(auto_now_add=True)             


    def clean(self):
        # Validates data before saving
        super().clean()
        
        # Prevents availability end from being set before start
        if self.availability_end and self.availability_start and self.availability_end < self.availability_start:
            raise ValidationError("availability_end cannot be before availability_start.")

    # Enforces rules before saving to database
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


