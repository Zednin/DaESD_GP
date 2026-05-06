from decimal import Decimal
from types import SimpleNamespace

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.accounts.models import Account
from apps.addresses.models import Address
from apps.catalog.models import InventoryAdjustment, Product
from apps.orders.models import Order, OrderItem, ProducerOrder
from apps.orders.bulk_services import get_individual_quantity_limit
from apps.orders.stock_services import deduct_stock_for_producer_order
from apps.producers.models import Producer


class BulkQuantityLimitTests(TestCase):
    def test_individual_limit_stays_below_bulk_threshold(self):
        product = SimpleNamespace(bulk_stock_threshold=20)

        self.assertEqual(get_individual_quantity_limit(product), 19)

    def test_individual_limit_keeps_default_cap_for_higher_bulk_threshold(self):
        product = SimpleNamespace(bulk_stock_threshold=50)

        self.assertEqual(get_individual_quantity_limit(product), 20)

    def test_individual_limit_respects_lower_bulk_threshold(self):
        product = SimpleNamespace(bulk_stock_threshold=10)

        self.assertEqual(get_individual_quantity_limit(product), 9)


class ProducerOrderStockTests(TestCase):
    def setUp(self):
        self.producer_account = Account.objects.create_user(
            username="producer",
            email="producer@example.com",
            password="password",
            account_type="producer",
        )
        self.customer = Account.objects.create_user(
            username="customer",
            email="customer@example.com",
            password="password",
        )
        self.producer = Producer.objects.create(
            account=self.producer_account,
            company_name="Producer Ltd",
            company_number="12345678",
        )
        self.address = Address.objects.create(
            account=self.customer,
            address_line_1="1 Market Street",
            city="Birmingham",
            postcode="B1 1AA",
        )
        self.product = Product.objects.create(
            producer=self.producer,
            name="Apples",
            price=Decimal("2.00"),
            unit="unit",
            stock=10,
        )
        self.order = Order.objects.create(
            account=self.customer,
            delivery_address=self.address,
            total_amount=Decimal("8.00"),
        )
        self.producer_order = ProducerOrder.objects.create(
            order=self.order,
            producer=self.producer,
            total_amount=Decimal("8.00"),
        )
        self.item = OrderItem.objects.create(
            producer_order=self.producer_order,
            product=self.product,
            quantity=4,
            price_snapshot=Decimal("2.00"),
            line_total=Decimal("8.00"),
        )

    def test_deduct_stock_once_for_accepted_order(self):
        deduct_stock_for_producer_order(self.producer_order, self.producer_account)
        deduct_stock_for_producer_order(self.producer_order, self.producer_account)

        self.product.refresh_from_db()
        adjustment = InventoryAdjustment.objects.get(order_item=self.item)
        self.assertEqual(self.product.stock, 6)
        self.assertEqual(adjustment.reason, "order_adjustment")
        self.assertEqual(adjustment.changed_by, self.producer_account)
        self.assertEqual(
            InventoryAdjustment.objects.filter(order_item=self.item).count(),
            1,
        )

    def test_product_becomes_unavailable_when_stock_reaches_zero(self):
        self.item.quantity = 10
        self.item.line_total = Decimal("20.00")
        self.item.save(update_fields=["quantity", "line_total"])

        deduct_stock_for_producer_order(self.producer_order, self.producer_account)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(self.product.status, "unavailable")

    def test_stock_is_unchanged_when_order_exceeds_available_stock(self):
        self.item.quantity = 11
        self.item.line_total = Decimal("22.00")
        self.item.save(update_fields=["quantity", "line_total"])

        with self.assertRaises(ValidationError):
            deduct_stock_for_producer_order(self.producer_order, self.producer_account)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertFalse(InventoryAdjustment.objects.filter(order_item=self.item).exists())
