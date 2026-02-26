from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
#'AbstractUser' Built in django class for users
# contains username, password, email, firstname, lastname, user authentication, permissions, group 

# Create your models here.


class Account(AbstractUser):
    """#1 Account"""

    # Account types of created users
    ACCOUNT_TYPE_CHOICES = [
        ('customer', 'Customer'),
        ('producer', 'Producer'),
        ('admin', 'Admin'),
    ]
    # Defaults to customer 
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default='customer')
    
    # Ensures email is unique
    email = models.EmailField(unique=True)

    # Auto add account created date
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
    
class Customer(models.Model):
    """#2 Customer"""

    # Account FK, enforces 1:1 relation
    account = models.OneToOneField(
        Account, 
        on_delete=models.CASCADE, 
        related_name='customer_profile',
        )
    
    # Phone number (optional at registration, filled in later via profile)
    phone_number = models.CharField(
        max_length=15, 
        blank=True, 
        default=""
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
        Customer, 
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