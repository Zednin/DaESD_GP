from django.db import models
from django.contrib.auth.models import AbstractUser
#'AbstractUser' Built in django class for users
# contains username, password, email, firstname, lastname, user authentication, permissions, group 

# Create your models here.
class Account(AbstractUser):
    
    # Account types of created users
    ACCOUNT_TYPE_CHOICES = [
        ('customer', 'Customer'),
        ('producer', 'Producer'),
        ('admin', 'Admin'),
    ]
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    # Defaults to customer 
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default='customer')
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return self.username
    
class Customer(models.Model):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='customer_profile')

    def __str__(self):
        return f"Customer: {self.account.first_name} {self.account.last_name}"