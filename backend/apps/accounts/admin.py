from django.contrib import admin

# Register your models here.
from .models import Account

# Register account model with admin panel
@admin.register(Account)

class AccountAdmin(admin.ModelAdmin):
    # Settings to display columns
    list_display = ['id', 'username', 'email', 'phone_number', 'account_type']