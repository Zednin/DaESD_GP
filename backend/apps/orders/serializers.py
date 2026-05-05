from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Order, ProducerOrder, OrderItem, RecurringOrder, RecurringOrderItem

# funcctions for recurring events
from .recurring_services import (
    get_current_schedule,
    get_delivery_date,
    get_last_paid_event,
    money,
)

# bulk functions
from .bulk_services import (
    has_bulk_order, 
    has_bulk_producer_order, 
)
from apps.catalog.models import Product
from apps.community.models import Review

COMMISSION_RATE = Decimal('0.05')


# failed order status'
def is_unfulfilled_producer_status(status_value):
    return status_value in {"cancelled", "rejected"}

# prepares summary data
def get_order_fulfillment_summary(order):

    # records any unfulfilled items  
    producer_orders = list(order.producer_orders.all())
    unfulfilled_items = []
    unavailable_items = []
    unfulfilled_names = []
    unavailable_names = []
    unfulfilled_total = Decimal("0.00")
    statuses = []

    # checks itemes in producer orders
    for producer_order in producer_orders:
        
        # checks order status from producer
        producer_status = (producer_order.status or "").lower()
        statuses.append(producer_status)

        # saves any items with faild status
        producer_is_unfulfilled = is_unfulfilled_producer_status(producer_status)

        # gets info on each item unavailable on list
        for item in producer_order.items.all():
            product = item.product
            item_name = product.name
            item_total = money(item.line_total)
            row = {
                "id": item.id,
                "product": item.product_id,
                "product_name": item_name,
                "producer_order": producer_order.id,
                "producer_name": producer_order.producer.company_name,
                "producer_order_status": producer_status,
                "quantity": item.quantity,
                "line_total": str(item_total),
            }

            # if producer cancels or rejers
            if producer_is_unfulfilled:
                unfulfilled_items.append(row)
                unfulfilled_names.append(item_name)
                unfulfilled_total += item_total

            # Checks products are still available
            if product.status != "available":
                unavailable_items.append({
                    **row,
                    "product_status": product.status,
                })
                unavailable_names.append(item_name)

    # gets final status of each product for deliver.
    has_delivered = any(status_value == "delivered" for status_value in statuses)
    has_unfulfilled = any(is_unfulfilled_producer_status(status_value) for status_value in statuses)
    all_final = bool(statuses) and all(
        status_value == "delivered" or is_unfulfilled_producer_status(status_value)
        for status_value in statuses
    )

    # incase order has some producers who fail and some who deliver
    is_partially_fulfilled = has_delivered and has_unfulfilled and all_final
    refund_due = money(unfulfilled_total) if is_partially_fulfilled else Decimal("0.00")
    effective_total = money(Decimal(order.total_amount or 0) - refund_due)

    # status of final order 
    return {
        "has_unfulfilled_items": has_unfulfilled,
        "is_partially_fulfilled": is_partially_fulfilled,
        "unfulfilled_items": unfulfilled_items,
        "unavailable_items": unavailable_items,
        "unfulfilled_item_names": sorted(set(unfulfilled_names)),
        "unavailable_item_names": sorted(set(unavailable_names)),
        "refund_due_amount": str(refund_due),
        "effective_total_amount": str(effective_total),
    }


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_status = serializers.CharField(source="product.status", read_only=True)
    product_available = serializers.SerializerMethodField()
    unit = serializers.CharField(source="product.unit", read_only=True)
    producer_order_status = serializers.CharField(source="producer_order.status", read_only=True)
    fulfillment_status = serializers.SerializerMethodField()
    review_status = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "producer_order",
            "product",
            "product_name",
            "product_status",
            "product_available",
            "unit",
            "producer_order_status",
            "fulfillment_status",
            "quantity",
            "price_snapshot",
            "line_total",
            "created_at",
            "review_status",
        ]
        read_only_fields = ["id", "price_snapshot", "line_total", "created_at"]

    # retrieves products with available status
    def get_product_available(self, obj):
        return obj.product.status == "available"

    # gets status, defaults to pending after order
    def get_fulfillment_status(self, obj):
        producer_status = (obj.producer_order.status or "").lower()
        if is_unfulfilled_producer_status(producer_status):
            return "unfulfilled"
        if producer_status == "delivered":
            return "fulfilled"
        return producer_status or "pending"

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

