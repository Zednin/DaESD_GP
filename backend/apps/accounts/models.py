from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager

from django.conf import settings
#'AbstractUser' Built in django class for users
# contains username, password, email, firstname, lastname, user authentication, permissions, group 

# Create your models here.


class Account(AbstractUser):
    """#1 Account"""

    # List of different account types of created users
    ACCOUNT_TYPE_CHOICES = [
        ('customer', 'Customer'),
        ('producer', 'Producer'),
        ('admin', 'Admin'),
    ]

    # Defaults to customer 
    account_type = models.CharField(max_length=10, 
                                    choices=ACCOUNT_TYPE_CHOICES, 
                                    default='customer',
                                    db_index=True
                                    )
    # Ensures email is unique (AbstractUser has email but not unique by default)
    email = models.EmailField(unique=True)

    # Note - AbstractUser already provides 'date_joined' — use that instead of a custom created_at
    # Access via: instance.date_joined

    # Overides the django save, normalise save 
    def save(self, *args, **kwargs):
        if self.email:
            self.email = BaseUserManager.normalize_email(self.email).strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
    
class Customer(models.Model):
    """#2 Customer"""

    # Account FK, enforces 1:1 relation
    account = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='customer_profile',
        )
    
    # Phone number (optional at registration, filled in later via profile)
    phone_number = models.CharField(
        max_length=15, 
        blank=True, 
        default="",
        db_index=True
        )

    # Default delivery address
    default_delivery_address = models.ForeignKey(
        'addresses.Address',                            # Reference to address.Address id
        on_delete=models.SET_NULL,                      # If address is deleted, set to null 
        null=True,                                      # Allow null in DB (no address yet)
        blank=True,                                     # Allow blank in forms/admin
        related_name='default_for_customers',           
        limit_choices_to={'address_type': 'DELIVERY'},  # Ensures that default is only for Delivery 
    )
    
    # Auto adds created address date
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Auto record updates to address 
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Customer: {self.account.username}"


class Organisation(models.Model):
    """4 Organisation"""

    # Types of organisations
    ORGANISATION_TYPE_CHOICES = [
        ('community_group', 'Community Group'),
        ('restaurant', 'Restaurant'),
        ('charity', "Charity"),
        ('education', 'Education'),
    ]

    # Ensures that organisation is to a single customer account
    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='organisation'
        )
    
    # Org name
    organisation_name = models.CharField(max_length=255)
    
    # Organisation email
    organisation_email = models.EmailField(
        max_length=255, 
        blank=True, 
        null=True
        )
    
    # Type of organisation
    organisation_type = models.CharField(
        max_length=50, 
        choices=ORGANISATION_TYPE_CHOICES, 
        blank=True, 
        null=True
        )
    
    # Records when created
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Records when updated
    updated_at = models.DateTimeField(auto_now=True)

    # Returns name of organisation in admin 
    def __str__(self):
        return self.organisation_name