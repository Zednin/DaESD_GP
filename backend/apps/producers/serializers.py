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
    like_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

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
            "like_count",
            "liked_by_me",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_like_count(self, obj):
        annotated_count = getattr(obj, "like_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            return False

        liked_story_ids = self.context.get("liked_story_ids")
        if liked_story_ids is not None:
            return obj.id in liked_story_ids

        return obj.likes.filter(customer=user).exists()
