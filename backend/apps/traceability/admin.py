from django.contrib import admin

# Register your models here.
from .models import Allergen

@admin.register(Allergen)
class AllergenAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Allergen._meta.fields]
