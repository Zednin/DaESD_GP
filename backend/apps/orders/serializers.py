from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from .models import Order, ProducerOrder, OrderItem, RecurringOrder, RecurringOrderItem, RecurringOrderEvent

COMMISSION_RATE = Decimal('0.05')

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
    subtotal = serializers.DecimalField(
        source='total_amount', max_digits=10, decimal_places=2, read_only=True,
    )
    commission = serializers.SerializerMethodField()
    payout_amount = serializers.SerializerMethodField()

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

    def get_commission(self, obj):
        return (obj.total_amount * COMMISSION_RATE).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )

    def get_payout_amount(self, obj):
        commission = (obj.total_amount * COMMISSION_RATE).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )
        return obj.total_amount - commission

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




class RecurringOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = RecurringOrderItem
        fields = ["id", "recurring_order", "product", "product_name", "quantity"]
        read_only_fields = ["id"]


class RecurringOrderEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringOrderEvent
        fields = ["id", "recurring_order", "scheduled_for", "status", "order", "created_at"]
        read_only_fields = fields


class RecurringOrderSerializer(serializers.ModelSerializer):
    items = RecurringOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = RecurringOrder
        fields = [
            "id", "organisation", "delivery_address", "name",
            "frequency", "order_day", "delivery_day",
            "status", "next_run_at", "starts_at", "ends_at",
            "created_at", "updated_at", "items",
        ]
        read_only_fields = [
            "id", "organisation", "delivery_address",
            "next_run_at", "starts_at", "created_at", "updated_at", "items",
        ]