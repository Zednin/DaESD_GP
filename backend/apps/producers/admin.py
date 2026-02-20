from django.contrib import admin
from .models import Producer

# Register Producer with columns to display
@admin.register(Producer)
class ProducerAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_name', 'account', 'business_address']  # Columns in admin list