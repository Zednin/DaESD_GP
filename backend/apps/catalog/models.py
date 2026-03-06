from django.db import models
from apps.producers.models import Producer
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.conf import settings
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

    # Product listing updated from inventory_adjustment
    updated_at = models.DateTimeField(auto_now=True)

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

class InventoryAdjustment(models.Model):
    """26 Inventory Adjustment"""
    #Types of adjustments:
    ADJUSTMENT_REASON = [
        # Auto adjust when order is made
        ('order_adjustment', 'Order Adjustment'),    
        # Adjust when Producer Restocks / Removes stock
        ('producer_adjustment_add', 'Producer Adjustment - Adding Stock'),
        ('producer_adjustment_remove', 'Producer Adjustment - Removing Stock')                      
    ]

    # Inventory adjustment to Product  
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='inventory_adjustment'
    )

    # Order item id
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name = 'inventory_adjustment'
        )

    # Change in quantity
    delta_quantity = models.IntegerField()

    # Reason for change
    reason = models.CharField(
        max_length=50,
        choices=ADJUSTMENT_REASON
        )

    # Changed by User or System (null)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventory_adjustment',
        )

    # Date changed
    changed_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Update the product stock by the delta_quantity
        self.product.stock += self.delta_quantity
        self.product.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product} | {self.delta_quantity} | {self.reason}"