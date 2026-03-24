"""
Management command to populate the database with sample data for testing.

Usage:
    python manage.py seed           # add seed data (skips if already exists)
    python manage.py seed --flush   # wipe existing seed data first
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from apps.accounts.models import Account
from apps.addresses.models import Address
from apps.producers.models import Producer
from apps.catalog.models import Category, Product
from apps.orders.models import Order, ProducerOrder, OrderItem


CATEGORIES = [
    {"name": "Vegetables", "description": "Fresh locally grown vegetables."},
    {"name": "Fruit",      "description": "Seasonal fruits from local orchards."},
    {"name": "Dairy",      "description": "Milk, cheese, and other dairy products."},
    {"name": "Meat",       "description": "Ethically reared meat and poultry."},
    {"name": "Bakery",     "description": "Freshly baked breads and pastries."},
    {"name": "Drinks",     "description": "Juices, ales, and soft drinks."},
]

PRODUCERS = [
    {
        "username": "greenfarm",
        "email": "greenfarm@example.com",
        "company_name": "Green Farm Co.",
        "company_email": "orders@greenfarm.example.com",
        "company_number": "07700900001",
        "company_description": "Family-run organic farm in Devon.",
        "address": {
            "address_line_1": "1 Farm Lane",
            "city": "Exeter",
            "postcode": "EX1 1AA",
        },
    },
    {
        "username": "sunriseorchard",
        "email": "sunrise@example.com",
        "company_name": "Sunrise Orchard",
        "company_email": "orders@sunriseorchard.example.com",
        "company_number": "07700900002",
        "company_description": "Award-winning fruit and juice producers.",
        "address": {
            "address_line_1": "42 Orchard Road",
            "city": "Bristol",
            "postcode": "BS1 2OR",
        },
    },
]

PRODUCTS = [
    # Vegetables
    {"name": "Carrots",       "category": "Vegetables", "producer": "greenfarm",     "price": "1.20",  "unit": "kg",    "stock": 200, "organic_certified": True},
    {"name": "Potatoes",      "category": "Vegetables", "producer": "greenfarm",     "price": "0.90",  "unit": "kg",    "stock": 500, "organic_certified": False},
    {"name": "Spinach",       "category": "Vegetables", "producer": "greenfarm",     "price": "1.50",  "unit": "unit",  "stock": 80,  "organic_certified": True},
    {"name": "Courgettes",    "category": "Vegetables", "producer": "greenfarm",     "price": "1.00",  "unit": "kg",    "stock": 120, "organic_certified": False},
    # Fruit
    {"name": "Apples",        "category": "Fruit",      "producer": "sunriseorchard","price": "2.00",  "unit": "kg",    "stock": 300, "organic_certified": True},
    {"name": "Pears",         "category": "Fruit",      "producer": "sunriseorchard","price": "2.50",  "unit": "kg",    "stock": 150, "organic_certified": False},
    {"name": "Strawberries",  "category": "Fruit",      "producer": "sunriseorchard","price": "3.00",  "unit": "unit",  "stock": 60,  "organic_certified": True},
    # Dairy
    {"name": "Whole Milk",    "category": "Dairy",      "producer": "greenfarm",     "price": "1.10",  "unit": "litre", "stock": 100, "organic_certified": False},
    {"name": "Cheddar",       "category": "Dairy",      "producer": "greenfarm",     "price": "5.00",  "unit": "unit",  "stock": 40,  "organic_certified": False},
    # Meat
    {"name": "Chicken Thighs","category": "Meat",       "producer": "greenfarm",     "price": "6.50",  "unit": "kg",    "stock": 50,  "organic_certified": False},
    {"name": "Pork Sausages", "category": "Meat",       "producer": "greenfarm",     "price": "4.00",  "unit": "unit",  "stock": 70,  "organic_certified": False},
    # Bakery
    {"name": "Sourdough Loaf","category": "Bakery",     "producer": "sunriseorchard","price": "3.50",  "unit": "unit",  "stock": 30,  "organic_certified": False},
    {"name": "Croissants",    "category": "Bakery",     "producer": "sunriseorchard","price": "4.00",  "unit": "dozen", "stock": 20,  "organic_certified": False},
    # Drinks
    {"name": "Apple Juice",   "category": "Drinks",     "producer": "sunriseorchard","price": "2.50",  "unit": "litre", "stock": 90,  "organic_certified": True},
    {"name": "Elderflower Cordial","category": "Drinks","producer": "sunriseorchard","price": "4.50",  "unit": "unit",  "stock": 45,  "organic_certified": False},
]

CUSTOMERS = [
    {
        "username": "janedoe",
        "email": "jane@example.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "address": {
            "address_line_1": "10 High Street",
            "city": "Bath",
            "postcode": "BA1 1AB",
        },
    },
    {
        "username": "bobsmith",
        "email": "bob@example.com",
        "first_name": "Bob",
        "last_name": "Smith",
        "address": {
            "address_line_1": "25 King Road",
            "city": "Bristol",
            "postcode": "BS2 3CD",
        },
    },
]

COMMISSION_RATE = Decimal("0.05")

# Each entry: (customer, producer_username, product_names_with_qty, status, days_ago, delivery_days_later)
SEED_ORDERS = [
    # Green Farm Co. orders
    ("janedoe", "greenfarm", [("Carrots", 3), ("Potatoes", 5)],            "completed",  160, 4),
    ("bobsmith","greenfarm", [("Spinach", 2), ("Whole Milk", 4)],          "completed",  130, 3),
    ("janedoe", "greenfarm", [("Cheddar", 1), ("Chicken Thighs", 2)],     "delivered",  95,  4),
    ("bobsmith","greenfarm", [("Carrots", 4), ("Courgettes", 3)],          "delivered",  65,  3),
    ("janedoe", "greenfarm", [("Pork Sausages", 2), ("Potatoes", 6)],     "delivered",  40,  4),
    ("bobsmith","greenfarm", [("Whole Milk", 6), ("Cheddar", 2)],          "preparing",  10,  None),
    ("janedoe", "greenfarm", [("Spinach", 3), ("Carrots", 2)],             "pending",    5,   None),
    ("bobsmith","greenfarm", [("Chicken Thighs", 1)],                      "cancelled",  50,  None),
    ("janedoe", "greenfarm", [("Courgettes", 2), ("Pork Sausages", 1)],   "accepted",   3,   None),
    # Sunrise Orchard orders
    ("janedoe", "sunriseorchard", [("Apples", 4), ("Pears", 3)],          "completed",  150, 4),
    ("bobsmith","sunriseorchard", [("Strawberries", 5), ("Apple Juice", 2)],"delivered", 100, 3),
    ("janedoe", "sunriseorchard", [("Sourdough Loaf", 2), ("Croissants", 1)],"delivered",70, 4),
    ("bobsmith","sunriseorchard", [("Elderflower Cordial", 3), ("Apples", 2)],"preparing",8,None),
    ("janedoe", "sunriseorchard", [("Pears", 2), ("Strawberries", 3)],    "pending",    2,   None),
    ("bobsmith","sunriseorchard", [("Croissants", 2)],                     "cancelled",  45,  None),
]


class Command(BaseCommand):
    help = "Seed the database with test categories, producers, and products."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing seed data before inserting.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing seed data...")
            OrderItem.objects.filter(
                producer_order__producer__account__username__in=[p["username"] for p in PRODUCERS]
            ).delete()
            ProducerOrder.objects.filter(
                producer__account__username__in=[p["username"] for p in PRODUCERS]
            ).delete()
            Order.objects.filter(
                account__username__in=[c["username"] for c in CUSTOMERS]
            ).delete()
            Product.objects.filter(name__in=[p["name"] for p in PRODUCTS]).delete()
            Category.objects.filter(name__in=[c["name"] for c in CATEGORIES]).delete()
            Producer.objects.filter(account__username__in=[p["username"] for p in PRODUCERS]).delete()
            Account.objects.filter(
                username__in=[p["username"] for p in PRODUCERS] + [c["username"] for c in CUSTOMERS]
            ).delete()
            self.stdout.write(self.style.WARNING("Seed data cleared."))

        # ── Categories ──────────────────────────────────────────────────────
        cat_map = {}
        for c in CATEGORIES:
            obj, created = Category.objects.get_or_create(
                name=c["name"], defaults={"description": c["description"]}
            )
            cat_map[obj.name] = obj
            if created:
                self.stdout.write(f"  [+] Category: {obj.name}")

        # ── Accounts + Addresses + Producers ────────────────────────────────
        producer_map = {}
        for p in PRODUCERS:
            account, created = Account.objects.get_or_create(
                username=p["username"],
                defaults={
                    "email": p["email"],
                    "account_type": "producer",
                },
            )
            if created:
                account.set_password("testpass123")
                account.save()
                self.stdout.write(f"  [+] Account: {account.username}")

            # Business address — skip full_clean to avoid circular dependency
            addr, _ = Address.objects.get_or_create(
                account=account,
                address_type=Address.AddressType.BUSINESS,
                defaults={
                    "address_line_1": p["address"]["address_line_1"],
                    "city": p["address"]["city"],
                    "postcode": p["address"]["postcode"],
                    "is_default": True,
                },
            )

            producer, created = Producer.objects.get_or_create(
                account=account,
                defaults={
                    "company_name": p["company_name"],
                    "company_email": p["company_email"],
                    "company_number": p["company_number"],
                    "company_description": p["company_description"],
                    "lead_time_hours": 48,
                    "business_address": addr,
                },
            )
            producer_map[p["username"]] = producer
            if created:
                self.stdout.write(f"  [+] Producer: {producer.company_name}")

        # ── Products ────────────────────────────────────────────────────────
        for prod in PRODUCTS:
            obj, created = Product.objects.get_or_create(
                name=prod["name"],
                defaults={
                    "category": cat_map.get(prod["category"]),
                    "producer": producer_map[prod["producer"]],
                    "price": prod["price"],
                    "unit": prod["unit"],
                    "stock": prod["stock"],
                    "organic_certified": prod.get("organic_certified", False),
                    "availability_mode": Product.AvailabilityMode.YEAR_ROUND,
                    "status": "available",
                    "description": f"Fresh {prod['name'].lower()} from {producer_map[prod['producer']].company_name}.",
                },
            )
            if created:
                self.stdout.write(f"  [+] Product: {obj.name}")

        # Customers
        customer_map = {}   # username -> (account, address)
        for c in CUSTOMERS:
            account, created = Account.objects.get_or_create(
                username=c["username"],
                defaults={
                    "email": c["email"],
                    "first_name": c["first_name"],
                    "last_name": c["last_name"],
                    "account_type": "customer",
                },
            )
            if created:
                account.set_password("testpass123")
                account.save()
                self.stdout.write(f"  [+] Customer: {account.username}")

            addr, _ = Address.objects.get_or_create(
                account=account,
                address_type=Address.AddressType.DELIVERY,
                defaults={
                    "address_line_1": c["address"]["address_line_1"],
                    "city": c["address"]["city"],
                    "postcode": c["address"]["postcode"],
                    "is_default": True,
                },
            )
            customer_map[c["username"]] = (account, addr)

        # Orders, ProducerOrders, OrderItems
        product_map = {p.name: p for p in Product.objects.all()}
        now = timezone.now()

        for cust_user, prod_user, items, status, days_ago, del_days in SEED_ORDERS:
            customer_account, customer_addr = customer_map[cust_user]
            producer = producer_map[prod_user]

            # Calculate totals
            line_totals = []
            for pname, qty in items:
                product = product_map[pname]
                line_totals.append(Decimal(str(product.price)) * qty)
            subtotal = sum(line_totals)
            commission = (subtotal * COMMISSION_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            created_at = now - timedelta(days=days_ago)

            # Parent order (map cancelled -> cancelled, else completed/confirmed/pending)
            order_status_map = {
                "completed": "completed",
                "delivered": "confirmed",
                "preparing": "confirmed",
                "accepted":  "confirmed",
                "pending":   "pending",
                "cancelled": "cancelled",
            }

            order = Order.objects.create(
                account=customer_account,
                delivery_address=customer_addr,
                status=order_status_map.get(status, "pending"),
                total_amount=subtotal,
                commission_amount=commission,
            )
            # Backdate created_at
            Order.objects.filter(pk=order.pk).update(created_at=created_at)

            delivery_date = (created_at + timedelta(days=del_days)).date() if del_days else None

            po = ProducerOrder.objects.create(
                order=order,
                producer=producer,
                status=status,
                total_amount=subtotal,
                delivery_date=delivery_date,
            )
            # Backdate created_at
            ProducerOrder.objects.filter(pk=po.pk).update(created_at=created_at)

            for idx, (pname, qty) in enumerate(items):
                product = product_map[pname]
                price = Decimal(str(product.price))
                OrderItem.objects.create(
                    producer_order=po,
                    product=product,
                    quantity=qty,
                    price_snapshot=price,
                    line_total=price * qty,
                )

            self.stdout.write(
                f"  [+] Order #{order.id}: {cust_user} -> {prod_user} "
                f"({status}, £{subtotal})"
            )

        self.stdout.write(self.style.SUCCESS("\nSeeding complete!"))
