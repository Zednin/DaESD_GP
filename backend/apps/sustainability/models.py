from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.catalog.models import Product
from apps.producers.models import Producer

class DistanceRecord(models.Model):
    """19 Distance Record"""

    # Order FK
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='distance_records'
    )

    # Producer Address FK (must be BUSINESS)
    producer_address = models.ForeignKey(
        'addresses.Address',
        on_delete=models.CASCADE,
        related_name='distance_as_producer'
    )

    # Customer Address FK (must be DELIVERY)
    customer_address = models.ForeignKey(
        'addresses.Address',
        on_delete=models.CASCADE,
        related_name='distance_as_customer'
    )

    # Distance in KM
    distance_km = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    # Calculated at
    calculated_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        super().clean()

        # Producer address must be a BUSINESS address
        if self.producer_address_id and self.producer_address.address_type != 'BUSINESS':
            raise ValidationError({
                'producer_address': 'Producer address must be a BUSINESS address.'
            })

        # Customer address must be a DELIVERY address
        if self.customer_address_id and self.customer_address.address_type != 'DELIVERY':
            raise ValidationError({
                'customer_address': 'Customer address must be a DELIVERY address.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.order.id} - {self.distance_km}km"

class Surplus(models.Model):
    """9 Surplus"""

    # Producer FK
    producer = models.ForeignKey(
        Producer,
        on_delete=models.CASCADE,
        related_name='surpluses'
    )

    # Product FK (unique - only one active surplus per product)
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='surplus'
    )

    # Discount Percent 1-100
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(100)
        ]
    )

    # Expires at (manually set by producer)
    expires_at = models.DateTimeField()

    # Created at
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product} - {self.discount_percent}% off (expires {self.expires_at})"