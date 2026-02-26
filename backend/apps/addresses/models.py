from django.db import models
from django.db.models import Q

# Create your models here.
from apps.accounts.models import Account
from django.conf import settings
from django.core.exceptions import ValidationError

class Address(models.Model):

    # Different address types, Delivery or Business address
    class AddressType(models.TextChoices):
        DELIVERY = "DELIVERY", "Delivery"
        BUSINESS = "BUSINESS", "Business"

    # Links address to user account, Single user can have many addresses
    account = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )

    # Stores address type if it is either Delivery or Business. Sets DELIVERY as default 
    address_type = models.CharField(
        max_length=20,
        choices=AddressType.choices,
        default=AddressType.DELIVERY,
    )

    # Sets address as 'is_default' to allows to prefill on checkout
    is_default = models.BooleanField(default=False)

    # Address line 1
    address_line_1 = models.CharField(max_length=255)
    
    # Address line 2 (Optional)
    address_line_2 = models.CharField(
        max_length=255, 
        blank=True, 
        null=True)
    
    # City
    city = models.CharField(max_length=100)

    # Postcode
    postcode = models.CharField(max_length=12)

    # Created at
    created_at = models.DateTimeField(auto_now_add=True)

    # Updated at (incase business relocates)
    updated_at = models.DateTimeField(auto_now=True)    

    # Allow only PRODUCERS to create a business address
    def clean(self):
        if self.address_type == self.AddressType.BUSINESS and self.account.account_type != 'producer':
            raise ValidationError("Only producers can have a business address.")
        
        # Business addresses are always the default
        if self.address_type == self.AddressType.BUSINESS:
            self.is_default = True

        # Unset previous default for same account + type so uniqueness constraint passes
        if self.is_default:
            Address.objects.filter(
                account=self.account,
                address_type=self.address_type,
                is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)

    # Enforces rules before saving to database
    def save(self, *args, **kwargs):    
        # Runs validation across fields before saving, calls clean() method, before saving to DB
        self.full_clean()               
        # Calls django save() function only if no errors arise
        super().save(*args, **kwargs)  
        
    class Meta:
        # Returns address in order, fetches address first by default, then by created order
        ordering = ["-is_default", "-created_at"]

        # Indexes for quicker searches 
        indexes = [
            
            # Index makes quicker postcode searching 
            models.Index(fields=["postcode"]),
            
            # Index finds all delivery addresses for specific account 
            models.Index(fields=["account", "address_type"]),
        ]
        
        # 'constraints' are DB rules
        constraints = [
            
            # For one given account, can only have 1 default delivery address, prevents having 2 delivery addresses 
            models.UniqueConstraint(
                fields=["account", "address_type"],
                condition=Q(is_default=True),
                name="uniq_default_address_per_type_per_account",
            ),

            # Ensures producers can only set 1 Business address, prevents a producer having 2 different addresses for delivery
            models.UniqueConstraint(
                fields=["account"],
                condition=Q(address_type="BUSINESS"),
                name="uniq_business_address_per_account",
            ),
        ]

    

    def __str__(self):
        return f"{self.address_line_1}, {self.city}, {self.postcode}"