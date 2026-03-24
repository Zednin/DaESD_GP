from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from .models import Order, ProducerOrder, OrderItem

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

class ProducerOrderSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        source='total_amount', max_digits=10, decimal_places=2, read_only=True,
    )
    commission = serializers.SerializerMethodField()
    payout_amount = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    delivery_address = serializers.SerializerMethodField()
    special_instructions = serializers.SerializerMethodField()
    lead_time_hours = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    stripe_ref = serializers.SerializerMethodField()

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
            "customer_name",
            "customer_email",
            "customer_phone",
            "delivery_address",
            "special_instructions",
            "lead_time_hours",
            "items",
            "stripe_ref",
            "created_at",
            "updated_at",
        ]

    def get_stripe_ref(self, obj):
        return obj.order.stripe_session_id or ""

    def get_commission(self, obj):
        return (obj.total_amount * COMMISSION_RATE).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )

    def get_payout_amount(self, obj):
        commission = (obj.total_amount * COMMISSION_RATE).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )
        return obj.total_amount - commission

    def get_customer_name(self, obj):
        account = obj.order.account
        full = f"{account.first_name} {account.last_name}".strip()
        return full or account.username

    def get_customer_email(self, obj):
        return obj.order.account.email

    def get_customer_phone(self, obj):
        account = obj.order.account
        profile = getattr(account, 'customer_profile', None)
        return profile.phone_number if profile else ""

    def get_delivery_address(self, obj):
        addr = obj.order.delivery_address
        if not addr:
            return None
        return {
            "address_line_1": addr.address_line_1,
            "address_line_2": addr.address_line_2 or "",
            "city": addr.city,
            "postcode": addr.postcode,
        }

    def get_special_instructions(self, obj):
        return obj.order.special_instructions or ""

    def get_lead_time_hours(self, obj):
        return obj.producer.lead_time_hours
