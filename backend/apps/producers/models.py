from django.db import models
from apps.accounts.models import Account  # Import Account so we can link to it
from apps.addresses.models import Address
from django.conf import settings
from django.core.exceptions import ValidationError
# PRODUCER TABLE
# One producer profile per user account
class Producer(models.Model):
    # OneToOneField means one Account can only have ONE Producer profile
    # on_delete=CASCADE means if the Account is deleted, delete the Producer too
    account = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="producer_profile",
    )
    

    company_name = models.CharField(max_length=255)                  # Company name
    business_description = models.TextField(blank=True, null=True)   # Optional description
    lead_time_hours = models.PositiveIntegerField(default=48)        # Lead time hours

    # Ensures that producer address is 1:1 with the business address
    business_address = models.OneToOneField(
        Address, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='producer_business',
        limit_choices_to={"address_type": Address.AddressType.BUSINESS},
    )
    created_at = models.DateTimeField(auto_now_add=True)             # Auto set when created
    
    # Ensures business address belongs to thesame account as producer
    def clean(self):
        if self.business_address and self.business_address.account_id != self.account_id:
            raise ValidationError("Business address can only be set by business")
        
    def __str__(self):
        return self.company_name  # Shows company name in admin panel


