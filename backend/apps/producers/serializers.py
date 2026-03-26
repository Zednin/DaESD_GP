from rest_framework import serializers
from .models import Producer
from apps.community.models import Recipe, FarmStory


class ProducerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producer
        fields = [
            "id",
            "account",
            "company_name",
            "company_email",
            "company_number",
            "company_description",
            "lead_time_hours",
            "business_address",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RecipeSerializer(serializers.ModelSerializer):
    product_names = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id",
            "producer",
            "title",
            "description",
            "ingredients",
            "instructions",
            "image",
            "seasonal_tag",
            "products",
            "product_names",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_product_names(self, obj):
        return list(obj.products.values_list("name", flat=True))


class FarmStorySerializer(serializers.ModelSerializer):
    content = serializers.CharField(source="body")

    class Meta:
        model = FarmStory
        fields = [
            "id",
            "producer",
            "title",
            "content",
            "image",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]