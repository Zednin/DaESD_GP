from django.db import models
from django.core.validators import MinValueValidator

from apps.orders.models import Order


class Payment(models.Model):
    PROVIDER_CHOICES = [
        ("stripe", "Stripe"),
        ("paypal", "PayPal"),
        ("card", "Card"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("authorized", "Authorized"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ]

    order = models.OneToOneField(
        Order,
        on_delete=models.PROTECT,
        related_name="payment",
    )

    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES, default="stripe")
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=10, default="GBP")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    stripe_latest_event_id = models.CharField(max_length=255, blank=True, null=True)

    failure_reason = models.TextField(blank=True, default="")
    metadata = models.JSONField(blank=True, default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gte=0),
                name="payment_amount_gte_0",
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=[
                    "pending",
                    "authorized",
                    "paid",
                    "failed",
                    "cancelled",
                    "refunded",
                ]),
                name="payment_valid_status",
            ),
            models.CheckConstraint(
                condition=models.Q(provider__in=[
                    "stripe",
                    "paypal",
                    "card",
                ]),
                name="payment_valid_provider",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["provider", "status"]),
            models.Index(fields=["stripe_latest_event_id"]),
        ]

    def __str__(self):
        return f"Payment {self.id} - Order {self.order_id} - {self.status}"