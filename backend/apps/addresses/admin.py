from django.contrib import admin

# Register your models here.
from apps.addresses.models import Address
@admin.register(Address)
class Address(admin.ModelAdmin):
    list_display = ['id','user', 'postcode']
