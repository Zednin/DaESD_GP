from django.contrib import admin

# Register your models here.
from .models import Category, Product, InventoryAdjustment, RecommendationInteraction

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Category._meta.fields]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Product._meta.fields]

@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = [field.name for field in InventoryAdjustment._meta.fields]


@admin.register(RecommendationInteraction)
class RecommendationInteractionAdmin(admin.ModelAdmin):
    """Admin view for AI recommendation interaction logs.

    Allows AI engineers to inspect every recommendation event,
    filter by event type or product, and export data for model
    retraining (AAI Case Study Requirement 3).
    """

    list_display = [
        "id",
        "account",
        "product",
        "event_type",
        "recommendation_rank",
        "reorder_probability",
        "created_at",
    ]
    list_filter = ["event_type", "created_at"]
    search_fields = ["account__email", "product__name"]
    ordering = ["-created_at"]
    readonly_fields = [
        "account",
        "product",
        "event_type",
        "recommendation_rank",
        "reorder_probability",
        "created_at",
    ]

