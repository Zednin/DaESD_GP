from rest_framework import serializers

from .models import Product, Category
from apps.traceability.models import Allergen


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class ProductAllergenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = ["id", "name"]


class ProductSerializer(serializers.ModelSerializer):
    producer_name = serializers.CharField(
        source="producer.company_name",
        read_only=True,
    )

    producer_profile_id = serializers.SerializerMethodField()

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    allergens = ProductAllergenSerializer(many=True, read_only=True)

    allergen_ids = serializers.PrimaryKeyRelatedField(
        queryset=Allergen.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    surplus_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    surplus_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "producer",
            "producer_profile_id",
            "producer_name",
            "category",
            "category_name",
            "name",
            "description",
            "price",
            "unit",
            "stock",
            "low_stock_threshold",
            "is_low_stock",
            "stock_alert_level",
            "availability_mode",
            "season_start_month",
            "season_end_month",
            "status",
            "harvest_date",
            "organic_certified",
            "image",
            "is_surplus",
            "discount_percentage",
            "surplus_end_date",
            "surplus_note",
            "best_before_date",
            "surplus_price",
            "surplus_active",
            "created_at",
            "updated_at",
            "allergens",
            "allergen_ids",
        ]

        read_only_fields = [
            "id",
            "producer",
            "created_at",
            "updated_at",
            "surplus_price",
            "surplus_active",
            "producer_profile_id",
            "producer_name",
            "category_name",
            "allergens",
            "is_low_stock",
            "stock_alert_level",
        ]

    def get_producer_profile_id(self, obj):
        return obj.producer_id

    def create(self, validated_data):
        allergens = validated_data.pop("allergen_ids", [])
        product = super().create(validated_data)

        for allergen in allergens:
            allergen.products.add(product)

        return product

    def update(self, instance, validated_data):
        allergens = validated_data.pop("allergen_ids", None)
        product = super().update(instance, validated_data)

        if allergens is not None:
            instance.allergens.clear()

            for allergen in allergens:
                allergen.products.add(product)

        return product