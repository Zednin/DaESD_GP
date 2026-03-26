from django.contrib import admin

# Register your models here.
from .models import Account, Customer, Organisation

# Register account model with admin panel
@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    # Settings to display columns
    list_display = ['id', 'username', 'email', 'account_type', 'date_joined']

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_username']

    def get_username(self, obj):
        return obj.account.username
    get_username.short_description = 'Username'

@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ['id', 'organisation_name', 'organisation_type', 'customer']