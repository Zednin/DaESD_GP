from django.db import models
from apps.accounts.models import Account  # Import Account so we can link to it
from apps.addresses.models import Address
# PRODUCER TABLE
# One producer profile per user account
class Producer(models.Model):
    # OneToOneField means one Account can only have ONE Producer profile
    # on_delete=CASCADE means if the Account is deleted, delete the Producer too
    user = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='producer_profile')
    company_name = models.CharField(max_length=255)                  # Company name
    business_description = models.TextField(blank=True, null=True)   # Optional description
    producer_postcode = models.CharField(max_length=12, default='', blank=True)             # Postcode
    lead_time_hours = models.PositiveIntegerField(default=48)        # Lead time hours
    created_at = models.DateTimeField(auto_now_add=True)             # Auto set when created
    business_address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name='producer_business')
    def __str__(self):
        return self.company_name  # Shows company name in admin panel


