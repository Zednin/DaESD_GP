from django.db import models
from django.utils import timezone

# Create your models here.
from apps.accounts.models import Account
from apps.accounts.models import Organisation
from apps.addresses.models import Address
from apps.producers.models import Producer
from apps.catalog.models import Product



class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]

    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="orders")
    delivery_address = models.ForeignKey(
        Address, on_delete=models.PROTECT, related_name="delivery_orders")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    stripe_session_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    def __str__(self):
        return f"Order {self.id} - {self.account.username}"


class ProducerOrder(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="producer_orders")
    producer = models.ForeignKey(Producer, on_delete=models.PROTECT, related_name="producer_orders")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    delivery_date = models.DateField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["order", "producer"], name="uniq_order_producer")
        ]

    def __str__(self):
        return f"ProducerOrder {self.id} (Order {self.order_id})"


class OrderItem(models.Model):
    producer_order = models.ForeignKey(ProducerOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")

    quantity = models.PositiveIntegerField(default=1)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["producer_order", "product"], name="uniq_producerorder_product")
        ]

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
    
    
    
class RecurringOrder(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("paused", "Paused"),
        ("cancelled", "Cancelled"),
    ]
    
    FREQUENCY_CHOICES = [
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
    ]
    
    organisation = models.ForeignKey(
        Organisation, on_delete=models.PROTECT, related_name="recurring_orders"
        )
    delivery_address = models.ForeignKey(
        Address, on_delete=models.PROTECT, related_name="recurring_orders"
        )
    name = models.CharField(max_length=100)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    interval = models.PositiveIntegerField(default=1)  # e.g., every 2 weeks
    
    # e.g. 0=Monday, 1=Tuesday, ..., 6=Sunday (only relevant for weekly)
    weekday = models.PositiveSmallIntegerField(blank=True, null=True)
    # e.g. 1-31 (only relevant for monthly)
    monthday = models.PositiveSmallIntegerField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    
    next_run_at = models.DateTimeField(db_index=True)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self) -> str:
        return f"RecurringOrder {self.name} ID: {self.id} for {self.organisation.name}"
    
class RecurringOrderItem(models.Model):
    recurring_order = models.ForeignKey(
        RecurringOrder, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="recurring_order_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recurring_order", "product"], name="uniq_recurringorder_product"
            )
        ]
        
    def __str__(self) -> str:
        return f"{self.quantity} x {self.product.name} for {self.recurring_order.name}"
    
    
class RecurringOrderEvent(models.Model):
    STATUS_CHOICES = [
        ("created", "Created"),
        ("failed", "Failed"),
        ("skipped", "Skipped"),
    ]
    
    recurring_order = models.ForeignKey(
        RecurringOrder, on_delete=models.CASCADE, related_name="events"
    )
    
    scheduled_for = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="created")
    
    # If order creation is successful, link to the created order
    # Note: This is a OneToOneField because each event should correspond to at most one order
    order = models.OneToOneField(
        Order, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name="recurring_order_event"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recurring_order", "scheduled_for"], 
                name="uniq_recurringorder_scheduledfor"
            ),
        ]
        indexes = [
            models.Index(fields=["recurring_order", "scheduled_for"]),
            models.Index(fields=["scheduled_for"]), # for efficient querying of upcoming events
        ]
        
    def __str__(self) -> str:
        return f"RecurringOrderEvent for {self.recurring_order.name} ID: {self.id} scheduled at {self.scheduled_for} - Status: {self.status}"
    
    
    
    
class WeeklySettlement(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]
    
    start_period = models.DateTimeField()
    end_period = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["start_period", "end_period"],
                name="uniq_weeklysettlement_period"
            )
        ]

    def __str__(self):
        return f"Settlement {self.id}: {self.start_period} to {self.end_period}"
    
class SettlementLine(models.Model):
    PAYOUT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    settlement = models.ForeignKey(
        WeeklySettlement, on_delete=models.CASCADE, related_name="lines"
    )
    producer = models.ForeignKey(
        Producer, on_delete=models.PROTECT, related_name="settlement_lines"
    )

    total_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payout_status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default="pending")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["settlement", "producer"],
                name="uniq_settlement_producer"
            )
        ]

    def __str__(self):
        return f"SettlementLine {self.id} - {self.producer.name}"
    
class CommissionLedger(models.Model):
    producer_order = models.OneToOneField(
        ProducerOrder, on_delete=models.PROTECT, related_name="commission_ledger"
    )
    settlement_line = models.ForeignKey(
        SettlementLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entries"
    )

    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"CommissionLedger {self.id} - ProducerOrder {self.producer_order_id}"
