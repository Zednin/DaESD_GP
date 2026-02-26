from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    # Readable representations
    producer_name = serializers.CharField(source="producer.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "producer",
            "producer_name",
            "category",
            "category_name",
            "name",
            "description",
            "price",
            "unit",
            "stock",
            "allergens",
            "availability_start",
            "availability_end",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]