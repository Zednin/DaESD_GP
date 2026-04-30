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
            "company_number",
            "company_description",
            "lead_time_hours",
            "business_address",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "account"]


class RecipeSerializer(serializers.ModelSerializer):
    product_names = serializers.SerializerMethodField()
    linked_products = serializers.SerializerMethodField()

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
            "linked_products",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_product_names(self, obj):
        return list(obj.products.values_list("name", flat=True))

    def get_linked_products(self, obj):
        return list(obj.products.values("id", "name"))


class FarmStorySerializer(serializers.ModelSerializer):
    content = serializers.CharField(source="body")
    company_name = serializers.CharField(source="producer.company_name", read_only=True)

    class Meta:
        model = FarmStory
        fields = [
            "id",
            "producer",
            "company_name",
            "title",
            "content",
            "image",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
