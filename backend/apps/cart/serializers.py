from rest_framework import serializers
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    name = serializers.CharField(source="product.name", read_only=True)
    unit = serializers.CharField(source="product.unit", read_only=True)

    # producer info on each item
    producer_id = serializers.IntegerField(source="product.producer_id", read_only=True)
    producer_name = serializers.CharField(source="product.producer.company_name", read_only=True)
    lead_time_hours = serializers.IntegerField(source="product.producer.lead_time_hours", read_only=True)

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "name",
            "unit",
            "producer_id",
            "producer_name",
            "lead_time_hours",
            "quantity",
            "price_snapshot",
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "created_at",
            "updated_at",
        ]