# Order list for customer
class OrderSerializer(serializers.ModelSerializer):
    producer_orders = CustomerProducerOrderSerializer(many=True, read_only=True)
    fulfillment_summary = serializers.SerializerMethodField()
    has_unfulfilled_items = serializers.SerializerMethodField()
    unfulfilled_item_names = serializers.SerializerMethodField()
    unavailable_item_names = serializers.SerializerMethodField()
    refund_due_amount = serializers.SerializerMethodField()
    effective_total_amount = serializers.SerializerMethodField()
    is_bulk_order = serializers.SerializerMethodField()
    order_type = serializers.SerializerMethodField()
    order_tags = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "account",
            "delivery_address",
            "status",
            "total_amount",
            "commission_amount",
            "special_instructions",
            "order_type",
            "is_bulk_order",
            "order_tags",
            "producer_orders",
            "fulfillment_summary",
            "has_unfulfilled_items",
            "unfulfilled_item_names",
            "unavailable_item_names",
            "refund_due_amount",
            "effective_total_amount",
            "created_at",
            "updated_at",
        ]

    # details order
    def get_fulfillment_summary(self, obj):
        return self.get_summary(obj)

    def get_summary(self, obj):
        if not hasattr(obj, "fulfillment_summary_cache"):
            obj.fulfillment_summary_cache = get_order_fulfillment_summary(obj)
        return obj.fulfillment_summary_cache

    def get_has_unfulfilled_items(self, obj):
        return self.get_summary(obj)["has_unfulfilled_items"]

    def get_unfulfilled_item_names(self, obj):
        return self.get_summary(obj)["unfulfilled_item_names"]

    def get_unavailable_item_names(self, obj):
        return self.get_summary(obj)["unavailable_item_names"]

    def get_refund_due_amount(self, obj):
        return self.get_summary(obj)["refund_due_amount"]

    def get_effective_total_amount(self, obj):
        return self.get_summary(obj)["effective_total_amount"]

    def get_is_bulk_order(self, obj):
        return has_bulk_order(obj)

    def get_order_type(self, obj):
        if getattr(obj, "recurring_order_event", None):
            return "recurring"
        if self.get_is_bulk_order(obj):
            return "bulk"
        return "normal"

    def get_order_tags(self, obj):
        tags = []
        if getattr(obj, "recurring_order_event", None):
            tags.append("recurring")
        if self.get_is_bulk_order(obj):
            tags.append("bulk")
        return tags

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
    order_type = serializers.SerializerMethodField()
    is_bulk_order = serializers.SerializerMethodField()
    recurring_order_id = serializers.SerializerMethodField()
    recurring_event_id = serializers.SerializerMethodField()
    recurring_name = serializers.SerializerMethodField()

    class Meta:
        model = ProducerOrder
        fields = [
            "id",
            "order",
            "order_type",
            "is_bulk_order",
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
            "recurring_order_id",
            "recurring_event_id",
            "recurring_name",
            "created_at",
            "updated_at",
        ]

    def get_stripe_ref(self, obj):
        return obj.order.stripe_session_id or ""

    # type of roder
    def get_order_type(self, obj):
        if getattr(obj.order, "recurring_order_event", None):
            return "recurring"
        if has_bulk_producer_order(obj):
            return "bulk"
        return "normal"

    # checks its +20 quanttiy for an item
    def get_is_bulk_order(self, obj):
        return has_bulk_producer_order(obj)

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

    # recurring order details
    def get_recurring_order_id(self, obj):
        event = getattr(obj.order, "recurring_order_event", None)
        return event.recurring_order_id if event else None

    def get_recurring_event_id(self, obj):
        event = getattr(obj.order, "recurring_order_event", None)
        return event.id if event else None

    def get_recurring_name(self, obj):
        event = getattr(obj.order, "recurring_order_event", None)
        return event.recurring_order.name if event else ""


class RecurringOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    producer_id = serializers.IntegerField(source="product.producer_id", read_only=True)
    producer_name = serializers.CharField(source="product.producer.company_name", read_only=True)
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
            "producer_id",
            "producer_name",
            "product_status",
            "product_available",
            "unit",
            "price",
            "quantity",
        ]
        read_only_fields = fields

    def get_product_available(self, obj):
        return obj.product.status == "available"

