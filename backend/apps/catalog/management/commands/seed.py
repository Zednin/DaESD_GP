"""
Management command to populate the database with sample data for testing.

Usage:
    python manage.py seed           # add seed data (skips if already exists)
    python manage.py seed --flush   # wipe existing seed data first
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date

from apps.accounts.models import Account
from apps.addresses.models import Address
from apps.producers.models import Producer
from apps.catalog.models import Category, Product


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
            Product.objects.filter(name__in=[p["name"] for p in PRODUCTS]).delete()
            Category.objects.filter(name__in=[c["name"] for c in CATEGORIES]).delete()
            Producer.objects.filter(account__username__in=[p["username"] for p in PRODUCERS]).delete()
            Account.objects.filter(username__in=[p["username"] for p in PRODUCERS]).delete()
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
        start = date(2026, 1, 1)
        end   = date(2026, 12, 31)

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
                    "status": "available",
                    "availability_start": start,
                    "availability_end": end,
                    "description": f"Fresh {prod['name'].lower()} from {producer_map[prod['producer']].company_name}.",
                },
            )
            if created:
                self.stdout.write(f"  [+] Product: {obj.name}")

        self.stdout.write(self.style.SUCCESS("\nSeeding complete!"))
