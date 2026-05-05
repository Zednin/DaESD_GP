from datetime import date
from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import Customer
from apps.addresses.models import Address
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product
from apps.orders.models import Order, ProducerOrder, OrderItem
from apps.producers.models import Producer


Account = get_user_model()


class BackendMarketplaceTests(APITestCase):

    def print_validation(self, title, response=None, extra=None):
        print(f"\n[VALIDATION] {title}")

        if response is not None:
            print(f"Status Code: {response.status_code}")
            try:
                print(json.dumps(response.data, indent=2, default=str))
            except Exception:
                print(response.content.decode())

        if extra:
            print(json.dumps(extra, indent=2, default=str))

    def setUp(self):
        self.customer = Account.objects.create_user(
            username="customer1",
            email="customer1@test.com",
            password="StrongPass123!",
            account_type="customer",
        )

        self.delivery_address = Address.objects.create(
            account=self.customer,
            address_type=Address.AddressType.DELIVERY,
            is_default=True,
            address_line_1="45 Park Street",
            city="Bristol",
            postcode="BS1 5JG",
        )

        Customer.objects.create(
            account=self.customer,
            default_delivery_address=self.delivery_address,
        )

        self.producer_user = Account.objects.create_user(
            username="producer1",
            email="producer1@test.com",
            password="StrongPass123!",
            account_type="producer",
        )

        self.business_address = Address.objects.create(
            account=self.producer_user,
            address_type=Address.AddressType.BUSINESS,
            is_default=True,
            address_line_1="Farm",
            city="Bristol",
            postcode="BS1 4DJ",
        )

        self.producer = Producer.objects.create(
            account=self.producer_user,
            company_name="Farm",
            company_number="12345678",
            business_address=self.business_address,
            lead_time_hours=48,
        )

        self.category = Category.objects.create(
            name="Dairy",
            description="Dairy products",
        )

        self.product = Product.objects.create(
            producer=self.producer,
            category=self.category,
            name="Eggs",
            price=Decimal("3.50"),
            unit="dozen",
            stock=50,
            availability_mode=Product.AvailabilityMode.YEAR_ROUND,
            status="available",
        )

    def auth_customer(self):
        self.client.force_authenticate(user=self.customer)

    def auth_producer(self):
        self.client.force_authenticate(user=self.producer_user)

    def create_producer_order(self, status="delivered", total_amount=Decimal("100.00")):
        order = Order.objects.create(
            account=self.customer,
            delivery_address=self.delivery_address,
            status="completed",
            total_amount=total_amount,
            commission_amount=(total_amount * Decimal("0.05")),
        )

        producer_order = ProducerOrder.objects.create(
            order=order,
            producer=self.producer,
            total_amount=total_amount,
            status=status,
            delivery_date=date.today(),
        )

        OrderItem.objects.create(
            producer_order=producer_order,
            product=self.product,
            quantity=2,
            price_snapshot=self.product.price,
            line_total=self.product.price * 2,
        )

        return order, producer_order

    # ----------------------------
    # AUTH / REGISTRATION
    # ----------------------------

    def test_customer_registration(self):
        url = reverse("customer-register")

        payload = {
            "username": "newuser",
            "email": "new@test.com",
            "password": "StrongPass123!",
            "default_delivery_address": {
                "address_line_1": "Test",
                "city": "Bristol",
                "postcode": "BS1",
            },
        }

        response = self.client.post(url, payload, format="json")

        self.print_validation("Customer Registration", response)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Account.objects.filter(email="new@test.com").exists())
        self.assertEqual(response.data["account"]["account_type"], "customer")

    def test_customer_registration_rejects_incomplete_organisation_fields(self):
        url = reverse("customer-register")

        payload = {
            "username": "orguser",
            "email": "orguser@test.com",
            "password": "StrongPass123!",
            "organisation_type": "charity",
            "default_delivery_address": {
                "address_line_1": "Test",
                "city": "Bristol",
                "postcode": "BS1",
            },
        }

        response = self.client.post(url, payload, format="json")

        self.print_validation("Organisation validation", response)

        self.assertEqual(response.status_code, 400)
        self.assertIn("organisation_name", response.data)

    def test_producer_registration(self):
        url = reverse("producer-register")

        payload = {
            "username": "producer2",
            "email": "producer2@test.com",
            "password": "StrongPass123!",
            "company_name": "New Farm",
            "company_number": "87654321",
            "business_address": {
                "address_line_1": "New Farm",
                "city": "Bristol",
                "postcode": "BS2 1AB",
            },
        }

        response = self.client.post(url, payload, format="json")

        self.print_validation("Producer registration", response)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Account.objects.filter(email="producer2@test.com").exists())
        self.assertEqual(response.data["account"]["account_type"], "producer")

    def test_account_settings_get_and_patch(self):
        self.auth_customer()

        settings_url = reverse("account-settings")
        response = self.client.get(settings_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "customer1@test.com")

        payload = {
            "first_name": "Test",
            "last_name": "Customer",
            "default_delivery_address": {
                "address_line_1": "99 New Road",
                "city": "Bristol",
                "postcode": "BS1 9ZZ",
            },
        }

        response = self.client.patch(settings_url, payload, format="json")
        self.print_validation("Account settings update", response)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["first_name"], "Test")
        self.assertEqual(response.data["default_delivery_address"]["address_line_1"], "99 New Road")

    def test_weak_password_rejected(self):
        url = reverse("customer-register")

        response = self.client.post(
            url,
            {
                "username": "weak",
                "email": "weak@test.com",
                "password": "123",
                "default_delivery_address": {
                    "address_line_1": "Test",
                    "city": "Bristol",
                    "postcode": "BS1",
                },
            },
            format="json",
        )

        self.print_validation("Weak password rejection", response)

        self.assertEqual(response.status_code, 400)

    # ----------------------------
    # PRODUCT
    # ----------------------------

    def test_producer_can_create_product(self):
        self.auth_producer()

        url = reverse("product-list")

        response = self.client.post(
            url,
            {
                "producer": self.producer.id,
                "category": self.category.id,
                "name": "Milk",
                "price": "2.00",
                "unit": "litre",
                "stock": 10,
                "availability_mode": "year_round",
                "status": "available",
            },
            format="json",
        )

        self.print_validation("Product creation", response)

        self.assertEqual(response.status_code, 201)

    def test_customer_cannot_create_product(self):
        self.auth_customer()

        url = reverse("product-list")

        response = self.client.post(
            url,
            {
                "category": self.category.id,
                "name": "Hacked Product",
                "price": "2.00",
                "unit": "kg",
                "stock": 10,
                "availability_mode": "year_round",
                "status": "available",
            },
            format="json",
        )

        self.print_validation("Security: customer product creation", response)

        self.assertEqual(response.status_code, 403)

    def test_producer_can_update_own_product(self):
        self.auth_producer()

        url = reverse("product-detail", args=[self.product.id])
        response = self.client.patch(url, {"price": "4.00"}, format="json")

        self.print_validation("Product update", response)

        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("4.00"))

    def test_producer_cannot_update_other_producer_product(self):
        other_user = Account.objects.create_user(
            username="producer2",
            email="producer2@test.com",
            password="StrongPass123!",
            account_type="producer",
        )
        other_business_address = Address.objects.create(
            account=other_user,
            address_type=Address.AddressType.BUSINESS,
            is_default=True,
            address_line_1="Farm 2",
            city="Bristol",
            postcode="BS1 4DJ",
        )
        other_producer = Producer.objects.create(
            account=other_user,
            company_name="Farm 2",
            company_number="87654321",
            business_address=other_business_address,
            lead_time_hours=48,
        )
        other_product = Product.objects.create(
            producer=other_producer,
            category=self.category,
            name="Cheese",
            price=Decimal("5.00"),
            unit="kg",
            stock=20,
            availability_mode=Product.AvailabilityMode.YEAR_ROUND,
            status="available",
        )

        self.auth_producer()
        url = reverse("product-detail", args=[other_product.id])
        response = self.client.patch(url, {"price": "6.00"}, format="json")

        self.print_validation("Unauthorized product update", response)

        self.assertEqual(response.status_code, 403)

    def test_filter_organic_products(self):
        Product.objects.create(
            producer=self.producer,
            category=self.category,
            name="Organic Milk",
            price=Decimal("2.00"),
            unit="kg",
            stock=10,
            availability_mode=Product.AvailabilityMode.YEAR_ROUND,
            status="available",
            organic_certified=True,
        )

        url = reverse("product-list")
        response = self.client.get(url, {"organic_certified": "true"})

        self.print_validation("Organic filter", response)

        self.assertEqual(response.status_code, 200)
        product_names = [item["name"] for item in response.data]
        self.assertIn("Organic Milk", product_names)

    # ----------------------------
    # CART
    # ----------------------------

    def test_add_to_cart(self):
        self.auth_customer()

        url = reverse("cart-item-list")

        response = self.client.post(
            url,
            {"product_id": self.product.id, "quantity": 2},
            format="json",
        )

        self.print_validation("Add to cart", response)

        self.assertEqual(response.status_code, 200)

        item = CartItem.objects.get(product=self.product)
        self.assertEqual(item.quantity, 2)

    def test_update_cart_item_quantity(self):
        self.auth_customer()
        cart, _ = Cart.objects.get_or_create(account=self.customer)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
            price_snapshot=self.product.price,
        )

        url = reverse("cart-item-detail", args=[cart_item.id])
        response = self.client.patch(url, {"quantity": 5}, format="json")

        self.print_validation("Update cart item quantity", response)

        self.assertEqual(response.status_code, 200)
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.quantity, 5)

    def test_delete_cart_item(self):
        self.auth_customer()
        cart, _ = Cart.objects.get_or_create(account=self.customer)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
            price_snapshot=self.product.price,
        )

        url = reverse("cart-item-detail", args=[cart_item.id])
        response = self.client.delete(url)

        self.print_validation("Delete cart item", response)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(CartItem.objects.filter(id=cart_item.id).exists())

    def test_cart_merge(self):
        self.auth_customer()

        url = reverse("cart-merge")

        response = self.client.post(
            url,
            {"items": [{"product_id": self.product.id, "qty": 3}]},
            format="json",
        )

        self.print_validation("Cart merge", response)

        item = CartItem.objects.get(product=self.product)
        self.assertEqual(item.quantity, 3)

    def test_clear_cart(self):
        self.auth_customer()

        cart = Cart.objects.create(account=self.customer)
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
            price_snapshot=self.product.price,
        )

        url = reverse("cart-item-clear")
        response = self.client.post(url)

        self.print_validation("Clear cart", response)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(CartItem.objects.count(), 0)

    def test_cart_list_returns_items(self):
        self.auth_customer()
        Cart.objects.create(account=self.customer)
        CartItem.objects.create(
            cart=self.customer.cart,
            product=self.product,
            quantity=2,
            price_snapshot=self.product.price,
        )

        url = reverse("cart-list")
        response = self.client.get(url)

        self.print_validation("Cart list", response)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["product_id"], self.product.id)

    # ----------------------------
    # ORDERS
    # ----------------------------

    def test_order_history(self):
        Order.objects.create(
            account=self.customer,
            delivery_address=self.delivery_address,
            status="completed",
        )

        self.auth_customer()
        url = reverse("order-list")

        response = self.client.get(url)

        self.print_validation("Order history", response)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_last_completed_order_returns_items(self):
        self.auth_customer()
        self.create_producer_order(status="delivered")

        url = reverse("order-last-completed")
        response = self.client.get(url)

        self.print_validation("Last completed order", response)

        self.assertEqual(response.status_code, 200)
        self.assertIn("items", response.data)
        self.assertGreaterEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["product_id"], self.product.id)

    def test_producer_order_visibility(self):
        order = Order.objects.create(
            account=self.customer,
            delivery_address=self.delivery_address,
        )

        ProducerOrder.objects.create(
            order=order,
            producer=self.producer,
        )

        self.auth_producer()

        url = reverse("producer-order-list")
        response = self.client.get(url)

        self.print_validation("Producer order visibility", response)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_non_producer_cannot_view_producer_orders(self):
        self.create_producer_order(status="pending")

        self.auth_customer()
        url = reverse("producer-order-list")
        response = self.client.get(url)

        self.print_validation("Non-producer producer order access", response)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # ----------------------------
    # COMMISSION (REAL TEST)
    # ----------------------------

    def test_commission_via_api(self):
        _, producer_order = self.create_producer_order(status="delivered", total_amount=Decimal("100.00"))

        self.auth_producer()
        url = reverse("producer-order-detail", args=[producer_order.id])
        response = self.client.get(url)

        self.print_validation("Commission calculation", response)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data["commission"]), Decimal("5.00"))
        self.assertEqual(Decimal(response.data["payout_amount"]), Decimal("95.00"))

    # ----------------------------
    # RECOMMENDATIONS

    def test_recommendation_log_invalid_event(self):
        self.auth_customer()
        url = reverse("product-recommendations-log")

        response = self.client.post(
            url,
            {
                "product_id": self.product.id,
                "event_type": "invalid_event",
                "recommendation_rank": 0,
                "reorder_probability": 0.42,
            },
            format="json",
        )

        self.print_validation("Recommendation log invalid event", response)

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_recommendation_log_success(self):
        self.auth_customer()
        url = reverse("product-recommendations-log")

        response = self.client.post(
            url,
            {
                "product_id": self.product.id,
                "event_type": "added_to_cart",
                "recommendation_rank": 0,
                "reorder_probability": 0.42,
            },
            format="json",
        )

        self.print_validation("Recommendation log success", response)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["detail"], "Logged.")