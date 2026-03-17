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

    # Set seasonal avaialability for product
    class AvailabilityMode(models.TextChoices):
        YEAR_ROUND = "year_round", "Available Year-Round"
        SEASONAL = "seasonal", "In Season"

    # Months
    MONTH_CHOICES = [
        (1, "January"),
        (2, "February"),
        (3, "March"),
        (4, "April"),
        (5, "May"),
        (6, "June"),
        (7, "July"),
        (8, "August"),
        (9, "September"),
        (10, "October"),
        (11, "November"),
        (12, "December"),
    ]

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
    
    # Seasonal availability
    availability_mode = models.CharField(
        max_length=20,
        choices=AvailabilityMode.choices,
        default=AvailabilityMode.YEAR_ROUND
    )
    season_start_month = models.PositiveSmallIntegerField(
        choices=MONTH_CHOICES,
        null=True,
        blank=True
    )
    season_end_month = models.PositiveSmallIntegerField(
        choices=MONTH_CHOICES,
        null=True,
        blank=True
    )
    
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
    
    # Image URL
    image = models.URLField(max_length=500, blank=True, null=True)
    
    # Product listing date
    created_at = models.DateTimeField(auto_now_add=True)             

    # Product listing updated from inventory_adjustment
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Validates data before saving
        super().clean()
        
        errors = {}
        # Prevents availability end from being set before start
        if self.availability_mode == self.AvailabilityMode.SEASONAL:
            if not self.season_start_month:
                errors["season_start_month"] = "This field is required for seasonal products."
            if not self.season_end_month:
                errors["season_end_month"] = "This field is required for seasonal products."
        else:
            if self.season_start_month is not None:
                errors["season_start_month"] = "Leave blank for year-round products."
            if self.season_end_month is not None:
                errors["season_end_month"] = "Leave blank for year-round products."

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