# serializer for producer recurring orders
class ProducerRecurringOrderSerializer(serializers.ModelSerializer):
    recurring_order_id = serializers.IntegerField(source="id", read_only=True)
    recurring_name = serializers.CharField(source="name", read_only=True)
    organisation_name = serializers.CharField(source="organisation.organisation_name", read_only=True)
    next_delivery_date = serializers.SerializerMethodField()
    next_event_status = serializers.SerializerMethodField()
    current_schedule = serializers.SerializerMethodField()
    linked_order_status = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    payout_amount = serializers.SerializerMethodField()

    class Meta:
        model = RecurringOrder
        fields = [
            "recurring_order_id",
            "recurring_name",
            "organisation_name",
            "frequency",
            "order_day",
            "delivery_day",
            "next_run_at",
            "next_delivery_date",
            "status",
            "next_event_status",
            "current_schedule",
            "linked_order_status",
            "items",
            "total_cost",
            "commission",
            "payout_amount",
        ]

    def get_producer_items(self, obj):
        producer_id = self.context.get("producer_id")
        items = obj.items.select_related("product", "product__producer")
        if producer_id:
            items = items.filter(product__producer_id=producer_id)
        return items

    def get_next_delivery_date(self, obj):
        return get_current_schedule(obj)["delivery_date"]

    def get_next_event_status(self, obj):
        return get_current_schedule(obj)["status"]

    def get_current_schedule(self, obj):
        return get_current_schedule(obj)

    def get_linked_order_status(self, obj):
        schedule = get_current_schedule(obj)
        order_id = schedule.get("order_id")
        if not order_id:
            return None

        producer_id = self.context.get("producer_id")
        if producer_id:
            producer_order = ProducerOrder.objects.filter(
                order_id=order_id,
                producer_id=producer_id,
            ).only("status").first()
            return producer_order.status if producer_order else None

        order = Order.objects.filter(id=order_id).only("status").first()
        return order.status if order else None

    def get_items(self, obj):
        rows = []
        for item in self.get_producer_items(obj):
            line_total = money(item.product.price * item.quantity)
            rows.append({
                "id": item.id,
                "product": item.product_id,
                "product_name": item.product.name,
                "unit": item.product.unit,
                "price": str(money(item.product.price)),
                "quantity": item.quantity,
                "line_total": str(line_total),
            })
        return rows

    def get_total_cost(self, obj):
        total = sum((money(item.product.price * item.quantity) for item in self.get_producer_items(obj)), Decimal("0.00"))
        return str(money(total))

    def get_commission(self, obj):
        return str(money(Decimal(self.get_total_cost(obj)) * COMMISSION_RATE))

    def get_payout_amount(self, obj):
        total = Decimal(self.get_total_cost(obj))
        commission = Decimal(self.get_commission(obj))
        return str(money(total - commission))


# class for updating items in recurring order 
class RecurringOrderItemUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    product = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=0)


