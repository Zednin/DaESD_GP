from django.contrib import admin

# Register your models here.
from apps.cart.models import Cart, CartItem
@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Cart._meta.fields]

@admin.register(CartItem)
class CartAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CartItem._meta.fields]

    