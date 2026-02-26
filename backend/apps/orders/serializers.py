from rest_framework import serializers
from .models import Order, ProducerOrder, OrderItem

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "account",
            "delivery_address",
            "status",
            "total_amount",
            "commission_amount",
            "created_at",
            "updated_at",
        ]

class ProducerOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProducerOrder
        fields = [
            "id",
            "order",
            "producer",
            "status",
            "subtotal",
            "commission",
            "payout_amount",
            "delivery_date",
            "created_at",
            "updated_at",
        ]

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "producer_order",
            "product",
            "product_name",
            "quantity",
            "price_snapshot",
            "line_total",
            "created_at",
        ]
        read_only_fields = ["id", "price_snapshot", "line_total", "created_at"]