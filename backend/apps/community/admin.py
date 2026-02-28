from django.contrib import admin

# Register your models here.
from .models import FarmStory, Recipe, Review

@admin.register(FarmStory)
class FarmStoryAdmin(admin.ModelAdmin):
    list_display = [field.name for field in FarmStory._meta.fields]

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Recipe._meta.fields]

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Review._meta.fields]