class RecurringOrderSerializer(serializers.ModelSerializer):
    items = RecurringOrderItemSerializer(many=True, read_only=True)
    organisation_name = serializers.CharField(source="organisation.organisation_name", read_only=True)
    delivery_address = serializers.SerializerMethodField()
    item_updates = RecurringOrderItemUpdateSerializer(many=True, write_only=True, required=False)
    item_groups = serializers.SerializerMethodField()
    last_delivery = serializers.SerializerMethodField()
    next_event = serializers.SerializerMethodField()
    current_schedule = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    payout_amount = serializers.SerializerMethodField()

    class Meta:

        # gets recurring order
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
            "item_groups",
            "last_delivery",
            "next_event",
            "current_schedule",
            "total_cost",
            "commission",
            "payout_amount",
            "item_updates",
        ]
        # read only columns
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
            "item_groups",
            "last_delivery",
            "next_event",
            "current_schedule",
            "total_cost",
            "commission",
            "payout_amount",
        ]

    def update(self, instance, validated_data):
        
        # checks changes in item or order/ delivery day
        item_updates = validated_data.pop("item_updates", None)
        order_day_changed = "order_day" in validated_data


        with transaction.atomic():
            instance = super().update(instance, validated_data)

            # order day
            if order_day_changed:
                instance.next_run_at = self.get_next_run_at(instance.order_day)
                instance.save(update_fields=["next_run_at", "updated_at"])

            # any updated items
            if item_updates is not None:
                self.update_items(instance, item_updates)
                if hasattr(instance, "_prefetched_objects_cache"):
                    instance._prefetched_objects_cache = {}

        return instance

    # gets updates from user's order
    def update_items(self, instance, item_updates):
        existing_items = {item.id: item for item in instance.items.select_related("product")}
        existing_by_product = {item.product_id: item for item in existing_items.values()}
        seen_product_ids = set()

        for update in item_updates:
            try:
                quantity = int(update.get("quantity"))
            except (TypeError, ValueError):
                raise serializers.ValidationError({"item_updates": "Recurring order items are invalid."})

            if quantity < 0:
                raise serializers.ValidationError({"item_updates": "Item quantity cannot be negative."})

            item_id = update.get("id")
            if item_id:
                try:
                    item_id = int(item_id)
                except (TypeError, ValueError):
                    raise serializers.ValidationError({"item_updates": "Recurring order item was not found."})

                item = existing_items.get(item_id)
                if item is None:
                    raise serializers.ValidationError({"item_updates": "Recurring order item was not found."})

                product_id = item.product_id
                requested_product = update.get("product")
                if requested_product and int(requested_product) != product_id:
                    raise serializers.ValidationError({"item_updates": "Recurring order item product cannot be changed."})

                if quantity == 0:
                    item.delete()
                    continue

                if product_id in seen_product_ids:
                    raise serializers.ValidationError({"item_updates": "A product can only appear once in a recurring order."})

                seen_product_ids.add(product_id)
                item.quantity = quantity
                item.save(update_fields=["quantity"])
            else:
                product_id = update.get("product") or update.get("product_id")
                try:
                    product_id = int(product_id)
                except (TypeError, ValueError):
                    raise serializers.ValidationError({"item_updates": "Choose a product to add."})

                if quantity == 0:
                    continue

                if product_id in seen_product_ids or product_id in existing_by_product:
                    raise serializers.ValidationError({"item_updates": "A product can only appear once in a recurring order."})

                try:
                    product = Product.objects.get(pk=product_id)
                except Product.DoesNotExist:
                    raise serializers.ValidationError({"item_updates": "Product was not found."})

                if product.status != "available":
                    raise serializers.ValidationError({"item_updates": "Product is not currently available."})

                seen_product_ids.add(product_id)
                RecurringOrderItem.objects.create(
                    recurring_order=instance,
                    product=product,
                    quantity=quantity,
                )

        if not RecurringOrderItem.objects.filter(recurring_order=instance).exists():
            raise serializers.ValidationError({"item_updates": "A recurring order must contain at least one item."})

        self.reset_unpaid_events(instance)

    # reset recurring order payment after final status is defined
    def reset_unpaid_events(self, instance):
        instance.events.filter(order__isnull=True).exclude(status="skipped").update(status="created")

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

    # groups the recurring order items BY PRODUCER for ui
    def get_item_groups(self, obj):
        groups = {}
        for item in obj.items.select_related("product", "product__producer"):
            producer = item.product.producer
            producer_id = producer.id
            if producer_id not in groups:
                groups[producer_id] = {
                    "producer_id": producer_id,
                    "producer_name": producer.company_name,
                    "items": [],
                    "total": Decimal("0.00"),
                }

            line_total = money(item.product.price * item.quantity)
            groups[producer_id]["items"].append({
                "id": item.id,
                "product": item.product_id,
                "product_name": item.product.name,
                "unit": item.product.unit,
                "price": str(money(item.product.price)),
                "quantity": item.quantity,
                "line_total": str(line_total),
                "product_available": item.product.status == "available",
            })
            groups[producer_id]["total"] += line_total

        return [
            {
                **group,
                "total": str(money(group["total"])),
            }
            for group in groups.values()
        ]

    def get_last_delivery(self, obj):
        event = get_last_paid_event(obj)
        if event is None:
            return None

        return {
            "event_id": event.id,
            "delivery_date": get_delivery_date(obj, event.scheduled_for),
            "order_id": event.order_id,
            "status": event.status,
        }

    def get_next_event(self, obj):
        return get_current_schedule(obj)

    def get_current_schedule(self, obj):
        return get_current_schedule(obj)

    def get_total_cost(self, obj):
        total = Decimal("0.00")
        for group in self.get_item_groups(obj):
            total += Decimal(group["total"])
        return str(money(total))

    def get_commission(self, obj):
        return str(money(Decimal(self.get_total_cost(obj)) * COMMISSION_RATE))

    def get_payout_amount(self, obj):
        return str(money(Decimal(self.get_total_cost(obj)) - Decimal(self.get_commission(obj))))


