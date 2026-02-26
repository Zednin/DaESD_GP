from django.db import models

# Create your models here.
from apps.accounts.models import Account
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
    delivery_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name="delivery_orders")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    delivery_date = models.DateField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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