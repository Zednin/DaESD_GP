from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Order, ProducerOrder, OrderItem, RecurringOrder, RecurringOrderItem
from apps.community.models import Review

COMMISSION_RATE = Decimal('0.05')

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    review_status = serializers.SerializerMethodField()

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
            "review_status",
        ]
        read_only_fields = ["id", "price_snapshot", "line_total", "created_at"]

    def get_review_status(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            return {
                "can_review": False,
                "existing_review_id": None,
                "label": "Sign in to review",
                "reason": "unauthenticated",
            }

        existing_review = Review.objects.filter(
            customer=user,
            product=obj.product,
        ).only("id").first()

        if existing_review:
            return {
                "can_review": True,
                "existing_review_id": existing_review.id,
                "label": "Edit review",
                "reason": "already_reviewed",
            }

        if obj.producer_order.status != "delivered":
            return {
                "can_review": False,
                "existing_review_id": None,
                "label": "Available after delivery",
                "reason": "not_delivered",
            }

        return {
            "can_review": True,
            "existing_review_id": None,
            "label": "Leave review",
            "reason": "eligible",
        }
        
class CustomerProducerOrderSerializer(serializers.ModelSerializer):
    producer_name = serializers.CharField(source="producer.company_name", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProducerOrder
        fields = [
            "id",
            "producer",
            "producer_name",
            "status",
            "delivery_date",
            "items",
            "created_at",
            "updated_at",
        ]

class OrderSerializer(serializers.ModelSerializer):
    producer_orders = CustomerProducerOrderSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "account",
            "delivery_address",
            "status",
            "total_amount",
            "commission_amount",
            "producer_orders",
            "created_at",
            "updated_at",
        ]

class ProducerOrderSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        source='total_amount', max_digits=10, decimal_places=2, read_only=True,
    )
    commission = serializers.SerializerMethodField()
    payout_amount = serializers.SerializerMethodField()
    producer_name = serializers.CharField(source='producer.company_name', read_only=True)
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
            "producer_name",
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


class RecurringOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_status = serializers.CharField(source="product.status", read_only=True)
    product_available = serializers.SerializerMethodField()
    unit = serializers.CharField(source="product.unit", read_only=True)
    price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = RecurringOrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_status",
            "product_available",
            "unit",
            "price",
            "quantity",
        ]
        read_only_fields = fields

    def get_product_available(self, obj):
        return obj.product.status == "available"


class RecurringOrderItemUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=0)


class RecurringOrderSerializer(serializers.ModelSerializer):
    items = RecurringOrderItemSerializer(many=True, read_only=True)
    organisation_name = serializers.CharField(source="organisation.organisation_name", read_only=True)
    delivery_address = serializers.SerializerMethodField()
    item_updates = RecurringOrderItemUpdateSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = RecurringOrder
        fields = [
            "id",
            "organisation_name",
            "delivery_address",
            "name",
            "frequency",
            "order_day",
            "delivery_day",
            "status",
            "next_run_at",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
            "items",
            "item_updates",
        ]
        read_only_fields = [
            "id",
            "organisation_name",
            "delivery_address",
            "next_run_at",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
            "items",
        ]

    def update(self, instance, validated_data):
        item_updates = validated_data.pop("item_updates", None)
        order_day_changed = "order_day" in validated_data

        with transaction.atomic():
            instance = super().update(instance, validated_data)

            if order_day_changed:
                instance.next_run_at = self.get_next_run_at(instance.order_day)
                instance.save(update_fields=["next_run_at", "updated_at"])

            if item_updates is not None:
                self.update_items(instance, item_updates)
                if hasattr(instance, "_prefetched_objects_cache"):
                    instance._prefetched_objects_cache = {}

        return instance

    def update_items(self, instance, item_updates):
        existing_items = {item.id: item for item in instance.items.select_related("product")}

        for update in item_updates:
            try:
                item_id = int(update.get("id"))
                quantity = int(update.get("quantity"))
            except (TypeError, ValueError):
                raise serializers.ValidationError({"item_updates": "Recurring order items are invalid."})

            item = existing_items.get(item_id)
            if item is None:
                raise serializers.ValidationError({"item_updates": "Recurring order item was not found."})

            if quantity < 0:
                raise serializers.ValidationError({"item_updates": "Item quantity cannot be negative."})

            if quantity == 0:
                item.delete()
            else:
                item.quantity = quantity
                item.save(update_fields=["quantity"])

        if not instance.items.exists():
            raise serializers.ValidationError({"item_updates": "A recurring order must contain at least one item."})

    def get_next_run_at(self, order_day):
        now = timezone.now()
        days_until_next = (int(order_day) - now.weekday()) % 7
        if days_until_next == 0:
            days_until_next = 7
        return now + timedelta(days=days_until_next)

    def get_delivery_address(self, obj):
        address = obj.delivery_address
        if not address:
            return None

        return {
            "address_line_1": address.address_line_1,
            "address_line_2": address.address_line_2 or "",
            "city": address.city,
            "postcode": address.postcode,
        }


