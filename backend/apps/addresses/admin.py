from django.contrib import admin

# Register your models here.
from .models import Address

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['id','account', 'address_type', 'is_default', 'postcode']
