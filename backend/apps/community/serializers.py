from django.db import IntegrityError
from django.utils import timezone
from rest_framework import serializers

from .models import Review
from apps.orders.models import OrderItem


REVIEW_ELIGIBLE_PRODUCER_ORDER_STATUSES = {"delivered"}


class ReviewListSerializer(serializers.ModelSerializer):
    customer_display_name = serializers.SerializerMethodField()
    verified_purchase = serializers.SerializerMethodField()
    updated = serializers.SerializerMethodField()
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    customer_id = serializers.IntegerField(source="account.id", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product_id",
            "customer_id",  # kept for frontend compatibility
            "rating",
            "review_title",
            "review_text",
            "is_anonymous",
            "customer_display_name",
            "verified_purchase",
            "producer_response",
            "responded_at",
            "created_at",
            "updated_at",
            "updated",
        ]

    def get_customer_display_name(self, obj):
        if obj.is_anonymous:
            return "Anonymous"

        full_name = f"{obj.account.first_name} {obj.account.last_name}".strip()
        return full_name or obj.account.username

    def get_verified_purchase(self, obj):
        return obj.order_item_id is not None

    def get_updated(self, obj):
        return obj.updated_at and obj.updated_at > obj.created_at


class ReviewWriteSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(write_only=True)
    order_item_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product_id",
            "order_item_id",
            "rating",
            "review_title",
            "review_text",
            "is_anonymous",
        ]

    def validate_review_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Review title cannot be empty.")
        return value

    def validate_review_text(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Review text must be at least 10 characters.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        product_id = attrs.get("product_id")
        order_item_id = attrs.get("order_item_id")

        if not user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        eligible_items = OrderItem.objects.select_related(
            "product",
            "producer_order",
            "producer_order__order",
        ).filter(
            producer_order__order__account=user,
            product_id=product_id,
            producer_order__status__in=REVIEW_ELIGIBLE_PRODUCER_ORDER_STATUSES,
        )

        if order_item_id:
            eligible_items = eligible_items.filter(id=order_item_id)

        selected_item = eligible_items.first()

        if not selected_item:
            raise serializers.ValidationError({
                "product_id": "You can only review products you purchased and that have been delivered."
            })

        duplicate_qs = Review.objects.filter(
            account=user,
            product_id=product_id,
        )

        if self.instance:
            duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)

        if duplicate_qs.exists():
            raise serializers.ValidationError("You have already reviewed this product.")

        attrs["product"] = selected_item.product
        attrs["order_item"] = selected_item
        return attrs

    def create(self, validated_data):
        validated_data.pop("product_id", None)
        validated_data["account"] = self.context["request"].user

        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError("You have already reviewed this product.")

    def update(self, instance, validated_data):
        validated_data.pop("product_id", None)
        validated_data.pop("order_item_id", None)
        return super().update(instance, validated_data)


class ProducerResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["producer_response"]

    def update(self, instance, validated_data):
        response_text = (validated_data.get("producer_response") or "").strip()
        instance.producer_response = response_text or None
        instance.responded_at = timezone.now() if response_text else None
        instance.save(update_fields=["producer_response", "responded_at"])
        return instance