from django.db import models
from django.contrib.auth.models import AbstractUser
#'AbstractUser' Built in django class for users
# contains username, password, email, firstname, lastname, user authentication, permissions, group 

# Create your models here.
class Account(AbstractUser):
    ACCOUNT_TYPE_CHOICES = [
        ('customer', 'Customer'),
        ('producer', 'Producer'),
    ]
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default='customer')


    def __str__(self):
        return self.username