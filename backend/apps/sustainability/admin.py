from django.contrib import admin
# Register your models here.
from .models import DistanceRecord, Surplus

@admin.register(DistanceRecord)
class DistanceRecordAdmin(admin.ModelAdmin):
    list_display = [field.name for field in DistanceRecord._meta.fields]

@admin.register(Surplus)
class SurplusAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Surplus._meta.fields]

