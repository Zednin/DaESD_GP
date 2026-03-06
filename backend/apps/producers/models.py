from django.db import models
from apps.addresses.models import Address
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator

# One producer profile per user account
class Producer(models.Model):
    """3 Producer """
    # OneToOneField means one Account can only have ONE Producer profile
    
    # FK to accounts
    account = models.OneToOneField(
        settings.AUTH_USER_MODEL,           # Prevents circular import. reads accounts.Account and links to model from \accounts
        on_delete=models.CASCADE,           # If the Account is deleted, delete the Producer too
        related_name="producer_profile",    # Name for returned profile 
    )
    
    # Company Name
    company_name = models.CharField(max_length=255)                  
    
    # Company email
    company_email = models.EmailField()

    # Company number
    company_number = models.CharField(max_length=15)
    
    # Company description
    company_description = models.TextField(blank=True)       
    
    # Lead time hours (set to minimum 48 as default)
    lead_time_hours = models.PositiveIntegerField(
        default=48,
        validators=[MinValueValidator(48)],
    )    

    # Ensures that producer address is 1:1 with the business address
    business_address = models.OneToOneField(
        Address, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='producer_business',
        limit_choices_to={"address_type": Address.AddressType.BUSINESS},
    )

     # Auto set when created
    created_at = models.DateTimeField(auto_now_add=True)            
    
    # Ensures business address belongs to thesame account as business address set by
    def clean(self):
        super().clean()
        if self.business_address and self.business_address.account_id != self.account_id:
            raise ValidationError("Business address must belong to the same account as this producer.")

    # Enforces rules before saving to database
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        
    def __str__(self):
        return self.company_name  

    # Meta - controls how models behave
    class Meta:
            indexes = [
                # Index makes quicker company name searching 
                models.Index(fields=["company_name"]),
            ]
