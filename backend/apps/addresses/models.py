from django.db import models

# Create your models here.
from apps.accounts.models import Account
from django.conf import settings
from django.core.exceptions import ValidationError

class Address(models.Model):
    # Defined delivery and business addresses
    class AddressType(models.TextChoices):
        DELIVERY = "DELIVERY", "Delivery"
        BUSINESS = "BUSINESS", "Business"

    account = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )

    address_type = models.CharField(
        max_length=20,
        choices=AddressType.choices,
        default=AddressType.DELIVERY,
    )

    is_default = models.BooleanField(default=False)

    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    postcode = models.CharField(max_length=12)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Allow only producers to create a business address
    def clean(self):
        if self.address_type == self.AddressType.BUSINESS and self.account.account_type != 'producer':
            raise ValidationError("Only producers can have a business address.")
        
    class Meta: 
        ordering = ["-is_default", "created_at"]
        indexes = [
            models.Index(fields=["postcode"]),
            models.Index(fields=["account", "address_type"])
        ]

    

    def __str__(self):
        return f"{self.address_line_1}, {self.city}, {self.postcode}"