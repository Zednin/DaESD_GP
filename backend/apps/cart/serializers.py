from rest_framework import serializers
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    name = serializers.CharField(source="product.name", read_only=True)
    unit = serializers.CharField(source="product.unit", read_only=True)
    stock = serializers.IntegerField(source="product.stock", read_only=True)
    status = serializers.CharField(source="product.status", read_only=True)
    producer_id = serializers.IntegerField(source="product.producer_id", read_only=True)
    producer_name = serializers.CharField(source="product.producer.company_name", read_only=True)
    lead_time_hours = serializers.IntegerField(source="product.producer.lead_time_hours", read_only=True)
    bulk_stock_threshold = serializers.IntegerField(source="product.bulk_stock_threshold", read_only=True)
    bulk_stock_discount = serializers.DecimalField(
        source="product.bulk_stock_discount",
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )
    pre_bulk_price = serializers.DecimalField(
        source="price_snapshot",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "name",
            "unit",
            "stock",
            "status",
            "producer_id",
            "producer_name",
            "lead_time_hours",
            "bulk_stock_threshold",
            "bulk_stock_discount",
            "quantity",
            "price_snapshot",
            "pre_bulk_price",
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