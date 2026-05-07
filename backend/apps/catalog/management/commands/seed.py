"""
Comprehensive seed for the DaESD food network platform.
Bristol-area producers, backdated orders (12 months), reviews,
farm stories, recipes, settlements, recurring orders, and more.

Usage:
    python manage.py seed           # add seed data (skips existing)
    python manage.py seed --flush   # wipe all seed data first

╔══════════════════════════════════════════════════════════════╗
║                    LOGIN CREDENTIALS                         ║
║              All accounts: Password123!                      ║
╠══════════════════════════════════════════════════════════════╣
║ ADMIN                                                        ║
║   admin@farmlocal.com            Password123!               ║
╠══════════════════════════════════════════════════════════════╣
║ PRODUCERS                                                    ║
║   barton@bartonorganics.co.uk    Password123!               ║
║   info@bristolcheeseco.co.uk     Password123!               ║
║   hello@avonvalleybakery.co.uk   Password123!               ║
║   orders@somersetmeats.co.uk     Password123!               ║
║   drinks@cliftondrinks.co.uk     Password123!               ║
║   honey@hartcliffehoney.co.uk    Password123!               ║
╠══════════════════════════════════════════════════════════════╣
║ CUSTOMERS                                                    ║
║   alice.thompson@gmail.com       Password123!               ║
║   charlie.davies@gmail.com       Password123!               ║
║   emma.wilson@gmail.com          Password123!               ║
║   james.brown@gmail.com          Password123!               ║
║   sarah.green@gmail.com          Password123!               ║
║   oliver.stokes@gmail.com        Password123!               ║
║   lucy.wright@gmail.com          Password123!               ║
║   raj.patel@gmail.com            Password123!               ║
╠══════════════════════════════════════════════════════════════╣
║ ORGANISATIONS (customer accounts with org profile)           ║
║   foodhub@bristolfoodhub.org     Password123!               ║
║     → Bristol Food Hub (community_group)                     ║
║   chef@harbourside.kitchen       Password123!               ║
║     → Harbourside Kitchen (restaurant)                       ║
║   catering@fareshare.bristol.org Password123!               ║
║     → FareShare Bristol (charity)                            ║
╚══════════════════════════════════════════════════════════════╝
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from apps.accounts.models import Account, Customer, Organisation
from apps.addresses.models import Address
from apps.producers.models import Producer
from apps.catalog.models import Category, Product, RecommendationInteraction
from apps.orders.models import (
    Order, ProducerOrder, ProducerOrderStatusEvent, OrderItem,
    RecurringOrder, RecurringOrderItem,
    WeeklySettlement, SettlementLine, CommissionLedger,
)
from apps.community.models import Review, Recipe, FarmStory, FarmStoryLike
from apps.traceability.models import Allergen
from apps.payments.models import Payment
from apps.communications.models import Announcement

SEED_PASSWORD = "Password123!"
COMMISSION_RATE = Decimal("0.05")

# ── Data ─────────────────────────────────────────────────────────────────────

CATEGORIES = [
    {"name": "Vegetables",         "description": "Fresh locally grown vegetables from Bristol-area farms."},
    {"name": "Fruit",              "description": "Seasonal fruits from local orchards and market gardens."},
    {"name": "Dairy",              "description": "Milk, cheese, butter and yoghurt from local dairies."},
    {"name": "Meat",               "description": "Ethically reared meat and poultry from Somerset farms."},
    {"name": "Bakery",             "description": "Freshly baked breads, pastries and cakes."},
    {"name": "Drinks",             "description": "Juices, ales, cordials and soft drinks."},
    {"name": "Honey & Preserves",  "description": "Local honeys, jams, jellies and marmalades."},
    {"name": "Eggs",               "description": "Free-range and organic eggs from local hens."},
]

PRODUCERS = [
    {
        "username": "barton_farm",
        "email": "barton@bartonorganics.co.uk",
        "first_name": "Tom",
        "last_name": "Barton",
        "company_name": "Barton Farm Organics",
        "company_number": "07700900101",
        "company_description": (
            "A certified organic farm nestled in the Clifton hills, growing seasonal vegetables "
            "and fruit for Bristol since 2009. We farm without pesticides, rotate crops naturally, "
            "and deliver twice a week to keep everything as fresh as possible."
        ),
        "lead_time_hours": 48,
        "address": {"address_line_1": "Barton Hill Farm, Barton Road", "city": "Bristol", "postcode": "BS8 2LR"},
    },
    {
        "username": "bristol_cheese",
        "email": "info@bristolcheeseco.co.uk",
        "first_name": "Helen",
        "last_name": "Clarke",
        "company_name": "Bristol Cheese Co.",
        "company_number": "07700900102",
        "company_description": (
            "Award-winning artisan cheese-makers based in the heart of Bristol. "
            "We source milk exclusively from farms within 30 miles and mature our cheeses "
            "in our own cellars beneath the city."
        ),
        "lead_time_hours": 48,
        "address": {"address_line_1": "12 King Street", "city": "Bristol", "postcode": "BS1 4EJ"},
    },
    {
        "username": "avon_bakery",
        "email": "hello@avonvalleybakery.co.uk",
        "first_name": "Marco",
        "last_name": "Rossi",
        "company_name": "Avon Valley Bakery",
        "company_number": "07700900103",
        "company_description": (
            "A family bakery in Brislington producing long-fermentation sourdoughs, "
            "viennoiserie and seasonal pastries. Everything is baked fresh each morning "
            "using stoneground flour from local mills."
        ),
        "lead_time_hours": 48,
        "address": {"address_line_1": "88 Bath Road", "city": "Bristol", "postcode": "BS4 3HJ"},
    },
    {
        "username": "somerset_meats",
        "email": "orders@somersetmeats.co.uk",
        "first_name": "Dave",
        "last_name": "Perkins",
        "company_name": "Somerset Meats Direct",
        "company_number": "07700900104",
        "company_description": (
            "Third-generation butchers sourcing free-range pork, beef and lamb from "
            "small Somerset farms. We believe in full traceability and ethical rearing — "
            "every cut is labelled with the farm it came from."
        ),
        "lead_time_hours": 48,
        "address": {"address_line_1": "34 North Street", "city": "Bristol", "postcode": "BS3 1HW"},
    },
    {
        "username": "clifton_drinks",
        "email": "drinks@cliftondrinks.co.uk",
        "first_name": "Sophie",
        "last_name": "Haines",
        "company_name": "Clifton Drinks Co.",
        "company_number": "07700900105",
        "company_description": (
            "Craft soft drinks and juices pressed from West Country fruit. "
            "We also brew a small-batch local ale and a seasonal ginger beer. "
            "No artificial flavours — just fruit, water and a little care."
        ),
        "lead_time_hours": 48,
        "address": {"address_line_1": "7 Clifton Village Mews", "city": "Bristol", "postcode": "BS8 4HB"},
    },
    {
        "username": "hartcliffe_honey",
        "email": "honey@hartcliffehoney.co.uk",
        "first_name": "Priya",
        "last_name": "Patel",
        "company_name": "Hartcliffe Honey & Preserves",
        "company_number": "07700900106",
        "company_description": (
            "Urban beekeepers and preserve-makers based in south Bristol. "
            "Our hives sit across Hartcliffe allotments and neighbouring green spaces, "
            "producing raw honeys and seasonal fruit preserves with minimal processing."
        ),
        "lead_time_hours": 72,
        "address": {"address_line_1": "22 Bishport Avenue", "city": "Bristol", "postcode": "BS13 9HZ"},
    },
]

CUSTOMERS = [
    {
        "username": "alice_bristol",
        "email": "alice.thompson@gmail.com",
        "first_name": "Alice",
        "last_name": "Thompson",
        "phone": "07700123001",
        "address": {"address_line_1": "14 Redland Road", "city": "Bristol", "postcode": "BS6 6TB"},
    },
    {
        "username": "charlie_avon",
        "email": "charlie.davies@gmail.com",
        "first_name": "Charlie",
        "last_name": "Davies",
        "phone": "07700123002",
        "address": {"address_line_1": "6 Stapleton Road", "city": "Bristol", "postcode": "BS5 0QR"},
    },
    {
        "username": "emma_clifton",
        "email": "emma.wilson@gmail.com",
        "first_name": "Emma",
        "last_name": "Wilson",
        "phone": "07700123003",
        "address": {"address_line_1": "3 Pembroke Road", "city": "Bristol", "postcode": "BS8 3BA"},
    },
    {
        "username": "james_redland",
        "email": "james.brown@gmail.com",
        "first_name": "James",
        "last_name": "Brown",
        "phone": "07700123004",
        "address": {"address_line_1": "29 Coldharbour Road", "city": "Bristol", "postcode": "BS6 7JS"},
    },
    {
        "username": "sarah_totterdown",
        "email": "sarah.green@gmail.com",
        "first_name": "Sarah",
        "last_name": "Green",
        "phone": "07700123005",
        "address": {"address_line_1": "52 Wells Road", "city": "Bristol", "postcode": "BS4 2AA"},
    },
    {
        "username": "oliver_stokes",
        "email": "oliver.stokes@gmail.com",
        "first_name": "Oliver",
        "last_name": "Stokes",
        "phone": "07700123006",
        "address": {"address_line_1": "18 Saville Road", "city": "Bristol", "postcode": "BS9 1JA"},
    },
    {
        "username": "lucy_bishopston",
        "email": "lucy.wright@gmail.com",
        "first_name": "Lucy",
        "last_name": "Wright",
        "phone": "07700123007",
        "address": {"address_line_1": "7 Gloucester Road", "city": "Bristol", "postcode": "BS7 8AA"},
    },
    {
        "username": "raj_easton",
        "email": "raj.patel@gmail.com",
        "first_name": "Raj",
        "last_name": "Patel",
        "phone": "07700123008",
        "address": {"address_line_1": "45 Fishponds Road", "city": "Bristol", "postcode": "BS5 6PR"},
    },
]

ORG_CUSTOMERS = [
    {
        "username": "foodhub_bristol",
        "email": "foodhub@bristolfoodhub.org",
        "first_name": "Bristol",
        "last_name": "Food Hub",
        "account_type": "community_group",
        "phone": "01179001001",
        "address": {"address_line_1": "1 Broad Weir", "city": "Bristol", "postcode": "BS1 7DP"},
        "org": {
            "organisation_name": "Bristol Food Hub",
            "organisation_email": "foodhub@bristolfoodhub.org",
            "organisation_type": "community_group",
        },
    },
    {
        "username": "harbourside_chef",
        "email": "chef@harbourside.kitchen",
        "first_name": "Harbourside",
        "last_name": "Kitchen",
        "account_type": "restaurant",
        "phone": "01179002002",
        "address": {"address_line_1": "5 Canons Road", "city": "Bristol", "postcode": "BS1 5UH"},
        "org": {
            "organisation_name": "Harbourside Kitchen",
            "organisation_email": "chef@harbourside.kitchen",
            "organisation_type": "restaurant",
        },
    },
    {
        "username": "fareshare_bristol",
        "email": "catering@fareshare.bristol.org",
        "first_name": "FareShare",
        "last_name": "Bristol",
        "account_type": "community_group",
        "phone": "01179004004",
        "address": {"address_line_1": "10 Whitchurch Lane", "city": "Bristol", "postcode": "BS14 0JR"},
        "org": {
            "organisation_name": "FareShare Bristol",
            "organisation_email": "catering@fareshare.bristol.org",
            "organisation_type": "charity",
        },
    },
]

PRODUCTS = [
    # ══ Barton Farm Organics (barton_farm) ════════════════════════════════════
    # Vegetables
    {
        "name": "Organic Carrots", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.80", "unit": "kg", "stock": 220, "organic_certified": True,
        "description": "Sweet, freshly dug organic carrots from our Clifton fields. Unwashed for longer shelf-life.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774007764/products/1/main.webp",
    },
    {
        "name": "New Potatoes", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.20", "unit": "kg", "stock": 350, "organic_certified": False,
        "description": "Freshly harvested new potatoes, perfect for boiling or roasting.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006514/products/2/main.jpg",
    },
    {
        "name": "Baking Potatoes", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.40", "unit": "kg", "stock": 280, "organic_certified": False,
        "description": "Large floury baking potatoes with thick skins — perfect for jacket potatoes.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088156/products/106/main.jpg",
    },
    {
        "name": "Baby Spinach", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.75", "unit": "unit", "stock": 100, "organic_certified": True,
        "description": "Tender baby spinach leaves, ready to eat. Harvested same-day.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006864/products/3/main.avif",
    },
    {
        "name": "Courgettes", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.40", "unit": "kg", "stock": 150, "organic_certified": False,
        "description": "Mixed green and yellow courgettes, grown without pesticides.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 6, "season_end_month": 9,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774002408/products/4/main.webp",
    },
    {
        "name": "Tenderstem Broccoli", "producer": "barton_farm", "category": "Vegetables",
        "price": "2.20", "unit": "unit", "stock": 80, "organic_certified": True,
        "description": "Long-stemmed broccoli florets with a sweet, nutty flavour. Organically grown.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088421/products/109/main.jpg",
    },
    {
        "name": "Curly Kale", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.60", "unit": "unit", "stock": 90, "organic_certified": True,
        "description": "Hearty curly kale, perfect for salads, soups and stir-fries.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 10, "season_end_month": 3,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088287/products/110/main.jpg",
    },
    {
        "name": "Heritage Tomatoes", "producer": "barton_farm", "category": "Vegetables",
        "price": "3.50", "unit": "kg", "stock": 60, "organic_certified": True,
        "description": "A mixed punnet of heirloom varieties: Brandywine, Black Krim and Green Zebra.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 7, "season_end_month": 9,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088970/products/111/main.jpg",
    },
    {
        "name": "Leeks", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.80", "unit": "kg", "stock": 120, "organic_certified": False,
        "description": "Long, thick-stemmed leeks ideal for soups, gratins and pies.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 10, "season_end_month": 3,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088367/products/112/main.jpg",
    },
    {
        "name": "Red Onions", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.20", "unit": "kg", "stock": 200, "organic_certified": False,
        "description": "Mild, sweet red onions. Excellent raw in salads or roasted whole.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088465/products/113/main.jpg",
    },
    {
        "name": "Garlic", "producer": "barton_farm", "category": "Vegetables",
        "price": "0.80", "unit": "unit", "stock": 300, "organic_certified": True,
        "description": "Whole garlic bulbs, cured and dried. Organically grown with full, punchy flavour.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088345/products/114/main.jpg",
    },
    {
        "name": "Butternut Squash", "producer": "barton_farm", "category": "Vegetables",
        "price": "2.00", "unit": "unit", "stock": 100, "organic_certified": False,
        "description": "Sweet, dense butternut squash perfect for soups, roasting and risotto.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 9, "season_end_month": 12,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088255/products/115/main.jpg",
    },
    {
        "name": "Sweet Potatoes", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.60", "unit": "kg", "stock": 140, "organic_certified": False,
        "description": "Orange-fleshed sweet potatoes, freshly harvested. Great roasted or as wedges.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088442/products/116/main.jpg",
    },
    {
        "name": "Beetroot", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.50", "unit": "kg", "stock": 110, "organic_certified": True,
        "description": "Deep purple raw beetroot, unwashed. Roast, pickle or grate into salads.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088178/products/117/main.jpg",
    },
    {
        "name": "Parsnips", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.40", "unit": "kg", "stock": 130, "organic_certified": False,
        "description": "Sweet, earthy parsnips. Best after the first frost has improved their flavour.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 10, "season_end_month": 2,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088483/products/118/main.jpg",
    },
    {
        "name": "Spring Onions", "producer": "barton_farm", "category": "Vegetables",
        "price": "0.90", "unit": "unit", "stock": 160, "organic_certified": False,
        "description": "Crisp spring onions, bunched and trimmed. Mild enough to eat raw.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 4, "season_end_month": 9,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088453/products/119/main.jpg",
    },
    {
        "name": "Cavolo Nero", "producer": "barton_farm", "category": "Vegetables",
        "price": "2.00", "unit": "unit", "stock": 75, "organic_certified": True,
        "description": "Italian black kale with a rich, earthy flavour. Grows through frost — picked at its best.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 11, "season_end_month": 3,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088274/products/120/main.jpg",
    },
    {
        "name": "Mixed Salad Leaves", "producer": "barton_farm", "category": "Vegetables",
        "price": "1.80", "unit": "unit", "stock": 90, "organic_certified": True,
        "description": "A bag of peppery mixed leaves — rocket, watercress, baby chard and lettuce. Harvested fresh.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088383/products/121/main.jpg",
    },
    # Fruit
    {
        "name": "Cox Apples", "producer": "barton_farm", "category": "Fruit",
        "price": "2.40", "unit": "kg", "stock": 200, "organic_certified": True,
        "description": "Classic British eating apples with a rich, nutmeg-sweet flavour.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 9, "season_end_month": 11,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774002073/products/5/main.jpg",
    },
    {
        "name": "Bramley Cooking Apples", "producer": "barton_farm", "category": "Fruit",
        "price": "1.80", "unit": "kg", "stock": 150, "organic_certified": False,
        "description": "Large, tart Bramley apples. The only apple for a proper crumble or pie.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 9, "season_end_month": 12,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006396/products/6/main.webp",
    },
    {
        "name": "Victoria Plums", "producer": "barton_farm", "category": "Fruit",
        "price": "3.20", "unit": "kg", "stock": 70, "organic_certified": True,
        "description": "Juicy, fragrant Victoria plums. Great for crumbles, jams and eating fresh.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 8, "season_end_month": 9,
        "is_surplus": True, "discount_percentage": 25,
        "surplus_note": "Bumper harvest this year — reduced to clear before end of season.",
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088941/products/124/main.jpg",
    },
    {
        "name": "Raspberries", "producer": "barton_farm", "category": "Fruit",
        "price": "3.50", "unit": "unit", "stock": 50, "organic_certified": True,
        "description": "Hand-picked raspberries from our fruit canes. Picked daily.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 6, "season_end_month": 8,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088923/products/125/main.jpg",
    },
    {
        "name": "Fresh Strawberries", "producer": "barton_farm", "category": "Fruit",
        "price": "3.20", "unit": "unit", "stock": 60, "organic_certified": True,
        "description": "Sweet British strawberries, picked at peak ripeness. No fridge needed — eat within 2 days.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 5, "season_end_month": 8,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006644/products/7/main.jpg",
    },
    {
        "name": "Rhubarb", "producer": "barton_farm", "category": "Fruit",
        "price": "2.00", "unit": "kg", "stock": 80, "organic_certified": False,
        "description": "Bright pink rhubarb stalks, perfect for crumbles, fools and jams.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 3, "season_end_month": 6,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089080/products/127/main.jpg",
    },
    {
        "name": "Blackberries", "producer": "barton_farm", "category": "Fruit",
        "price": "3.00", "unit": "unit", "stock": 45, "organic_certified": False,
        "description": "Cultivated blackberries from our fruit hedgerows. Larger and sweeter than wild-picked.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 8, "season_end_month": 10,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088827/products/128/main.jpg",
    },
    {
        "name": "Gooseberries", "producer": "barton_farm", "category": "Fruit",
        "price": "2.80", "unit": "unit", "stock": 40, "organic_certified": False,
        "description": "Tart green gooseberries, ideal for fools, jams and crumbles.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 6, "season_end_month": 8,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088979/products/129/main.jpg",
    },
    # Eggs
    {
        "name": "Free-Range Eggs", "producer": "barton_farm", "category": "Eggs",
        "price": "2.80", "unit": "dozen", "stock": 150, "organic_certified": False,
        "description": "A dozen large free-range eggs from our flock of Speckled Sussex hens. Collected daily.",
        "allergens": ["eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088315/products/130/main.jpg",
    },
    {
        "name": "Organic Eggs", "producer": "barton_farm", "category": "Eggs",
        "price": "3.50", "unit": "dozen", "stock": 80, "organic_certified": True,
        "description": "Certified organic eggs from hens fed on organic grain and given full outdoor access.",
        "allergens": ["eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088909/products/131/main.jpg",
    },

    # ══ Bristol Cheese Co. (bristol_cheese) ═══════════════════════════════════
    {
        "name": "Vintage Cheddar", "producer": "bristol_cheese", "category": "Dairy",
        "price": "7.50", "unit": "unit", "stock": 60, "organic_certified": False,
        "description": "Aged 18 months in our city cellars. Bold, crumbly and full-flavoured.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766356/montgomery_s_1065x1065px.jpg_a0ridg.webp",
    },
    {
        "name": "Smoked Cheddar", "producer": "bristol_cheese", "category": "Dairy",
        "price": "8.00", "unit": "unit", "stock": 40, "organic_certified": False,
        "description": "Our Vintage Cheddar cold-smoked over applewood. Nutty, smoky and complex.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766356/montgomery_s_1065x1065px.jpg_a0ridg.webp",
    },
    {
        "name": "Bristol Blue", "producer": "bristol_cheese", "category": "Dairy",
        "price": "9.50", "unit": "unit", "stock": 25, "organic_certified": False,
        "description": "Our Stilton-style blue. Mellow and creamy with gentle blue veining. Best served at room temperature.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766356/montgomery_s_1065x1065px.jpg_a0ridg.webp",
    },
    {
        "name": "Bristol Brie", "producer": "bristol_cheese", "category": "Dairy",
        "price": "6.00", "unit": "unit", "stock": 40, "organic_certified": False,
        "description": "Soft-ripened brie with a velvety rind and buttery centre. Best at room temperature.",
        "allergens": ["dairy"],
        "is_surplus": True, "discount_percentage": 20,
        "surplus_note": "Perfectly ripe — eat within 3 days for best flavour.",
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766356/montgomery_s_1065x1065px.jpg_a0ridg.webp",
    },
    {
        "name": "Ricotta", "producer": "bristol_cheese", "category": "Dairy",
        "price": "4.50", "unit": "unit", "stock": 50, "organic_certified": False,
        "description": "Fresh ricotta made from whey left over from our cheddar production. Light and delicate.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087922/products/136/main.jpg",
    },
    {
        "name": "Whole Milk", "producer": "bristol_cheese", "category": "Dairy",
        "price": "1.20", "unit": "litre", "stock": 180, "organic_certified": True,
        "description": "Full-fat whole milk from grass-fed cows on our partner farm in Chew Valley.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006815/products/8/main.jpg",
    },
    {
        "name": "Semi-Skimmed Milk", "producer": "bristol_cheese", "category": "Dairy",
        "price": "1.00", "unit": "litre", "stock": 140, "organic_certified": True,
        "description": "1.8% fat semi-skimmed milk from the same Chew Valley herd. Fresh and clean-tasting.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087981/products/138/main.jpg",
    },
    {
        "name": "Greek-Style Yoghurt", "producer": "bristol_cheese", "category": "Dairy",
        "price": "2.50", "unit": "unit", "stock": 80, "organic_certified": True,
        "description": "Thick, strained yoghurt with a clean tangy taste. No added thickeners.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087878/products/139/main.jpg",
    },
    {
        "name": "Natural Yoghurt", "producer": "bristol_cheese", "category": "Dairy",
        "price": "1.80", "unit": "unit", "stock": 100, "organic_certified": False,
        "description": "Unstrained whole-milk yoghurt, mild and lightly tangy. No sugar, no additives.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778088068/products/140/main.jpg",
    },
    {
        "name": "Unsalted Butter", "producer": "bristol_cheese", "category": "Dairy",
        "price": "3.20", "unit": "unit", "stock": 100, "organic_certified": False,
        "description": "Cultured unsalted butter churned from local cream. Rich and slightly tangy.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087966/products/141/main.jpg",
    },
    {
        "name": "Salted Butter", "producer": "bristol_cheese", "category": "Dairy",
        "price": "3.20", "unit": "unit", "stock": 90, "organic_certified": False,
        "description": "Cultured butter with a pinch of Cornish sea salt. Ideal for spreading and finishing.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087937/products/142/main.jpg",
    },
    {
        "name": "Double Cream", "producer": "bristol_cheese", "category": "Dairy",
        "price": "2.80", "unit": "unit", "stock": 70, "organic_certified": False,
        "description": "Lightly pasteurised double cream, 48% fat. Ideal for whipping and cooking.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087834/products/143/main.jpg",
    },
    {
        "name": "Crème Fraîche", "producer": "bristol_cheese", "category": "Dairy",
        "price": "2.20", "unit": "unit", "stock": 60, "organic_certified": False,
        "description": "Thick, mildly soured cream. Excellent in sauces and with desserts.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087782/products/144/main.jpg",
    },
    {
        "name": "Clotted Cream", "producer": "bristol_cheese", "category": "Dairy",
        "price": "3.80", "unit": "unit", "stock": 35, "organic_certified": False,
        "description": "Traditionally scalded clotted cream with a golden crust. Essential for scones.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087763/products/145/main.jpg",
    },
    {
        "name": "Kefir", "producer": "bristol_cheese", "category": "Dairy",
        "price": "2.80", "unit": "litre", "stock": 45, "organic_certified": False,
        "description": "Naturally fermented kefir from whole milk. Tart, probiotic-rich and drinkable.",
        "allergens": ["dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778087895/products/146/main.jpg",
    },

    # ══ Avon Valley Bakery (avon_bakery) ══════════════════════════════════════
    {
        "name": "Sourdough Loaf", "producer": "avon_bakery", "category": "Bakery",
        "price": "3.80", "unit": "unit", "stock": 45, "organic_certified": False,
        "description": "Long-fermentation sourdough with a thick crust and open crumb. Baked at 5 am daily.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006579/products/12/main.webp",
    },
    {
        "name": "Croissants", "producer": "avon_bakery", "category": "Bakery",
        "price": "5.50", "unit": "dozen", "stock": 25, "organic_certified": False,
        "description": "Flaky, buttery croissants laminated with 72 layers of dough. A dozen per bag.",
        "allergens": ["gluten", "dairy", "eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766472/Croissants-jar-of-jam.jpg_okmn5y.webp",
    },
    {
        "name": "Seeded Rye Loaf", "producer": "avon_bakery", "category": "Bakery",
        "price": "3.50", "unit": "unit", "stock": 35, "organic_certified": False,
        "description": "Dense, moist rye loaf topped with sunflower and pumpkin seeds.",
        "allergens": ["gluten", "sesame"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089292/products/149/main.jpg",
    },
    {
        "name": "Focaccia", "producer": "avon_bakery", "category": "Bakery",
        "price": "3.20", "unit": "unit", "stock": 30, "organic_certified": False,
        "description": "Olive oil-drenched focaccia with rosemary and sea salt. Baked in the sheet pan.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089232/products/150/main.jpg",
    },
    {
        "name": "Cinnamon Rolls", "producer": "avon_bakery", "category": "Bakery",
        "price": "6.00", "unit": "dozen", "stock": 20, "organic_certified": False,
        "description": "Soft enriched dough rolls filled with cinnamon sugar, glazed with cream cheese icing.",
        "allergens": ["gluten", "dairy", "eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089171/products/151/main.jpg",
    },
    {
        "name": "Pain au Chocolat", "producer": "avon_bakery", "category": "Bakery",
        "price": "6.50", "unit": "dozen", "stock": 15, "organic_certified": False,
        "description": "Laminated pastry encasing two bars of 70% dark chocolate. Six per pack.",
        "allergens": ["gluten", "dairy", "eggs"],
        "is_surplus": True, "discount_percentage": 30,
        "surplus_note": "Friday surplus — baked this morning, best eaten today.",
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089396/products/152/main.jpg",
    },
    {
        "name": "Wholemeal Farmhouse Loaf", "producer": "avon_bakery", "category": "Bakery",
        "price": "2.80", "unit": "unit", "stock": 50, "organic_certified": False,
        "description": "Classic wholemeal tin loaf using stoneground flour from Shipton Mill.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089314/products/153/main.jpg",
    },
    {
        "name": "Spelt Loaf", "producer": "avon_bakery", "category": "Bakery",
        "price": "4.20", "unit": "unit", "stock": 25, "organic_certified": False,
        "description": "Light, nutty spelt loaf with a soft crumb. An ancient grain with a modern following.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089306/products/154/main.jpg",
    },
    {
        "name": "Brioche Loaf", "producer": "avon_bakery", "category": "Bakery",
        "price": "4.50", "unit": "unit", "stock": 20, "organic_certified": False,
        "description": "Buttery enriched brioche, baked in a tin. Perfect toasted with jam or as a burger bun.",
        "allergens": ["gluten", "dairy", "eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089153/products/155/main.jpg",
    },
    {
        "name": "Everything Bagels", "producer": "avon_bakery", "category": "Bakery",
        "price": "5.00", "unit": "dozen", "stock": 20, "organic_certified": False,
        "description": "Kettle-boiled bagels topped with sesame, poppy seeds, garlic and onion flakes. Six per bag.",
        "allergens": ["gluten", "sesame", "eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089193/products/156/main.jpg",
    },
    {
        "name": "Farmhouse Scones", "producer": "avon_bakery", "category": "Bakery",
        "price": "5.00", "unit": "dozen", "stock": 18, "organic_certified": False,
        "description": "Plain buttermilk scones, six per pack. Serve with clotted cream and jam.",
        "allergens": ["gluten", "dairy", "eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089213/products/157/main.jpg",
    },
    {
        "name": "Malt Loaf", "producer": "avon_bakery", "category": "Bakery",
        "price": "3.00", "unit": "unit", "stock": 28, "organic_certified": False,
        "description": "Dense, sticky malt loaf with plump raisins. Best sliced thin with cold butter.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089269/products/158/main.jpg",
    },
    {
        "name": "Danish Pastries", "producer": "avon_bakery", "category": "Bakery",
        "price": "7.00", "unit": "dozen", "stock": 14, "organic_certified": False,
        "description": "A mixed selection of six laminated Danish pastries — apricot, custard and cinnamon varieties.",
        "allergens": ["gluten", "dairy", "eggs"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089182/products/159/main.jpg",
    },
    {
        "name": "Hot Cross Buns", "producer": "avon_bakery", "category": "Bakery",
        "price": "4.50", "unit": "dozen", "stock": 22, "organic_certified": False,
        "description": "Spiced fruit buns with a flour-paste cross. Sold six per pack.",
        "allergens": ["gluten", "dairy", "eggs"],
        "availability_mode": "seasonal", "season_start_month": 3, "season_end_month": 4,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089252/products/160/main.jpg",
    },

    # ══ Somerset Meats Direct (somerset_meats) ════════════════════════════════
    {
        "name": "Free-Range Chicken Thighs", "producer": "somerset_meats", "category": "Meat",
        "price": "7.50", "unit": "kg", "stock": 60, "organic_certified": False,
        "description": "Bone-in, skin-on chicken thighs from slow-grown free-range birds.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766257/chicken_thighs_bf18a1a35dcb0b6a_b55ef63d-d50c-41a5-b040-f6cdce5e8c7e_jd7iks.webp",
    },
    {
        "name": "Whole Free-Range Chicken", "producer": "somerset_meats", "category": "Meat",
        "price": "12.00", "unit": "unit", "stock": 30, "organic_certified": False,
        "description": "A whole free-range chicken averaging 1.8 kg. Slow-grown, full flavour.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090198/products/162/main.jpg",
    },
    {
        "name": "Chicken Wings", "producer": "somerset_meats", "category": "Meat",
        "price": "5.50", "unit": "kg", "stock": 70, "organic_certified": False,
        "description": "Free-range chicken wings, perfect for marinating and roasting or barbecuing.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089987/products/163/main.jpg",
    },
    {
        "name": "Pork Sausages", "producer": "somerset_meats", "category": "Meat",
        "price": "4.50", "unit": "unit", "stock": 80, "organic_certified": False,
        "description": "Traditional pork sausages with a high meat content and a pinch of sage.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006459/products/11/main.jpg",
    },
    {
        "name": "Pork & Apple Sausages", "producer": "somerset_meats", "category": "Meat",
        "price": "4.80", "unit": "unit", "stock": 65, "organic_certified": False,
        "description": "Pork sausages with a subtle sweetness from Bramley apple. Six per pack.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1774006459/products/11/main.jpg",
    },
    {
        "name": "Beef Mince", "producer": "somerset_meats", "category": "Meat",
        "price": "8.00", "unit": "kg", "stock": 50, "organic_certified": False,
        "description": "20% fat beef mince from grass-fed Somerset cattle. Ideal for Bolognese and burgers.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089938/products/166/main.jpg",
    },
    {
        "name": "Beef Ribeye Steaks", "producer": "somerset_meats", "category": "Meat",
        "price": "18.00", "unit": "unit", "stock": 20, "organic_certified": False,
        "description": "Two 250g ribeye steaks from 28-day dry-aged Somerset beef. Well-marbled and full of flavour.",
        "allergens": [],
        "low_stock_threshold": 5,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089951/products/167/main.jpg",
    },
    {
        "name": "Lamb Chops", "producer": "somerset_meats", "category": "Meat",
        "price": "12.00", "unit": "kg", "stock": 30, "organic_certified": True,
        "description": "Organic lamb loin chops, tender and well-marbled, farmed on Exmoor.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090090/products/168/main.jpg",
    },
    {
        "name": "Lamb Shoulder", "producer": "somerset_meats", "category": "Meat",
        "price": "14.00", "unit": "unit", "stock": 15, "organic_certified": True,
        "description": "Bone-in lamb shoulder averaging 1.5 kg. Slow-roast for 4-5 hours for pull-apart results.",
        "allergens": [],
        "low_stock_threshold": 4,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090149/products/169/main.jpg",
    },
    {
        "name": "Lamb Mince", "producer": "somerset_meats", "category": "Meat",
        "price": "9.50", "unit": "kg", "stock": 35, "organic_certified": True,
        "description": "Coarsely minced Exmoor lamb. Perfect for koftas, shepherd's pie and moussaka.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090104/products/170/main.jpg",
    },
    {
        "name": "Back Bacon", "producer": "somerset_meats", "category": "Meat",
        "price": "4.00", "unit": "unit", "stock": 70, "organic_certified": False,
        "description": "Dry-cured back bacon rashers, mildly smoked over oak. Six rashers per pack.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089921/products/171/main.jpg",
    },
    {
        "name": "Streaky Bacon", "producer": "somerset_meats", "category": "Meat",
        "price": "3.80", "unit": "unit", "stock": 65, "organic_certified": False,
        "description": "Thin-cut streaky bacon from dry-cured pork belly. Crispy and intensely flavoured.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090172/products/172/main.jpg",
    },
    {
        "name": "Chicken Breast", "producer": "somerset_meats", "category": "Meat",
        "price": "8.50", "unit": "kg", "stock": 45, "organic_certified": False,
        "description": "Plump, free-range chicken breasts. Trimmed and ready to cook.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778089975/products/173/main.jpg",
    },
    {
        "name": "Pork Belly Slices", "producer": "somerset_meats", "category": "Meat",
        "price": "6.50", "unit": "kg", "stock": 40, "organic_certified": False,
        "description": "Thick-cut pork belly slices, ideal for slow roasting or BBQ.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090160/products/174/main.jpg",
    },
    {
        "name": "Gammon Joint", "producer": "somerset_meats", "category": "Meat",
        "price": "16.00", "unit": "unit", "stock": 18, "organic_certified": False,
        "description": "A 1.2 kg unsmoked gammon joint, perfect for boiling or roasting whole.",
        "allergens": [],
        "low_stock_threshold": 5,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090077/products/175/main.jpg",
    },
    {
        "name": "Duck Breast", "producer": "somerset_meats", "category": "Meat",
        "price": "11.00", "unit": "unit", "stock": 22, "organic_certified": False,
        "description": "Two free-range duck breasts, skin-on. Score the skin, start in a cold pan.",
        "allergens": [],
        "low_stock_threshold": 5,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090067/products/176/main.jpg",
    },
    {
        "name": "Pork Ribs", "producer": "somerset_meats", "category": "Meat",
        "price": "9.00", "unit": "unit", "stock": 28, "organic_certified": False,
        "description": "A rack of meaty pork ribs from our Gloucestershire Old Spots. Marinate and slow cook.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090180/products/177/main.jpg",
    },

    # ══ Clifton Drinks Co. (clifton_drinks) ═══════════════════════════════════
    {
        "name": "Pressed Apple Juice", "producer": "clifton_drinks", "category": "Drinks",
        "price": "3.00", "unit": "litre", "stock": 110, "organic_certified": True,
        "description": "Cold-pressed juice from a blend of West Country dessert apples. No sugar added.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773765963/Health-GettyImages-2195254115-b58f9b474bcf47b3a89491d5ebec2fbf_mitsht.jpg",
    },
    {
        "name": "Pressed Pear Juice", "producer": "clifton_drinks", "category": "Drinks",
        "price": "3.20", "unit": "litre", "stock": 70, "organic_certified": False,
        "description": "Delicate, floral pear juice pressed from Comice and Conference pears. Lightly sweet.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 9, "season_end_month": 11,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090499/products/179/main.jpg",
    },
    {
        "name": "Blood Orange Juice", "producer": "clifton_drinks", "category": "Drinks",
        "price": "4.00", "unit": "litre", "stock": 45, "organic_certified": True,
        "description": "Vivid, ruby-coloured blood orange juice with a raspberry-citrus tang.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 12, "season_end_month": 3,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090352/products/180/main.jpg",
    },
    {
        "name": "Elderflower Cordial", "producer": "clifton_drinks", "category": "Drinks",
        "price": "5.00", "unit": "unit", "stock": 65, "organic_certified": False,
        "description": "Hand-picked elderflower heads steeped with lemon zest. Dilute 1:10 with water.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 5, "season_end_month": 7,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1773766573/homemade-elderflower-cordial-1500x1500_2.jpg_kncfn2.webp",
    },
    {
        "name": "Raspberry Lemonade", "producer": "clifton_drinks", "category": "Drinks",
        "price": "2.50", "unit": "unit", "stock": 75, "organic_certified": False,
        "description": "Sparkling lemonade blended with fresh raspberry juice. Naturally pink, naturally delicious.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 5, "season_end_month": 9,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090511/products/182/main.jpg",
    },
    {
        "name": "Bristol Craft Ale", "producer": "clifton_drinks", "category": "Drinks",
        "price": "2.80", "unit": "unit", "stock": 120, "organic_certified": False,
        "description": "A 4.2% pale ale brewed with Cascade hops. Citrusy, clean and refreshing.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090362/products/183/main.jpg",
    },
    {
        "name": "Dark Porter", "producer": "clifton_drinks", "category": "Drinks",
        "price": "3.20", "unit": "unit", "stock": 80, "organic_certified": False,
        "description": "A 5% dark porter with notes of coffee, dark chocolate and toffee. Full-bodied and smooth.",
        "allergens": ["gluten"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090426/products/184/main.webp",
    },
    {
        "name": "Sparkling Lemonade", "producer": "clifton_drinks", "category": "Drinks",
        "price": "1.80", "unit": "unit", "stock": 90, "organic_certified": False,
        "description": "Naturally sparkling lemonade made with Sicilian lemon juice and local spring water.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090524/products/185/main.jpg",
    },
    {
        "name": "Still Lemonade", "producer": "clifton_drinks", "category": "Drinks",
        "price": "1.80", "unit": "unit", "stock": 80, "organic_certified": False,
        "description": "Old-fashioned still lemonade — gentle, not too sweet and genuinely refreshing.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090533/products/186/main.jpg",
    },
    {
        "name": "Ginger Beer", "producer": "clifton_drinks", "category": "Drinks",
        "price": "2.20", "unit": "unit", "stock": 80, "organic_certified": False,
        "description": "Fiery, naturally fermented ginger beer. Genuinely spicy — not a mixer.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090451/products/187/main.jpg",
    },
    {
        "name": "Tomato Juice", "producer": "clifton_drinks", "category": "Drinks",
        "price": "3.50", "unit": "litre", "stock": 50, "organic_certified": True,
        "description": "Rich, vine-ripened tomato juice — made only when summer tomatoes are at their peak.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 7, "season_end_month": 9,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090546/products/188/main.jpg",
    },
    {
        "name": "Kombucha Original", "producer": "clifton_drinks", "category": "Drinks",
        "price": "3.00", "unit": "unit", "stock": 55, "organic_certified": False,
        "description": "Live-culture kombucha, lightly effervescent with a clean, vinegary tang.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090472/products/189/main.jpg",
    },
    {
        "name": "Tonic Water", "producer": "clifton_drinks", "category": "Drinks",
        "price": "1.50", "unit": "unit", "stock": 100, "organic_certified": False,
        "description": "Premium tonic water with real quinine bark. Made for a proper G&T.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090559/products/190/main.jpg",
    },
    {
        "name": "Cold Brew Coffee", "producer": "clifton_drinks", "category": "Drinks",
        "price": "4.00", "unit": "unit", "stock": 40, "organic_certified": False,
        "description": "12-hour cold-brew concentrate using single-origin Ethiopian beans. Mix 1:3 with milk.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090409/products/191/main.jpg",
    },
    {
        "name": "Cherry Juice", "producer": "clifton_drinks", "category": "Drinks",
        "price": "3.80", "unit": "litre", "stock": 35, "organic_certified": False,
        "description": "Tart Montmorency cherry juice, cold-pressed and unsweetened. Deep ruby colour.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 7, "season_end_month": 8,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090375/products/192/main.jpg",
    },

    # ══ Hartcliffe Honey & Preserves (hartcliffe_honey) ══════════════════════
    {
        "name": "Wildflower Honey", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "6.00", "unit": "unit", "stock": 55, "organic_certified": True,
        "description": "Raw, unpasteurised wildflower honey from our Bristol allotment hives. Rich and complex.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091594/products/193/main.jpg",
    },
    {
        "name": "Set Honey", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "5.50", "unit": "unit", "stock": 45, "organic_certified": True,
        "description": "Naturally crystallised honey with a smooth, spreadable texture. Mild and sweet.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091172/products/194/main.jpg",
    },
    {
        "name": "Heather Honey", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "8.50", "unit": "unit", "stock": 20, "organic_certified": True,
        "description": "Single-variety heather honey from hives moved to Exmoor in late summer. Intensely aromatic.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 8, "season_end_month": 10,
        "low_stock_threshold": 5,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091114/products/195/main.jpg",
    },
    {
        "name": "Acacia Honey", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "7.00", "unit": "unit", "stock": 30, "organic_certified": True,
        "description": "Pale, liquid acacia honey that resists crystallisation. Delicate floral flavour.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090985/products/196/main.jpg",
    },
    {
        "name": "Lavender Honey", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "7.50", "unit": "unit", "stock": 30, "organic_certified": True,
        "description": "Single-variety lavender honey, collected when the lavender fields are in full bloom.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091150/products/197/main.jpg",
    },
    {
        "name": "Honeycomb", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "9.00", "unit": "unit", "stock": 18, "organic_certified": True,
        "description": "Raw wildflower honeycomb direct from the hive. Eat with cheese, tear over yoghurt.",
        "allergens": [],
        "low_stock_threshold": 4,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091130/products/198/main.jpg",
    },
    {
        "name": "Strawberry Jam", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "3.50", "unit": "unit", "stock": 65, "organic_certified": False,
        "description": "Made with whole Bristol-grown strawberries. Low sugar, high fruit content.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091206/products/199/main.jpg",
    },
    {
        "name": "Bramble Jelly", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "3.80", "unit": "unit", "stock": 50, "organic_certified": False,
        "description": "Clear jelly made from wild blackberries picked in local hedgerows each autumn.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 9, "season_end_month": 12,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091011/products/200/main.jpg",
    },
    {
        "name": "Blackcurrant Jam", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "3.60", "unit": "unit", "stock": 45, "organic_certified": False,
        "description": "Deep, intensely fruity blackcurrant jam. High in vitamin C, naturally tart.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 7, "season_end_month": 8,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778090999/products/201/main.jpg",
    },
    {
        "name": "Damson Plum Jam", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "4.00", "unit": "unit", "stock": 38, "organic_certified": False,
        "description": "Rich, wine-dark damson jam made with wild-harvested damsons from local hedgerows.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 9, "season_end_month": 10,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091050/products/202/main.jpg",
    },
    {
        "name": "Seville Orange Marmalade", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "4.00", "unit": "unit", "stock": 45, "organic_certified": False,
        "description": "Bitter-sweet coarse-cut marmalade from Seville oranges. Made in January only.",
        "allergens": [],
        "availability_mode": "seasonal", "season_start_month": 1, "season_end_month": 2,
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091191/products/203/main.jpg",
    },
    {
        "name": "Ginger & Lemon Preserve", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "4.20", "unit": "unit", "stock": 40, "organic_certified": False,
        "description": "A warming preserve of crystallised ginger and lemon zest in a light syrup.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091089/products/204/main.jpg",
    },
    {
        "name": "Chilli Jam", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "4.50", "unit": "unit", "stock": 42, "organic_certified": False,
        "description": "Fiery red chilli jam made with Bristol-grown chillies and our own honey. Sweet heat.",
        "allergens": [],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091036/products/205/main.jpg",
    },
    {
        "name": "Lemon Curd", "producer": "hartcliffe_honey", "category": "Honey & Preserves",
        "price": "3.20", "unit": "unit", "stock": 55, "organic_certified": False,
        "description": "Silky smooth lemon curd made with free-range eggs and Amalfi lemons.",
        "allergens": ["eggs", "dairy"],
        "image": "https://res.cloudinary.com/drwmcduef/image/upload/v1778091162/products/206/main.jpg",
    },
]

# ── Farm Stories ─────────────────────────────────────────────────────────────

FARM_STORIES = [
    # Barton Farm
    {
        "producer": "barton_farm",
        "title": "Our Journey to Full Organic Certification",
        "body": (
            "When my father handed me the keys to Barton Hill Farm in 2009, the soil was tired. "
            "Years of conventional growing had stripped it back. We spent three years transitioning — "
            "no quick wins, just slow composting, cover cropping and patience. Getting our Soil Association "
            "certificate in 2012 was the proudest day of my farming life. The carrots taste different now. "
            "You can taste the health in the soil. We're not going back."
        ),
        "days_ago": 340,
    },
    {
        "producer": "barton_farm",
        "title": "Why We Only Grow Seasonal Varieties",
        "body": (
            "We get asked every winter why we don't stock tomatoes year-round. The honest answer is: "
            "because a January polytunnel tomato tastes of nothing. Seasonal growing means our heritage "
            "varieties ripen in real sunlight, develop real sugars, and arrive at your door full of flavour. "
            "It also means our soil gets the rest it needs. Seasonality isn't a marketing angle — it's just "
            "how good food works."
        ),
        "days_ago": 180,
    },
    {
        "producer": "barton_farm",
        "title": "Meet Rosie — Our Farm Dog and Chief Pest Controller",
        "body": (
            "Rosie is a five-year-old border collie with an uncanny ability to find slugs. She also keeps "
            "the foxes away from the soft-fruit beds, herds the rare-breed sheep we keep for wool and "
            "manure, and generally supervises whatever we're doing. She gets first pick of any carrots "
            "that are too small to sell. We think she's the most important member of the team."
        ),
        "days_ago": 45,
    },
    # Bristol Cheese Co.
    {
        "producer": "bristol_cheese",
        "title": "Ageing Cheese Beneath the City",
        "body": (
            "Beneath King Street, below the tourists and the pub crawlers, our Victorian cellars maintain "
            "a constant 10°C year-round. It's where we've been maturing our Vintage Cheddar since 2014. "
            "The stone walls absorb moisture slowly, the temperature never spikes, and the ambient bacteria "
            "from the old building give our rinds a character you simply cannot replicate in a modern "
            "refrigerated store. The city is part of the cheese."
        ),
        "days_ago": 290,
    },
    {
        "producer": "bristol_cheese",
        "title": "From Chew Valley to King Street: Our Milk Supply",
        "body": (
            "We work with one dairy farm — a family operation in Chew Valley, 12 miles from our creamery. "
            "The cows are primarily Montbéliarde cross, which gives a high-fat, high-protein milk that "
            "yields beautifully. We collect three times a week. No middlemen, no blending with anonymous "
            "tanker milk. If a batch doesn't meet our standard on the day, we don't make cheese that day. "
            "It's that simple."
        ),
        "days_ago": 120,
    },
    {
        "producer": "bristol_cheese",
        "title": "The Accidental Brie",
        "body": (
            "Bristol Brie was never planned. A batch of fresh curd didn't set properly during a summer "
            "heatwave in 2018 — we considered scrapping it. Instead we left it wrapped in cloth on a wooden "
            "board and checked it a week later. What had developed was a soft, bloomy rind with a flavour "
            "none of us expected. We've been making it deliberately ever since. Sometimes the best things "
            "aren't planned."
        ),
        "days_ago": 30,
    },
    # Avon Valley Bakery
    {
        "producer": "avon_bakery",
        "title": "Why 48-Hour Fermentation Changes Everything",
        "body": (
            "We don't add yeast to our sourdough. A 48-hour cold ferment with our in-house starter — "
            "which we've been feeding daily since 2015 — does all the work. The long ferment pre-digests "
            "the gluten, develops complex organic acids, and gives the dough its characteristic spring. "
            "You can taste the difference. Faster bread fills you up; our bread keeps you satisfied. "
            "There are no shortcuts worth taking in this bakery."
        ),
        "days_ago": 250,
    },
    {
        "producer": "avon_bakery",
        "title": "A Morning in the Bakery — 3 am to 8 am",
        "body": (
            "The alarm goes at 3 am. By 3:30 I'm shaping the doughs that were retarded overnight. "
            "The oven goes on at 4 — it takes a full hour to reach 260°C. First loaves in at 5, "
            "croissants at 6. By 7 the shop smells like the best version of every morning you've ever had. "
            "We open at 8. Most days everything is sold by 11. The day shift cleans up, preps the next "
            "day's doughs, and I'm asleep by 2 pm. I wouldn't change any of it."
        ),
        "days_ago": 95,
    },
    {
        "producer": "avon_bakery",
        "title": "Shipton Mill and Why the Flour Matters",
        "body": (
            "We've sourced our flour exclusively from Shipton Mill in Tetbury since we opened. "
            "Stoneground milling retains the germ and bran, which means more nutrients, more flavour "
            "and a flour that behaves differently in your hands. It absorbs water differently, ferments "
            "faster, and browns at a lower temperature. Learning to bake with it took months. "
            "Now I couldn't imagine using anything else."
        ),
        "days_ago": 14,
    },
    # Somerset Meats
    {
        "producer": "somerset_meats",
        "title": "Knowing Every Farm by Name",
        "body": (
            "We work with seven farms in Somerset, and I know the name of every farmer. "
            "That's not a marketing line — it's how we guarantee what we're selling. When a customer "
            "asks me where their lamb came from, I can tell them: Lower Pitney Farm, near Langport, "
            "Richard and Carol Trevelyan. The animals graze permanent pasture. Nothing is imported. "
            "Nothing is bought at an auction mart. Traceability isn't a feature — it's the whole point."
        ),
        "days_ago": 310,
    },
    {
        "producer": "somerset_meats",
        "title": "The Case for Slow-Grown Chicken",
        "body": (
            "Our free-range chickens take 81 days to reach table weight. Supermarket birds are typically "
            "slaughtered at 35. The difference is enormous — in flavour, texture and welfare. Slow-grown "
            "birds develop real muscle, which means the meat holds its shape when cooked, doesn't shrink "
            "drastically, and actually tastes of chicken. We know this makes our prices higher. "
            "We think it's worth it, and so do most of our customers."
        ),
        "days_ago": 140,
    },
    {
        "producer": "somerset_meats",
        "title": "Dry Curing vs Wet Curing — What's in Your Bacon?",
        "body": (
            "Most commercial bacon is wet-cured: the pig is injected with a brine solution, sometimes "
            "with added polyphosphates to retain water. When you fry it, that white liquid is water "
            "leaving the pan. Our back bacon is dry-cured in sea salt and sugar over five days. "
            "No injection, no added water. What you see is what you're paying for: pork and salt. "
            "It takes longer, costs more, and tastes completely different."
        ),
        "days_ago": 22,
    },
    # Clifton Drinks
    {
        "producer": "clifton_drinks",
        "title": "Cold Pressing vs Pasteurisation",
        "body": (
            "Our apple juice is cold-pressed and lightly pasteurised at a low temperature — "
            "68°C for 15 seconds rather than the industry standard of 85°C for a minute. "
            "High-temperature pasteurisation destroys delicate aromatic compounds that give "
            "fresh juice its brightness. We sacrifice a little shelf life for a lot of flavour. "
            "Our juice lasts three weeks refrigerated. Supermarket juice lasts six months. "
            "That tells you something about what's left in it."
        ),
        "days_ago": 280,
    },
    {
        "producer": "clifton_drinks",
        "title": "Brewing Our First Craft Ale",
        "body": (
            "We started as a soft drinks company. The ale was a lockdown project — my partner and I "
            "bought a 50-litre home-brew kit and started experimenting. After about thirty batches we "
            "had something we were proud of: a 4.2% pale ale with Cascade and Mosaic hops, bright, "
            "citrus-forward and clean on the finish. We scaled up to a 500-litre system last year. "
            "We still use the same recipe. Batch 31 is the one we sell."
        ),
        "days_ago": 110,
    },
    {
        "producer": "clifton_drinks",
        "title": "Elderflower Season: A Two-Week Window",
        "body": (
            "Elderflower comes and goes in about two weeks in late May. Too early and the flowers are "
            "too green and bitter; too late and they're past their peak and can smell of cat. "
            "We spend the first two weeks of June driving the lanes around North Somerset with "
            "stepladders and buckets, picking by hand. A kilo of heads goes into every ten litres of "
            "cordial. Once the season's done, that's it until next year — we don't extend it artificially."
        ),
        "days_ago": 18,
    },
    # Barton Farm — additional
    {
        "producer": "barton_farm",
        "title": "Composting: Turning Waste Into Soil Wealth",
        "body": (
            "Everything that comes off the farm goes back onto it. Kitchen scraps, crop residues, "
            "spent compost from the polytunnels — it all goes into our windrow heaps and turns over "
            "for six months before we spread it. We haven't bought a bag of fertiliser in eight years. "
            "The earthworm count in our top field has quadrupled since we started. Soil biology is the "
            "whole game — once you understand that, everything else follows."
        ),
        "days_ago": 70,
    },
    # Bristol Cheese — additional
    {
        "producer": "bristol_cheese",
        "title": "The Art of Washing a Rind",
        "body": (
            "Our Bristol Brie has a washed rind — we brush it weekly with a light brine solution "
            "during maturation. The salt draws out moisture, and the humidity in our cellar encourages "
            "a specific Brevibacterium linens culture to bloom on the surface. That's what gives "
            "washed-rind cheeses their distinctive peachy hue and complex, slightly pungent aroma. "
            "It looks simple. It takes years to get consistently right."
        ),
        "days_ago": 55,
    },
    # Avon Valley Bakery — additional
    {
        "producer": "avon_bakery",
        "title": "Why We Switched to Organic Butter",
        "body": (
            "For the first two years we used conventional butter for our croissants. The cost difference "
            "to organic is significant, and in a thin-margin business that matters. But when we did a "
            "blind tasting with organic butter from a Somerset dairy, the difference was immediately "
            "obvious — a cleaner, creamier flavour with better lamination quality. We made the switch "
            "in 2021 and haven't looked back. Some costs are worth absorbing."
        ),
        "days_ago": 40,
    },
    # Somerset Meats — additional
    {
        "producer": "somerset_meats",
        "title": "Understanding Dry Ageing",
        "body": (
            "Our ribeye steaks are hung in a temperature-controlled dry-age cabinet for 28 days. "
            "During this time two things happen: moisture evaporates (concentrating the flavour) "
            "and natural enzymes break down muscle fibres (improving tenderness). You lose 20-25% "
            "of the original weight to evaporation and trimming, which is why dry-aged beef costs more. "
            "But a properly aged ribeye from a well-reared Somerset animal is, we think, one of the "
            "finest things you can eat."
        ),
        "days_ago": 35,
    },
    # Clifton Drinks — additional
    {
        "producer": "clifton_drinks",
        "title": "Growing Our Own Kombucha Culture",
        "body": (
            "Our kombucha SCOBY (symbiotic culture of bacteria and yeast) is five years old. "
            "We started it from scratch in a kilner jar in 2020 and have been feeding it every "
            "two weeks ever since. The culture produces a kombucha that's distinctly ours — "
            "a balance of acetic and lactic acid with a clean finish. We've never bought a starter "
            "culture. Growing your own takes patience, but the result has a character that "
            "you can't replicate from a commercial sachet."
        ),
        "days_ago": 28,
    },
    # Hartcliffe Honey — additional
    {
        "producer": "hartcliffe_honey",
        "title": "Chilli Jam: From Bristol Garden to Jar",
        "body": (
            "The chillies in our Chilli Jam come from two allotment plots on the same site as our hives. "
            "We grow cayenne and Hungarian Hot Wax — enough for about 300 jars per year. "
            "Combined with our own wildflower honey and Granny Smith apples for pectin, "
            "the result is a jam that balances genuine heat with a floral sweetness you don't "
            "get when you use sugar instead. Very limited quantity each autumn — we sell out fast."
        ),
        "days_ago": 8,
    },
    # Hartcliffe Honey
    {
        "producer": "hartcliffe_honey",
        "title": "Urban Beekeeping in Bristol",
        "body": (
            "People are often surprised that we keep hives in the city. Urban bees, it turns out, "
            "often outperform rural ones — because city green spaces offer incredible floral diversity. "
            "Our Hartcliffe hives forage across allotments, parks, private gardens and the nearby "
            "nature reserve. The result is a wildflower honey that changes character subtly each year "
            "depending on what's in bloom. We think that's a feature, not a bug."
        ),
        "days_ago": 320,
    },
    {
        "producer": "hartcliffe_honey",
        "title": "Why We Don't Heat Our Honey",
        "body": (
            "Most commercial honey is heated to 70°C+ to prevent crystallisation and extend shelf life. "
            "This process destroys the enzymes, antioxidants and aromatic compounds that make raw honey "
            "nutritionally and flavourally interesting. Our honey is extracted cold, strained through "
            "mesh (not filtered), and jarred within 24 hours. It will crystallise — that's normal and "
            "reversible with gentle warmth. It's also proof that it's real."
        ),
        "days_ago": 160,
    },
    {
        "producer": "hartcliffe_honey",
        "title": "Making Seville Marmalade in January",
        "body": (
            "Seville oranges are available for about six weeks in January and February. "
            "We buy in bulk at peak ripeness and spend two solid weeks making marmalade — "
            "it's essentially our whole January. The pith is thick and pithy, the juice sour enough "
            "to make you wince, which is exactly what you need for a marmalade that balances against "
            "the sugar. We make it once a year. When it's gone, it's gone until next winter."
        ),
        "days_ago": 15,
    },
]

# ── Recipes ──────────────────────────────────────────────────────────────────

RECIPES = [
    {
        "producer": "barton_farm",
        "title": "Roasted Heritage Tomato Soup",
        "description": "A deeply flavoured late-summer soup that celebrates our heritage tomato harvest.",
        "ingredients": "1 kg Heritage Tomatoes\n1 head garlic (halved)\n2 tbsp olive oil\n1 large onion (diced)\n500 ml vegetable stock\nFresh basil\nSalt & pepper",
        "instructions": "1. Halve tomatoes, place cut-side up with garlic on a tray. Drizzle with oil, roast at 200°C for 40 min.\n2. Sweat onion in a large pot until soft (10 min).\n3. Add roasted tomatoes (squeeze garlic from skins), stock and basil.\n4. Simmer 15 min, then blend until smooth. Season and serve.",
        "seasonal_tag": "summer",
        "products": ["Heritage Tomatoes"],
        "days_ago": 180,
    },
    {
        "producer": "barton_farm",
        "title": "Autumn Kale & Apple Salad",
        "description": "A hearty seasonal salad that pairs the bitterness of kale with sweet Cox apples and a honey dressing.",
        "ingredients": "200 g Curly Kale (stems removed, torn)\n2 Cox Apples (thinly sliced)\n50 g walnuts (toasted)\n50 g aged cheese\nDressing: 2 tbsp apple cider vinegar, 1 tbsp honey, 3 tbsp olive oil, salt & pepper",
        "instructions": "1. Massage kale with a pinch of salt for 2 min until softened.\n2. Whisk dressing ingredients together.\n3. Toss kale with dressing, then add apple slices and walnuts.\n4. Finish with shavings of aged cheese.",
        "seasonal_tag": "autumn",
        "products": ["Curly Kale", "Cox Apples"],
        "days_ago": 90,
    },
    {
        "producer": "barton_farm",
        "title": "Simple Carrot & Ginger Soup",
        "description": "A warming everyday soup using our organic carrots.",
        "ingredients": "600 g Organic Carrots (peeled, chopped)\n1 onion (diced)\n3 cm fresh ginger (grated)\n1 litre vegetable stock\n1 tbsp olive oil\nSalt & pepper",
        "instructions": "1. Soften onion and ginger in oil over medium heat (8 min).\n2. Add carrots and stock, bring to boil then simmer 25 min.\n3. Blend until smooth. Season to taste.",
        "seasonal_tag": "all_year",
        "products": ["Organic Carrots"],
        "days_ago": 30,
    },
    {
        "producer": "bristol_cheese",
        "title": "Classic Welsh Rarebit",
        "description": "Our Vintage Cheddar melted into a rich, mustard-spiked sauce spooned over toasted bread.",
        "ingredients": "200 g Vintage Cheddar (grated)\n2 tbsp Unsalted Butter\n1 tbsp plain flour\n100 ml stout\n1 tsp English mustard\nWorcestershire sauce\n4 slices thick bread",
        "instructions": "1. Melt butter in a saucepan, stir in flour and cook 1 min.\n2. Gradually add stout, stirring until thick and smooth.\n3. Remove from heat, stir in cheese, mustard and a dash of Worcestershire.\n4. Toast bread, spoon rarebit on top, grill 3-4 min until bubbling and golden.",
        "seasonal_tag": "all_year",
        "products": ["Vintage Cheddar", "Unsalted Butter"],
        "days_ago": 200,
    },
    {
        "producer": "bristol_cheese",
        "title": "Lemon Posset with Bristol Cream",
        "description": "A three-ingredient set cream dessert — impossibly simple, impossibly good.",
        "ingredients": "600 ml Double Cream\n150 g caster sugar\nJuice of 3 lemons",
        "instructions": "1. Heat cream and sugar in a saucepan, stirring until sugar dissolves.\n2. Bring to a gentle boil for exactly 3 minutes.\n3. Remove from heat and stir in lemon juice.\n4. Pour into serving glasses and refrigerate at least 4 hours until set.",
        "seasonal_tag": "spring_summer",
        "products": ["Double Cream"],
        "days_ago": 60,
    },
    {
        "producer": "avon_bakery",
        "title": "Sourdough French Toast",
        "description": "Day-old sourdough makes an extraordinary French toast — the acidity cuts through the custard perfectly.",
        "ingredients": "4 thick slices Sourdough Loaf (day-old)\n3 eggs\n150 ml whole milk\n1 tsp vanilla extract\n1 tbsp caster sugar\nButter for frying\nMaple syrup to serve",
        "instructions": "1. Whisk eggs, milk, vanilla and sugar together in a shallow bowl.\n2. Soak sourdough slices for 30 seconds each side.\n3. Fry in a buttered pan over medium heat, 3-4 min per side, until golden.\n4. Serve with maple syrup and fresh berries.",
        "seasonal_tag": "all_year",
        "products": ["Sourdough Loaf"],
        "days_ago": 120,
    },
    {
        "producer": "avon_bakery",
        "title": "Focaccia Panzanella",
        "description": "A Tuscan bread salad reimagined with our olive-oil focaccia as the base.",
        "ingredients": "1 Focaccia (torn into chunks, day-old)\n4 ripe tomatoes (roughly chopped)\n1 cucumber (diced)\n1 red onion (thinly sliced)\nFresh basil\nDressing: 3 tbsp red wine vinegar, 5 tbsp olive oil, salt & pepper",
        "instructions": "1. If using fresh focaccia, lightly toast the chunks in the oven at 180°C for 10 min.\n2. Combine tomatoes, cucumber and onion in a large bowl.\n3. Whisk dressing and pour over vegetables. Leave 10 min.\n4. Add focaccia chunks and torn basil, toss and serve immediately.",
        "seasonal_tag": "summer",
        "products": ["Focaccia"],
        "days_ago": 55,
    },
    {
        "producer": "somerset_meats",
        "title": "One-Tray Roast Chicken Thighs with Root Veg",
        "description": "A simple weeknight supper showcasing our free-range thighs at their best.",
        "ingredients": "4 Free-Range Chicken Thighs\n500 g New Potatoes (halved)\n3 Organic Carrots (cut into batons)\n1 head garlic (halved)\n2 tbsp olive oil\nFresh thyme\nSalt & pepper",
        "instructions": "1. Preheat oven to 200°C. Toss potatoes and carrots with oil, thyme, salt and garlic on a large tray.\n2. Nestle chicken thighs skin-side up on top. Season generously.\n3. Roast 45-50 min until skin is deep golden and juices run clear.",
        "seasonal_tag": "all_year",
        "products": ["Free-Range Chicken Thighs", "New Potatoes", "Organic Carrots"],
        "days_ago": 150,
    },
    {
        "producer": "somerset_meats",
        "title": "Pork Sausage & White Bean Stew",
        "description": "A hearty, one-pot stew that makes six generous servings. Better the next day.",
        "ingredients": "6 Pork Sausages\n2 tins white beans (drained)\n1 tin chopped tomatoes\n2 cloves garlic\n1 onion (diced)\n1 tbsp olive oil\nFresh parsley\nPinch of chilli flakes",
        "instructions": "1. Brown sausages in oil over medium-high heat. Remove and slice thickly.\n2. In the same pan, soften onion and garlic (8 min).\n3. Add tomatoes, beans, chilli and 200 ml water. Stir well.\n4. Return sausages, simmer 25 min. Finish with fresh parsley.",
        "seasonal_tag": "autumn_winter",
        "products": ["Pork Sausages"],
        "days_ago": 40,
    },
    {
        "producer": "clifton_drinks",
        "title": "Elderflower & Strawberry Fizz",
        "description": "A beautiful non-alcoholic summer punch using our cordial and seasonal strawberries.",
        "ingredients": "60 ml Elderflower Cordial\n500 ml sparkling water (chilled)\n8-10 strawberries (hulled, halved)\nFresh mint\nIce",
        "instructions": "1. Muddle 4 strawberries in the base of a large jug.\n2. Add ice, cordial and sparkling water.\n3. Stir gently and garnish with remaining strawberries and mint.\n4. Serve immediately.",
        "seasonal_tag": "spring_summer",
        "products": ["Elderflower Cordial"],
        "days_ago": 80,
    },
    {
        "producer": "clifton_drinks",
        "title": "Craft Ale Battered Fish",
        "description": "A proper fish batter made with our Bristol Craft Ale — light, crisp and golden.",
        "ingredients": "200 g plain flour\n200 ml Bristol Craft Ale (chilled)\n1 tsp baking powder\n500 g white fish fillets\nOil for deep frying\nSalt",
        "instructions": "1. Whisk flour, baking powder and a pinch of salt. Slowly pour in cold ale, whisking to a smooth batter.\n2. Rest 10 min in fridge.\n3. Heat oil to 180°C. Dip fish fillets in batter, shaking off excess.\n4. Fry 4-5 min until deeply golden. Drain on paper and season immediately.",
        "seasonal_tag": "all_year",
        "products": ["Bristol Craft Ale"],
        "days_ago": 25,
    },
    {
        "producer": "hartcliffe_honey",
        "title": "Honey & Lavender Shortbread",
        "description": "Melt-in-the-mouth shortbread sweetened with our lavender honey instead of sugar.",
        "ingredients": "200 g plain flour\n100 g Unsalted Butter (softened)\n3 tbsp Lavender Honey\nPinch of salt\n1 tsp dried lavender (food grade)",
        "instructions": "1. Beat butter and honey together until pale and creamy.\n2. Fold in flour, salt and lavender to form a stiff dough.\n3. Press into a lined tin, score into fingers. Chill 30 min.\n4. Bake at 160°C for 20-25 min until pale golden. Cool before breaking.",
        "seasonal_tag": "summer",
        "products": ["Lavender Honey"],
        "days_ago": 100,
    },
    {
        "producer": "hartcliffe_honey",
        "title": "Bramble & Apple Crumble",
        "description": "A celebration of autumn using our bramble jelly and barton farm's Cox apples.",
        "ingredients": "3 Cox Apples (peeled, cored, sliced)\n4 tbsp Bramble Jelly\n150 g plain flour\n75 g cold butter (cubed)\n75 g demerara sugar\n50 g rolled oats",
        "instructions": "1. Preheat oven to 190°C. Place apple slices in a baking dish and spoon over bramble jelly.\n2. Rub butter into flour until it resembles breadcrumbs. Stir in sugar and oats.\n3. Spread topping over fruit. Bake 35-40 min until topping is golden and fruit is bubbling.",
        "seasonal_tag": "autumn_winter",
        "products": ["Bramble Jelly"],
        "days_ago": 50,
    },
    {
        "producer": "barton_farm",
        "title": "Roasted Butternut Squash & Red Onion Tart",
        "description": "A golden, caramelised tart that makes the most of our autumn squash harvest.",
        "ingredients": "1 Butternut Squash (peeled, cubed)\n2 Red Onions (cut into wedges)\n3 tbsp olive oil\n1 sheet ready-roll puff pastry\n100 g soft goats cheese\nFresh thyme\nSalt & pepper",
        "instructions": "1. Preheat oven to 200°C. Toss squash and red onion with oil, thyme, salt and pepper. Roast 30 min until golden.\n2. Unroll pastry onto a lined baking tray. Score a 2 cm border around the edge.\n3. Spread goats cheese inside the border, top with roasted vegetables.\n4. Bake 20-25 min until pastry is deep golden and puffed at the edges.",
        "seasonal_tag": "autumn_winter",
        "products": ["Butternut Squash", "Red Onions"],
        "days_ago": 65,
    },
    {
        "producer": "bristol_cheese",
        "title": "Kefir Overnight Oats",
        "description": "A quick, probiotic-packed breakfast using our kefir in place of milk.",
        "ingredients": "80 g rolled oats\n200 ml Kefir\n1 tbsp honey\n1 tsp vanilla extract\nFresh fruit to serve",
        "instructions": "1. Combine oats, kefir, honey and vanilla in a jar or bowl.\n2. Stir well, cover and refrigerate overnight (at least 6 hours).\n3. In the morning, top with fresh berries, sliced banana or a spoonful of jam.\n4. Stir before eating — the oats will have absorbed the kefir and softened completely.",
        "seasonal_tag": "all_year",
        "products": ["Kefir"],
        "days_ago": 38,
    },
    {
        "producer": "somerset_meats",
        "title": "Slow-Roasted Lamb Shoulder with Garlic & Rosemary",
        "description": "The definitive Sunday roast. Low, slow, and utterly yielding.",
        "ingredients": "1 Lamb Shoulder (bone-in, ~1.5 kg)\n1 whole garlic bulb (cloves separated, peeled)\n4 sprigs fresh rosemary\n200 ml white wine\n200 ml chicken stock\n2 tbsp olive oil\nSalt & pepper",
        "instructions": "1. Preheat oven to 160°C. Make deep incisions across the lamb with a sharp knife.\n2. Push garlic cloves and rosemary sprigs into the incisions. Rub with olive oil, season generously.\n3. Place in a deep roasting tin. Pour wine and stock around (not over) the lamb. Cover tightly with foil.\n4. Roast 4.5 hours. Remove foil for final 30 min to brown. The meat should pull apart with a fork.",
        "seasonal_tag": "all_year",
        "products": ["Lamb Shoulder"],
        "days_ago": 22,
    },
    {
        "producer": "clifton_drinks",
        "title": "Ginger Beer Pulled Pork Buns",
        "description": "Our fiery ginger beer makes a brilliant braising liquid for slow-cooked pork.",
        "ingredients": "1 kg Pork Belly Slices (or shoulder)\n330 ml Ginger Beer\n3 tbsp soy sauce\n2 tbsp brown sugar\n3 cloves garlic (crushed)\n1 tsp five-spice\nBrioche buns to serve\nPickled slaw",
        "instructions": "1. Combine ginger beer, soy, sugar, garlic and five-spice in a slow cooker.\n2. Add pork, ensuring it is mostly submerged. Cook on low 7-8 hours.\n3. Remove pork and shred with two forks. Return to sauce and stir to coat.\n4. Serve piled into brioche buns with a tangy pickled slaw.",
        "seasonal_tag": "all_year",
        "products": ["Ginger Beer"],
        "days_ago": 12,
    },
]

# ── Seed Orders ───────────────────────────────────────────────────────────────
# Format: (customer_username, producer_username, [(product_name, qty),...], po_status, days_ago, delivery_days_or_None)
# po_status values: delivered, ready, preparing, accepted, pending, cancelled, rejected

SEED_ORDERS = [
    # ── 11-12 months ago — all delivered ────────────────────────────────────
    ("alice_bristol",    "barton_farm",     [("Organic Carrots", 3), ("New Potatoes", 4)],          "delivered", 340, 4),
    ("charlie_avon",     "bristol_cheese",  [("Whole Milk", 4), ("Vintage Cheddar", 1)],             "delivered", 335, 3),
    ("emma_clifton",     "somerset_meats",  [("Pork Sausages", 2), ("Back Bacon", 2)],               "delivered", 332, 4),
    ("james_redland",    "avon_bakery",     [("Sourdough Loaf", 2), ("Croissants", 1)],              "delivered", 328, 3),
    ("sarah_totterdown", "clifton_drinks",  [("Pressed Apple Juice", 3), ("Sparkling Lemonade", 4)], "delivered", 325, 4),
    ("oliver_stokes",    "hartcliffe_honey",[("Wildflower Honey", 2), ("Strawberry Jam", 2)],        "delivered", 320, 5),
    ("alice_bristol",    "somerset_meats",  [("Free-Range Chicken Thighs", 2), ("Beef Mince", 1)],   "delivered", 318, 4),
    ("charlie_avon",     "avon_bakery",     [("Focaccia", 2), ("Seeded Rye Loaf", 2)],               "delivered", 315, 3),
    ("emma_clifton",     "clifton_drinks",  [("Bristol Craft Ale", 6), ("Ginger Beer", 4)],          "delivered", 312, 4),
    ("james_redland",    "barton_farm",     [("Baby Spinach", 4), ("Tenderstem Broccoli", 3)],       "delivered", 308, 3),
    ("sarah_totterdown", "hartcliffe_honey",[("Set Honey", 2), ("Seville Orange Marmalade", 1)],     "delivered", 305, 5),
    ("oliver_stokes",    "bristol_cheese",  [("Greek-Style Yoghurt", 3), ("Double Cream", 2)],       "delivered", 302, 3),

    # ── 9-10 months ago ──────────────────────────────────────────────────────
    ("alice_bristol",    "avon_bakery",     [("Sourdough Loaf", 3), ("Pain au Chocolat", 1)],        "delivered", 295, 3),
    ("charlie_avon",     "barton_farm",     [("Leeks", 3), ("Curly Kale", 4)],                       "delivered", 290, 4),
    ("emma_clifton",     "bristol_cheese",  [("Unsalted Butter", 2), ("Crème Fraîche", 2)],          "delivered", 285, 3),
    ("james_redland",    "somerset_meats",  [("Lamb Chops", 2), ("Chicken Breast", 2)],              "delivered", 280, 4),
    ("sarah_totterdown", "clifton_drinks",  [("Elderflower Cordial", 2), ("Cold Brew Coffee", 3)],   "delivered", 275, 4),
    ("oliver_stokes",    "hartcliffe_honey",[("Bramble Jelly", 2), ("Lemon Curd", 3)],               "delivered", 270, 5),
    ("foodhub_bristol",  "barton_farm",     [("Organic Carrots", 10), ("Baby Spinach", 8), ("Courgettes", 6)], "delivered", 268, 4),
    ("harbourside_chef", "somerset_meats",  [("Beef Mince", 5), ("Pork Sausages", 4)],               "delivered", 265, 3),
    ("alice_bristol",    "clifton_drinks",  [("Pressed Apple Juice", 4), ("Tomato Juice", 2)],       "delivered", 262, 4),
    ("charlie_avon",     "hartcliffe_honey",[("Wildflower Honey", 3), ("Lavender Honey", 1)],        "delivered", 258, 5),
    ("emma_clifton",     "avon_bakery",     [("Cinnamon Rolls", 1), ("Wholemeal Farmhouse Loaf", 2)], "delivered", 255, 3),
    ("james_redland",    "bristol_cheese",  [("Bristol Brie", 2), ("Vintage Cheddar", 1)],           "delivered", 250, 3),

    # ── 7-8 months ago ──────────────────────────────────────────────────────
    ("sarah_totterdown", "barton_farm",     [("Heritage Tomatoes", 2), ("Raspberries", 3)],          "delivered", 245, 4),
    ("oliver_stokes",    "somerset_meats",  [("Pork Belly Slices", 2), ("Back Bacon", 2)],           "delivered", 240, 4),
    ("foodhub_bristol",  "avon_bakery",     [("Sourdough Loaf", 6), ("Focaccia", 4)],                "delivered", 237, 3),
    ("harbourside_chef", "bristol_cheese",  [("Double Cream", 4), ("Unsalted Butter", 3)],           "delivered", 232, 3),
    ("alice_bristol",    "hartcliffe_honey",[("Strawberry Jam", 2), ("Bramble Jelly", 1)],           "delivered", 228, 5),
    ("charlie_avon",     "clifton_drinks",  [("Bristol Craft Ale", 12), ("Sparkling Lemonade", 6)],  "delivered", 224, 4),
    ("emma_clifton",     "barton_farm",     [("Victoria Plums", 2), ("Cox Apples", 4)],              "delivered", 220, 4),
    ("james_redland",    "somerset_meats",  [("Free-Range Chicken Thighs", 3), ("Pork Sausages", 2)], "delivered", 215, 4),
    ("sarah_totterdown", "avon_bakery",     [("Croissants", 2), ("Seeded Rye Loaf", 2)],             "delivered", 210, 3),
    ("oliver_stokes",    "barton_farm",     [("New Potatoes", 5), ("Tenderstem Broccoli", 4)],       "delivered", 206, 4),
    ("harbourside_chef", "clifton_drinks",  [("Cold Brew Coffee", 6), ("Tomato Juice", 4)],          "delivered", 202, 4),

    # ── 5-6 months ago ──────────────────────────────────────────────────────
    ("alice_bristol",    "somerset_meats",  [("Lamb Chops", 2), ("Beef Mince", 2)],                  "delivered", 185, 4),
    ("charlie_avon",     "bristol_cheese",  [("Whole Milk", 6), ("Greek-Style Yoghurt", 4)],         "delivered", 180, 3),
    ("emma_clifton",     "hartcliffe_honey",[("Lavender Honey", 2), ("Set Honey", 2)],               "delivered", 176, 5),
    ("james_redland",    "avon_bakery",     [("Sourdough Loaf", 3), ("Focaccia", 2)],                "delivered", 172, 3),
    ("sarah_totterdown", "barton_farm",     [("Organic Carrots", 6), ("Leeks", 4)],                  "delivered", 168, 4),
    ("oliver_stokes",    "clifton_drinks",  [("Pressed Apple Juice", 6), ("Ginger Beer", 4)],        "delivered", 164, 4),
    ("foodhub_bristol",  "somerset_meats",  [("Free-Range Chicken Thighs", 8), ("Chicken Breast", 5)], "delivered", 160, 4),
    ("harbourside_chef", "avon_bakery",     [("Croissants", 4), ("Cinnamon Rolls", 2), ("Pain au Chocolat", 2)], "delivered", 157, 3),
    ("alice_bristol",    "barton_farm",     [("Baby Spinach", 4), ("Curly Kale", 3)],                "delivered", 154, 4),
    ("charlie_avon",     "hartcliffe_honey",[("Seville Orange Marmalade", 2), ("Lemon Curd", 2)],    "delivered", 150, 5),
    ("emma_clifton",     "somerset_meats",  [("Pork Belly Slices", 3), ("Back Bacon", 3)],           "delivered", 145, 4),
    ("james_redland",    "clifton_drinks",  [("Elderflower Cordial", 3), ("Sparkling Lemonade", 6)], "delivered", 140, 4),

    # ── 3-4 months ago — mix of delivered and cancelled ──────────────────────
    ("sarah_totterdown", "bristol_cheese",  [("Vintage Cheddar", 2), ("Unsalted Butter", 1)],        "delivered", 125, 3),
    ("oliver_stokes",    "avon_bakery",     [("Sourdough Loaf", 4), ("Wholemeal Farmhouse Loaf", 2)], "delivered", 120, 3),
    ("alice_bristol",    "clifton_drinks",  [("Bristol Craft Ale", 6), ("Cold Brew Coffee", 4)],     "delivered", 116, 4),
    ("charlie_avon",     "barton_farm",     [("Heritage Tomatoes", 3), ("Courgettes", 4)],           "delivered", 112, 4),
    ("emma_clifton",     "bristol_cheese",  [("Bristol Brie", 1), ("Crème Fraîche", 3)],             "delivered", 108, 3),
    ("james_redland",    "hartcliffe_honey",[("Wildflower Honey", 4), ("Strawberry Jam", 3)],        "delivered", 104, 5),
    ("sarah_totterdown", "somerset_meats",  [("Chicken Breast", 3), ("Pork Sausages", 3)],           "delivered", 100, 4),
    ("oliver_stokes",    "barton_farm",     [("Rhubarb", 3), ("Raspberries", 2)],                    "delivered", 96, 4),
    ("foodhub_bristol",  "barton_farm",     [("Organic Carrots", 12), ("New Potatoes", 10), ("Leeks", 8)], "delivered", 93, 4),
    ("harbourside_chef", "bristol_cheese",  [("Double Cream", 6), ("Crème Fraîche", 4)],             "delivered", 90, 3),
    # cancelled
    ("alice_bristol",    "somerset_meats",  [("Beef Mince", 3)],                                     "cancelled", 118, None),
    ("charlie_avon",     "clifton_drinks",  [("Tomato Juice", 4)],                                   "cancelled", 95, None),

    # ── 1-2 months ago ──────────────────────────────────────────────────────
    ("alice_bristol",    "avon_bakery",     [("Croissants", 2), ("Pain au Chocolat", 1)],            "delivered", 55, 3),
    ("charlie_avon",     "somerset_meats",  [("Lamb Chops", 2), ("Pork Belly Slices", 2)],           "delivered", 50, 4),
    ("emma_clifton",     "barton_farm",     [("New Potatoes", 5), ("Baby Spinach", 3)],              "delivered", 46, 4),
    ("james_redland",    "clifton_drinks",  [("Pressed Apple Juice", 4), ("Ginger Beer", 6)],        "delivered", 42, 4),
    ("sarah_totterdown", "hartcliffe_honey",[("Bramble Jelly", 2), ("Lavender Honey", 1)],           "delivered", 38, 5),
    ("oliver_stokes",    "bristol_cheese",  [("Vintage Cheddar", 2), ("Whole Milk", 4)],             "delivered", 34, 3),
    ("foodhub_bristol",  "avon_bakery",     [("Sourdough Loaf", 8), ("Seeded Rye Loaf", 6), ("Focaccia", 4)], "delivered", 32, 3),
    ("harbourside_chef", "barton_farm",     [("Heritage Tomatoes", 4), ("Courgettes", 5), ("Leeks", 3)], "delivered", 29, 4),
    ("alice_bristol",    "hartcliffe_honey",[("Wildflower Honey", 2), ("Lemon Curd", 2)],            "delivered", 25, 5),
    ("charlie_avon",     "avon_bakery",     [("Sourdough Loaf", 2), ("Cinnamon Rolls", 1)],          "delivered", 22, 3),
    # rejected
    ("emma_clifton",     "somerset_meats",  [("Pork Belly Slices", 4)],                              "rejected",  35, None),

    # ── 2-3 weeks ago — ready and preparing ──────────────────────────────────
    ("james_redland",    "barton_farm",     [("Organic Carrots", 4), ("Tenderstem Broccoli", 3)],    "ready",     14, None),
    ("sarah_totterdown", "bristol_cheese",  [("Greek-Style Yoghurt", 4), ("Whole Milk", 6)],         "ready",     13, None),
    ("oliver_stokes",    "somerset_meats",  [("Free-Range Chicken Thighs", 3), ("Back Bacon", 2)],   "ready",     12, None),
    ("alice_bristol",    "clifton_drinks",  [("Bristol Craft Ale", 8), ("Sparkling Lemonade", 6)],   "preparing", 12, None),
    ("charlie_avon",     "hartcliffe_honey",[("Set Honey", 2), ("Strawberry Jam", 2)],               "preparing", 11, None),
    ("emma_clifton",     "avon_bakery",     [("Sourdough Loaf", 3), ("Wholemeal Farmhouse Loaf", 2)], "preparing", 10, None),
    ("foodhub_bristol",  "hartcliffe_honey",[("Wildflower Honey", 6), ("Bramble Jelly", 4)],         "ready",     10, None),
    ("harbourside_chef", "somerset_meats",  [("Beef Mince", 6), ("Chicken Breast", 4)],              "preparing", 9, None),

    # ── Last week — accepted ──────────────────────────────────────────────────
    ("james_redland",    "clifton_drinks",  [("Pressed Apple Juice", 6), ("Cold Brew Coffee", 4)],   "accepted",  7, None),
    ("sarah_totterdown", "avon_bakery",     [("Croissants", 2), ("Focaccia", 2)],                    "accepted",  6, None),
    ("oliver_stokes",    "barton_farm",     [("New Potatoes", 6), ("Leeks", 4)],                     "accepted",  5, None),
    ("alice_bristol",    "bristol_cheese",  [("Vintage Cheddar", 2), ("Unsalted Butter", 2)],        "accepted",  5, None),
    ("charlie_avon",     "somerset_meats",  [("Pork Sausages", 4), ("Pork Belly Slices", 2)],        "accepted",  4, None),
    ("harbourside_chef", "avon_bakery",     [("Sourdough Loaf", 10), ("Seeded Rye Loaf", 8)],        "accepted",  4, None),

    # ── Last few days — pending ──────────────────────────────────────────────
    ("emma_clifton",     "barton_farm",     [("Curly Kale", 4), ("Baby Spinach", 3)],                "pending",   3, None),
    ("james_redland",    "hartcliffe_honey",[("Lavender Honey", 2), ("Lemon Curd", 2)],              "pending",   3, None),
    ("sarah_totterdown", "clifton_drinks",  [("Ginger Beer", 6), ("Elderflower Cordial", 2)],        "pending",   2, None),
    ("oliver_stokes",    "avon_bakery",     [("Cinnamon Rolls", 2), ("Pain au Chocolat", 1)],        "pending",   2, None),
    ("alice_bristol",    "barton_farm",     [("Heritage Tomatoes", 3), ("Courgettes", 4)],           "pending",   1, None),
    ("charlie_avon",     "bristol_cheese",  [("Bristol Brie", 2), ("Double Cream", 2)],              "pending",   1, None),
    ("foodhub_bristol",  "barton_farm",     [("Organic Carrots", 15), ("New Potatoes", 12), ("Tenderstem Broccoli", 8)], "pending", 1, None),

    # ── New customers — historical orders spread across the year ──────────────
    # lucy_bishopston
    ("lucy_bishopston",  "avon_bakery",     [("Sourdough Loaf", 2), ("Wholemeal Farmhouse Loaf", 1)], "delivered", 330, 3),
    ("lucy_bishopston",  "hartcliffe_honey",[("Wildflower Honey", 1), ("Lemon Curd", 2)],            "delivered", 310, 5),
    ("lucy_bishopston",  "barton_farm",     [("Organic Carrots", 4), ("Baby Spinach", 3), ("Beetroot", 2)], "delivered", 285, 4),
    ("lucy_bishopston",  "bristol_cheese",  [("Greek-Style Yoghurt", 3), ("Kefir", 2)],              "delivered", 260, 3),
    ("lucy_bishopston",  "clifton_drinks",  [("Pressed Apple Juice", 4), ("Elderflower Cordial", 1)], "delivered", 230, 4),
    ("lucy_bishopston",  "somerset_meats",  [("Pork Sausages", 2), ("Chicken Breast", 2)],            "delivered", 200, 4),
    ("lucy_bishopston",  "avon_bakery",     [("Croissants", 1), ("Brioche Loaf", 1)],                "delivered", 165, 3),
    ("lucy_bishopston",  "barton_farm",     [("Butternut Squash", 2), ("Leeks", 3), ("Parsnips", 2)], "delivered", 130, 4),
    ("lucy_bishopston",  "hartcliffe_honey",[("Bramble Jelly", 2), ("Chilli Jam", 1)],               "delivered", 95, 5),
    ("lucy_bishopston",  "bristol_cheese",  [("Vintage Cheddar", 1), ("Unsalted Butter", 2)],         "delivered", 62, 3),
    ("lucy_bishopston",  "clifton_drinks",  [("Ginger Beer", 4), ("Kombucha Original", 3)],           "delivered", 30, 4),
    ("lucy_bishopston",  "barton_farm",     [("Mixed Salad Leaves", 3), ("Spring Onions", 2)],        "accepted",  5, None),

    # raj_easton
    ("raj_easton",       "barton_farm",     [("New Potatoes", 5), ("Red Onions", 3), ("Garlic", 4)],  "delivered", 345, 4),
    ("raj_easton",       "somerset_meats",  [("Lamb Chops", 2), ("Lamb Mince", 2)],                   "delivered", 320, 4),
    ("raj_easton",       "clifton_drinks",  [("Tomato Juice", 3), ("Ginger Beer", 4)],                "delivered", 298, 4),
    ("raj_easton",       "hartcliffe_honey",[("Chilli Jam", 2), ("Wildflower Honey", 1)],             "delivered", 272, 5),
    ("raj_easton",       "avon_bakery",     [("Seeded Rye Loaf", 2), ("Everything Bagels", 2)],       "delivered", 244, 3),
    ("raj_easton",       "bristol_cheese",  [("Whole Milk", 6), ("Natural Yoghurt", 4)],              "delivered", 218, 3),
    ("raj_easton",       "barton_farm",     [("Organic Carrots", 6), ("Sweet Potatoes", 4), ("Courgettes", 3)], "delivered", 190, 4),
    ("raj_easton",       "somerset_meats",  [("Beef Mince", 3), ("Back Bacon", 2)],                   "delivered", 158, 4),
    ("raj_easton",       "clifton_drinks",  [("Pressed Apple Juice", 5), ("Blood Orange Juice", 2)],  "delivered", 122, 4),
    ("raj_easton",       "avon_bakery",     [("Focaccia", 2), ("Spelt Loaf", 1)],                    "delivered", 85, 3),
    ("raj_easton",       "barton_farm",     [("Cavolo Nero", 3), ("Beetroot", 3)],                    "delivered", 48, 4),
    ("raj_easton",       "somerset_meats",  [("Duck Breast", 2), ("Pork Ribs", 1)],                   "delivered", 18, 4),
    ("raj_easton",       "hartcliffe_honey",[("Acacia Honey", 1), ("Ginger & Lemon Preserve", 2)],    "preparing", 8, None),
    ("raj_easton",       "avon_bakery",     [("Sourdough Loaf", 2), ("Danish Pastries", 1)],          "pending",   2, None),

    # ── Extra cross-section orders to sharpen CF signals ─────────────────────
    # alice: heavily organic-veg + honey; never buys meat
    ("alice_bristol",   "barton_farm",     [("Mixed Salad Leaves", 4), ("Spring Onions", 3), ("Organic Eggs", 2)],   "delivered", 72, 3),
    ("alice_bristol",   "hartcliffe_honey",[("Lemon Curd", 3), ("Set Honey", 1)],                                    "delivered", 58, 5),
    ("alice_bristol",   "clifton_drinks",  [("Kombucha Original", 2), ("Elderflower Cordial", 2)],                   "delivered", 43, 4),

    # charlie: dairy heavy; lots of ale; never buys veg alone
    ("charlie_avon",    "bristol_cheese",  [("Smoked Cheddar", 2), ("Bristol Blue", 1), ("Kefir", 3)],               "delivered", 76, 3),
    ("charlie_avon",    "clifton_drinks",  [("Dark Porter", 6), ("Bristol Craft Ale", 6)],                           "delivered", 61, 4),
    ("charlie_avon",    "somerset_meats",  [("Pork & Apple Sausages", 3), ("Streaky Bacon", 2)],                     "delivered", 44, 4),

    # emma: bakery + dairy + botanicals; no meat
    ("emma_clifton",    "avon_bakery",     [("Danish Pastries", 1), ("Pain au Chocolat", 1), ("Brioche Loaf", 1)],   "delivered", 78, 3),
    ("emma_clifton",    "bristol_cheese",  [("Clotted Cream", 2), ("Natural Yoghurt", 3)],                           "delivered", 60, 3),
    ("emma_clifton",    "clifton_drinks",  [("Raspberry Lemonade", 4), ("Elderflower Cordial", 2)],                  "delivered", 41, 4),

    # james: premium meat + artisan bread; occasional honey
    ("james_redland",   "somerset_meats",  [("Beef Ribeye Steaks", 2), ("Gammon Joint", 1)],                         "delivered", 74, 4),
    ("james_redland",   "avon_bakery",     [("Spelt Loaf", 2), ("Everything Bagels", 1)],                            "delivered", 58, 3),
    ("james_redland",   "hartcliffe_honey",[("Acacia Honey", 1), ("Heather Honey", 1)],                              "delivered", 39, 5),

    # sarah: sweet tooth — bakery + jams + cream; minimal meat
    ("sarah_totterdown","avon_bakery",     [("Danish Pastries", 2), ("Malt Loaf", 2), ("Farmhouse Scones", 1)],      "delivered", 77, 3),
    ("sarah_totterdown","hartcliffe_honey",[("Blackcurrant Jam", 2), ("Strawberry Jam", 2)],                         "delivered", 62, 5),
    ("sarah_totterdown","bristol_cheese",  [("Clotted Cream", 2), ("Double Cream", 2)],                              "delivered", 45, 3),

    # oliver: niche premium — heritage veg + cold brew + fine honey; no bulk items
    ("oliver_stokes",   "barton_farm",     [("Heritage Tomatoes", 2), ("Cavolo Nero", 2)],                           "delivered", 80, 4),
    ("oliver_stokes",   "hartcliffe_honey",[("Heather Honey", 1), ("Honeycomb", 1)],                                 "delivered", 63, 5),
    ("oliver_stokes",   "clifton_drinks",  [("Cold Brew Coffee", 4), ("Dark Porter", 4)],                            "delivered", 45, 4),

    # lucy: fermented / probiotic; light bakery; seasonal produce
    ("lucy_bishopston", "bristol_cheese",  [("Kefir", 3), ("Natural Yoghurt", 2)],                                   "delivered", 82, 3),
    ("lucy_bishopston", "clifton_drinks",  [("Kombucha Original", 4), ("Blood Orange Juice", 2)],                    "delivered", 67, 4),
    ("lucy_bishopston", "hartcliffe_honey",[("Acacia Honey", 1), ("Lavender Honey", 1)],                             "delivered", 50, 5),

    # raj: lamb / spice / complex; bagels; dark drinks
    ("raj_easton",      "somerset_meats",  [("Lamb Mince", 3), ("Duck Breast", 2), ("Pork Ribs", 1)],                "delivered", 84, 4),
    ("raj_easton",      "clifton_drinks",  [("Dark Porter", 4), ("Ginger Beer", 6)],                                 "delivered", 68, 4),
    ("raj_easton",      "hartcliffe_honey",[("Chilli Jam", 2), ("Ginger & Lemon Preserve", 2)],                      "delivered", 51, 5),

    # fareshare_bristol — bulk orders
    ("fareshare_bristol","barton_farm",     [("Organic Carrots", 20), ("New Potatoes", 15), ("Baby Spinach", 10)], "delivered", 355, 4),
    ("fareshare_bristol","somerset_meats",  [("Pork Sausages", 10), ("Chicken Breast", 8)],            "delivered", 335, 4),
    ("fareshare_bristol","avon_bakery",     [("Sourdough Loaf", 12), ("Wholemeal Farmhouse Loaf", 10)], "delivered", 315, 3),
    ("fareshare_bristol","barton_farm",     [("Leeks", 12), ("Butternut Squash", 10), ("Parsnips", 10)], "delivered", 290, 4),
    ("fareshare_bristol","bristol_cheese",  [("Whole Milk", 20), ("Unsalted Butter", 8)],              "delivered", 265, 3),
    ("fareshare_bristol","hartcliffe_honey",[("Wildflower Honey", 8), ("Strawberry Jam", 10)],         "delivered", 240, 5),
    ("fareshare_bristol","barton_farm",     [("Organic Carrots", 25), ("New Potatoes", 20), ("Baby Spinach", 12)], "delivered", 215, 4),
    ("fareshare_bristol","somerset_meats",  [("Beef Mince", 8), ("Pork Sausages", 10)],                "delivered", 190, 4),
    ("fareshare_bristol","avon_bakery",     [("Sourdough Loaf", 15), ("Seeded Rye Loaf", 8)],          "delivered", 165, 3),
    ("fareshare_bristol","barton_farm",     [("Beetroot", 10), ("Sweet Potatoes", 12), ("Red Onions", 10)], "delivered", 140, 4),
    ("fareshare_bristol","clifton_drinks",  [("Pressed Apple Juice", 12), ("Sparkling Lemonade", 10)], "delivered", 115, 4),
    ("fareshare_bristol","barton_farm",     [("Organic Carrots", 20), ("Tenderstem Broccoli", 10), ("Curly Kale", 8)], "delivered", 88, 4),
    ("fareshare_bristol","bristol_cheese",  [("Whole Milk", 24), ("Greek-Style Yoghurt", 12)],         "delivered", 62, 3),
    ("fareshare_bristol","somerset_meats",  [("Free-Range Chicken Thighs", 10), ("Chicken Breast", 8)], "delivered", 38, 4),
    ("fareshare_bristol","avon_bakery",     [("Wholemeal Farmhouse Loaf", 12), ("Malt Loaf", 8)],      "ready",     10, None),
    ("fareshare_bristol","barton_farm",     [("Organic Carrots", 18), ("New Potatoes", 15), ("Mixed Salad Leaves", 10)], "pending", 2, None),
]

# ── Reviews ───────────────────────────────────────────────────────────────────
# (customer_username, product_name, rating, title, text, anonymous, days_ago, producer_response_or_None)

REVIEWS = [
    # alice_bristol
    ("alice_bristol", "Organic Carrots",            5, "Exceptional quality",
     "These are the sweetest carrots I've ever had. You can taste the difference that organic growing makes. Will be ordering regularly.",
     False, 300, "Thank you Alice! The soil on our Clifton fields really does make a difference. See you next week!"),
    ("alice_bristol", "Vintage Cheddar",            4, "Proper West Country cheddar",
     "Bold and crumbly with that characteristic tang. Not as sharp as a Montgomery's but excellent value for a local artisan cheese.",
     False, 250, None),
    ("alice_bristol", "Sourdough Loaf",             5, "The best sourdough in Bristol",
     "I've tried most of the sourdough options in Bristol and this is genuinely the best. The crust is extraordinary.",
     False, 200, "That means a lot — we put everything into that crust. Thank you!"),
    ("alice_bristol", "Free-Range Chicken Thighs",  4, "Noticeable quality difference",
     "You can really taste that these birds had a proper life. The meat is firmer and more flavourful than supermarket chicken.",
     False, 160, None),
    ("alice_bristol", "Pressed Apple Juice",        5, "Tastes like actual apples",
     "Nothing like the pasteurised stuff you get in cartons. This actually tastes of fresh apples. Incredible.",
     False, 120, "Exactly what we aim for — we're glad you noticed the difference!"),
    ("alice_bristol", "Wildflower Honey",           5, "Raw honey done properly",
     "Genuinely complex flavour that changes as the season progresses. This is what honey should taste like.",
     False, 90, "Our bees thank you! The wildflower mix really does shift subtly month to month."),

    # charlie_avon
    ("charlie_avon", "New Potatoes",               4, "Fresh and earthy",
     "Just boiled with butter and mint — perfect. The freshness makes all the difference compared to stored supermarket potatoes.",
     False, 295, None),
    ("charlie_avon", "Whole Milk",                 5, "Proper full-fat milk",
     "Creamy, fresh and you can taste that the cows are grass-fed. Makes the best porridge I've ever had.",
     False, 245, "Grass-fed really does make a difference to the cream content. Glad you're enjoying it!"),
    ("charlie_avon", "Croissants",                 4, "Authentic French technique",
     "Properly laminated with real butter — you can see the layers. Not as flaky as a Parisian patisserie but much better than anything local.",
     False, 195, None),
    ("charlie_avon", "Pork Sausages",              3, "Good flavour, slightly dense",
     "The pork flavour is excellent and you can tell it's high-quality meat. The texture was a touch dense for my preference.",
     False, 145, "Appreciate the honest feedback! We've recently adjusted our grinding — hope you'll notice the difference next time."),
    ("charlie_avon", "Bristol Craft Ale",          5, "My new favourite local beer",
     "Clean, citrusy and genuinely refreshing. At 4.2% it's sessionable without being boring. Will be stocking up.",
     False, 95, None),
    ("charlie_avon", "Strawberry Jam",             4, "High-fruit, low-sugar — perfect",
     "You can actually taste the strawberries rather than just sugar. Refreshingly different from commercial jams.",
     False, 45, "That's exactly what we aim for — fruit first, sugar second. Thank you!"),

    # emma_clifton
    ("emma_clifton", "Baby Spinach",               5, "Perfectly fresh",
     "Arrived same-day fresh as promised. I've been using it raw in salads and it's noticeably better than bagged supermarket spinach.",
     False, 290, "We harvest and pack same morning — freshness is everything. Thank you!"),
    ("emma_clifton", "Greek-Style Yoghurt",        4, "Thick and genuinely tangy",
     "Proper strained yoghurt with real acidity. Far better than the supermarket versions which seem to add thickeners.",
     False, 240, None),
    ("emma_clifton", "Focaccia",                   5, "Outstanding",
     "Olive-oil drenched, properly salty, open crumb. I've eaten it three ways: plain, with cheese, and as a sandwich base. All excellent.",
     False, 185, "Three uses — we love that! The key is using good olive oil generously. Glad you agree."),
    ("emma_clifton", "Beef Mince",                 4, "High quality, well-marbled",
     "The fat content is perfect for bolognese. The meat has real flavour — you don't need to add much to it.",
     False, 130, None),
    ("emma_clifton", "Elderflower Cordial",        5, "The real thing",
     "I've made my own elderflower cordial before, so I know how much work goes into it. This is as good as homemade.",
     False, 80, "High praise — thank you! The picking window is so short we really do pour everything into those two weeks."),
    ("emma_clifton", "Lavender Honey",             4, "Floral and distinctive",
     "Subtle lavender note that doesn't overpower — pairs beautifully with strong cheese. A genuinely interesting honey.",
     False, 35, "Lavender honey is a labour of love — so glad the flavour comes through properly!"),

    # james_redland
    ("james_redland", "Tenderstem Broccoli",       4, "Perfect tenderness",
     "Just steamed for four minutes and dressed with olive oil and lemon. The sweetness of properly grown brassicas is remarkable.",
     False, 280, None),
    ("james_redland", "Unsalted Butter",           5, "The best butter I've bought locally",
     "The cultured flavour sets this apart. It's tangy in the best possible way and the texture is perfect — not too hard from the fridge.",
     False, 228, "Cultured butter takes longer to make but we think it's worth it. Thank you!"),
    ("james_redland", "Seeded Rye Loaf",           4, "Dense and satisfying",
     "A proper rye — holds together well, keeps for days, and has real character. The sunflower seeds add a lovely texture.",
     False, 172, None),
    ("james_redland", "Lamb Chops",                5, "The finest lamb I've cooked at home",
     "Just pan-fried with rosemary and garlic. The meat was extraordinary — properly flavoured and not at all gamey. Worth every penny.",
     False, 120, "Exmoor lamb is special. The mineral-rich pasture really does come through in the flavour — thank you!"),
    ("james_redland", "Ginger Beer",               4, "Actually spicy",
     "Finally a ginger beer that actually bites! Most commercial versions are just ginger-flavoured syrup. This has real heat.",
     False, 65, None),
    ("james_redland", "Seville Orange Marmalade",  3, "Very bitter for my taste",
     "Clearly expertly made and the flavour is complex, but I found it intensely bitter even by Seville standards. My partner loved it.",
     False, 20, "Seville marmalade is definitely for lovers of bitterness! We appreciate the honest feedback."),

    # sarah_totterdown
    ("sarah_totterdown", "Curly Kale",             3, "Good kale, tough stems",
     "The flavour is excellent but the stems were tougher than expected. Once I removed them it was very good.",
     False, 275, "Good point — we'll add a note to remind customers to remove stems. Thank you!"),
    ("sarah_totterdown", "Double Cream",           4, "Whips beautifully",
     "Used it for a pavlova — whipped to stiff peaks in under two minutes and held its shape well. Good quality cream.",
     False, 220, None),
    ("sarah_totterdown", "Cinnamon Rolls",         5, "Dangerously good",
     "I ate three in one sitting. The cream cheese glaze is just right — not too sweet. Easily the best I've had outside London.",
     False, 165, "Three in one sitting — we take that as the highest possible compliment!"),
    ("sarah_totterdown", "Back Bacon",             5, "This is what bacon should be",
     "No water in the pan, proper shrinkage, real flavour. I've bought this four times now and will keep buying it.",
     False, 110, "Dry-curing takes patience but results like this are why we do it. Thank you!"),
    ("sarah_totterdown", "Sparkling Lemonade",     3, "Quite tart",
     "The lemon flavour is genuine and the fizz is good, but it's quite sour for my palate. My husband loved it.",
     False, 60, "We lean into the tartness deliberately — real lemon, not sugar water! Glad your husband enjoyed it."),
    ("sarah_totterdown", "Bramble Jelly",          5, "Beautiful autumn flavour",
     "Clear, intensely flavoured jelly that tastes of wild blackberries in the best possible way. On my sourdough every morning.",
     False, 22, None),

    # oliver_stokes
    ("oliver_stokes", "Heritage Tomatoes",         5, "Tasted a tomato properly for the first time",
     "I don't think I'd tasted a properly grown tomato before. The flavour is extraordinary. Already looking forward to next summer.",
     False, 270, "That's the best possible review of a heritage variety. Thank you Oliver!"),
    ("oliver_stokes", "Crème Fraîche",             4, "Fresh and properly tangy",
     "Used it in a sauce instead of cream — far better result. The acidity balances rich dishes well. Good quality product.",
     False, 215, None),
    ("oliver_stokes", "Pain au Chocolat",          5, "Restaurant-quality pastry",
     "The lamination is genuinely impressive. Shatteringly crisp on the outside, soft and buttery within, with good quality chocolate.",
     False, 155, "Laminating takes hours — so glad the result speaks for itself. Thank you!"),
    ("oliver_stokes", "Chicken Breast",            4, "Noticeably better texture",
     "Slow-grown free-range chicken really does hold together better when cooked. Less water loss, firmer texture.",
     False, 100, None),
    ("oliver_stokes", "Cold Brew Coffee",          4, "Smooth and convenient",
     "Perfect 1:3 ratio with oat milk. Smooth, not bitter, and convenient for weekday mornings.",
     False, 50, "The Ethiopian beans we use are really suited to cold brew — glad it works for your mornings!"),
    ("oliver_stokes", "Set Honey",                 5, "Spreadable perfection",
     "The texture is exactly right — smooth enough to spread without tearing bread. Mild, sweet and clearly raw.",
     False, 12, None),

    # lucy_bishopston
    ("lucy_bishopston", "Sourdough Loaf",           5, "My bread journey starts here",
     "I've been making my own sourdough for two years. This is better than mine. The crumb is open and airy, "
     "the crust shatters, and the flavour is complex without being sour. I'll still bake my own — but this is "
     "the benchmark I'm chasing.",
     False, 295, "That's the best possible thing to hear from a home baker — thank you!"),
    ("lucy_bishopston", "Kefir",                    5, "Genuinely live and tangy",
     "I've tried supermarket kefir and it tastes of nothing. This is properly tart, effervescent and you can "
     "tell there's a real culture in it. I've been having it every morning for a month.",
     False, 245, "The live culture really does make all the difference — glad you can taste it!"),
    ("lucy_bishopston", "Greek-Style Yoghurt",       4, "Thick enough to stand a spoon in",
     "Genuinely strained — not just thickened with pectin like so many supermarket versions. Clean, tangy and "
     "incredibly versatile. Works as dessert, breakfast or in savoury sauces.",
     False, 230, None),
    ("lucy_bishopston", "Butternut Squash",          5, "Sweetest squash I've had",
     "Roasted at 200°C with just olive oil and a little thyme — the natural sugars caramelised beautifully. "
     "You can taste the difference that proper growing makes.",
     False, 105, "Butternut really is one of our favourite autumn crops — glad it showed!"),
    ("lucy_bishopston", "Chilli Jam",                5, "Perfect heat-to-sweet ratio",
     "On cream cheese and crackers, on a bacon sandwich, on cold leftover chicken. I've put it on everything "
     "this week. The honey sweetness and the chilli heat are perfectly balanced — absolutely addictive.",
     False, 68, "We've heard the crackers-and-cream-cheese combination before — it's a great shout!"),
    ("lucy_bishopston", "Ginger Beer",               4, "Finally a real one",
     "Not too sweet, proper ginger bite that lingers. Used it as a mixer and also drank half a bottle straight. "
     "Will be a regular order.",
     False, 22, None),

    # raj_easton
    ("raj_easton", "Lamb Chops",                    5, "Restaurant-quality at home",
     "Simply pan-fried in a hot cast iron with rosemary and garlic. The quality of the meat meant I needed "
     "to do almost nothing — the flavour was already there. Exmoor lamb is something else.",
     False, 300, "A hot pan and good lamb — that's all you need. Glad the Exmoor quality came through!"),
    ("raj_easton", "Everything Bagels",              4, "Properly kettle-boiled",
     "The chew is right — dense but not tough, with a slight shine on the crust. The topping is generous "
     "without being overwhelming. Good bagels are hard to find in Bristol.",
     False, 220, "Kettle-boiling is non-negotiable for us — glad the texture came through!"),
    ("raj_easton", "Chilli Jam",                    5, "Brilliant with everything",
     "Stirred into yoghurt as a dip, spread on a flatbread, added to a marinade. This jar was empty in a week. "
     "The honey base makes it genuinely complex rather than just hot.",
     False, 248, None),
    ("raj_easton", "Duck Breast",                   5, "The best I've cooked at home",
     "Scored the skin, started in a cold pan, rendered for 12 minutes, flipped for 3. Perfectly pink, "
     "gorgeous skin. Free-range duck at this quality makes the technique easy.",
     False, 12, "You've described the perfect duck method — we're glad the bird did it justice!"),
    ("raj_easton", "Cavolo Nero",                   4, "Hearty and versatile",
     "Braised with garlic, chilli and a splash of the craft ale — incredible. Also works wilted into pasta. "
     "The frost-grown flavour is noticeably richer than cavolo you buy in summer.",
     False, 30, "Frost genuinely intensifies the sweetness — it's the best time to harvest it."),
    ("raj_easton", "Natural Yoghurt",               3, "Good but mild",
     "High quality — clearly made with real milk and a proper culture. I just prefer more acidity. "
     "If you like a milder yoghurt this is excellent. My mum loved it.",
     False, 190, "We keep it mild deliberately — the Greek-style version has more tang if you'd prefer!"),
]

# ── Announcements ─────────────────────────────────────────────────────────────

ANNOUNCEMENTS = [
    {
        "title": "Welcome to FarmLocal Bristol!",
        "body": (
            "We're delighted to launch FarmLocal in Bristol — connecting local producers directly with "
            "customers across the city. Browse produce from six amazing Bristol-area farms and businesses, "
            "place your order, and receive fresh food delivered within 48 hours. No middlemen. No food miles. "
            "Just local food, simply done."
        ),
        "days_ago": 365,
    },
    {
        "title": "New Producer: Hartcliffe Honey & Preserves",
        "body": (
            "We're thrilled to welcome Priya and her team at Hartcliffe Honey & Preserves to the platform. "
            "Their raw urban honeys and handmade preserves are now available to order. "
            "Try the Lavender Honey — it's extraordinary."
        ),
        "days_ago": 180,
    },
    {
        "title": "Summer Seasonal Produce Now Available",
        "body": (
            "Heritage tomatoes, courgettes, raspberries and elderflower cordial are now in season. "
            "These products are only available for a limited window — order now to avoid disappointment. "
            "See each product page for availability dates."
        ),
        "days_ago": 120,
    },
    {
        "title": "Platform Update: Order Tracking Improved",
        "body": (
            "We've improved order tracking so you can follow each producer order from acceptance through to delivery. "
            "You'll now see real-time status updates on your order history page. As always, "
            "contact us via the platform if you have any questions."
        ),
        "days_ago": 60,
    },
    {
        "title": "Autumn Harvest Spotlight",
        "body": (
            "October is one of our favourite months. Barton Farm's Cox Apples and Victoria Plums are at "
            "their absolute peak. Hartcliffe's Bramble Jelly — made from hedgerow blackberries — "
            "is back in stock. And Avon Valley Bakery has just launched a seasonal apple and cinnamon loaf. "
            "Go and explore what's in season this week."
        ),
        "days_ago": 14,
    },
    {
        "title": "Welcome FareShare Bristol to FarmLocal",
        "body": (
            "We're proud to announce that FareShare Bristol — one of the city's leading food charity "
            "organisations — is now sourcing through FarmLocal. Their fortnightly community box brings "
            "fresh, locally produced food to hundreds of Bristol households in need. "
            "Supporting local producers and reducing food poverty: two good things at once."
        ),
        "days_ago": 90,
    },
    {
        "title": "Spring Is Here: New Seasonal Lines",
        "body": (
            "Spring has arrived in the growing fields. Barton Farm's Spring Onions and Rhubarb are now "
            "available, along with the first Mixed Salad Leaves of the year. Clifton Drinks have also "
            "brought back their Elderflower Cordial — handpicked and pressed from the North Somerset lanes. "
            "These lines sell out fast — order early to avoid disappointment."
        ),
        "days_ago": 5,
    },
]

# ── Recommendation Interactions ───────────────────────────────────────────────
# Each customer has a distinct taste profile so the CF model will recommend
# different products to different people.
# Format: (username, product_name, event_type, recommendation_rank, reorder_probability)

RECOMMENDATION_INTERACTIONS = [
    # ── alice_bristol ── organic veg + honey + sourdough ─────────────────────
    ("alice_bristol", "Organic Carrots",            "purchased",     1, 0.93),
    ("alice_bristol", "Baby Spinach",               "purchased",     2, 0.89),
    ("alice_bristol", "Wildflower Honey",           "purchased",     3, 0.86),
    ("alice_bristol", "Pressed Apple Juice",        "purchased",     4, 0.84),
    ("alice_bristol", "Sourdough Loaf",             "purchased",     5, 0.81),
    ("alice_bristol", "Free-Range Eggs",            "added_to_cart", 1, 0.76),
    ("alice_bristol", "Tenderstem Broccoli",        "added_to_cart", 2, 0.73),
    ("alice_bristol", "Organic Eggs",               "added_to_cart", 3, 0.70),
    ("alice_bristol", "Mixed Salad Leaves",         "viewed",        1, 0.65),
    ("alice_bristol", "Beetroot",                   "viewed",        2, 0.62),
    ("alice_bristol", "Cox Apples",                 "viewed",        3, 0.59),
    ("alice_bristol", "Lemon Curd",                 "viewed",        4, 0.54),

    # ── charlie_avon ── dairy + craft ale + pork ─────────────────────────────
    ("charlie_avon", "Whole Milk",                  "purchased",     1, 0.91),
    ("charlie_avon", "Vintage Cheddar",             "purchased",     2, 0.88),
    ("charlie_avon", "Bristol Craft Ale",           "purchased",     3, 0.85),
    ("charlie_avon", "Pork Sausages",               "purchased",     4, 0.82),
    ("charlie_avon", "Greek-Style Yoghurt",         "purchased",     5, 0.79),
    ("charlie_avon", "Dark Porter",                 "added_to_cart", 1, 0.74),
    ("charlie_avon", "Smoked Cheddar",              "added_to_cart", 2, 0.71),
    ("charlie_avon", "Croissants",                  "added_to_cart", 3, 0.68),
    ("charlie_avon", "Unsalted Butter",             "viewed",        1, 0.63),
    ("charlie_avon", "Ginger Beer",                 "viewed",        2, 0.58),
    ("charlie_avon", "Pork & Apple Sausages",       "viewed",        3, 0.55),
    ("charlie_avon", "Kefir",                       "viewed",        4, 0.50),

    # ── emma_clifton ── bakery + dairy + elderflower ──────────────────────────
    ("emma_clifton", "Focaccia",                    "purchased",     1, 0.90),
    ("emma_clifton", "Greek-Style Yoghurt",         "purchased",     2, 0.87),
    ("emma_clifton", "Elderflower Cordial",         "purchased",     3, 0.84),
    ("emma_clifton", "Baby Spinach",                "purchased",     4, 0.80),
    ("emma_clifton", "Crème Fraîche",               "purchased",     5, 0.77),
    ("emma_clifton", "Unsalted Butter",             "added_to_cart", 1, 0.73),
    ("emma_clifton", "Pain au Chocolat",            "added_to_cart", 2, 0.70),
    ("emma_clifton", "Natural Yoghurt",             "added_to_cart", 3, 0.66),
    ("emma_clifton", "Seeded Rye Loaf",             "viewed",        1, 0.61),
    ("emma_clifton", "Clotted Cream",               "viewed",        2, 0.57),
    ("emma_clifton", "Raspberry Lemonade",          "viewed",        3, 0.53),
    ("emma_clifton", "Bristol Brie",                "viewed",        4, 0.49),

    # ── james_redland ── premium meat + rye + butter ─────────────────────────
    ("james_redland", "Lamb Chops",                 "purchased",     1, 0.92),
    ("james_redland", "Unsalted Butter",            "purchased",     2, 0.88),
    ("james_redland", "Seeded Rye Loaf",            "purchased",     3, 0.85),
    ("james_redland", "Tenderstem Broccoli",        "purchased",     4, 0.81),
    ("james_redland", "Beef Ribeye Steaks",         "purchased",     5, 0.78),
    ("james_redland", "Duck Breast",                "added_to_cart", 1, 0.74),
    ("james_redland", "Lamb Shoulder",              "added_to_cart", 2, 0.70),
    ("james_redland", "Back Bacon",                 "added_to_cart", 3, 0.67),
    ("james_redland", "Spelt Loaf",                 "viewed",        1, 0.62),
    ("james_redland", "Pork Ribs",                  "viewed",        2, 0.58),
    ("james_redland", "Gammon Joint",               "viewed",        3, 0.54),
    ("james_redland", "Cavolo Nero",                "viewed",        4, 0.50),

    # ── sarah_totterdown ── sweet bakery + preserves + cream ─────────────────
    ("sarah_totterdown", "Cinnamon Rolls",          "purchased",     1, 0.91),
    ("sarah_totterdown", "Double Cream",            "purchased",     2, 0.87),
    ("sarah_totterdown", "Back Bacon",              "purchased",     3, 0.84),
    ("sarah_totterdown", "Bramble Jelly",           "purchased",     4, 0.81),
    ("sarah_totterdown", "Sparkling Lemonade",      "purchased",     5, 0.77),
    ("sarah_totterdown", "Danish Pastries",         "added_to_cart", 1, 0.73),
    ("sarah_totterdown", "Clotted Cream",           "added_to_cart", 2, 0.69),
    ("sarah_totterdown", "Croissants",              "added_to_cart", 3, 0.66),
    ("sarah_totterdown", "Malt Loaf",               "viewed",        1, 0.61),
    ("sarah_totterdown", "Strawberry Jam",          "viewed",        2, 0.57),
    ("sarah_totterdown", "Blackcurrant Jam",        "viewed",        3, 0.53),
    ("sarah_totterdown", "Lemon Curd",              "viewed",        4, 0.49),

    # ── oliver_stokes ── premium + heritage + cold brew ──────────────────────
    ("oliver_stokes", "Heritage Tomatoes",          "purchased",     1, 0.94),
    ("oliver_stokes", "Pain au Chocolat",           "purchased",     2, 0.90),
    ("oliver_stokes", "Cold Brew Coffee",           "purchased",     3, 0.86),
    ("oliver_stokes", "Beef Ribeye Steaks",         "purchased",     4, 0.83),
    ("oliver_stokes", "Set Honey",                  "purchased",     5, 0.80),
    ("oliver_stokes", "Honeycomb",                  "added_to_cart", 1, 0.76),
    ("oliver_stokes", "Heather Honey",              "added_to_cart", 2, 0.72),
    ("oliver_stokes", "Dark Porter",                "added_to_cart", 3, 0.68),
    ("oliver_stokes", "Acacia Honey",               "viewed",        1, 0.63),
    ("oliver_stokes", "Smoked Cheddar",             "viewed",        2, 0.59),
    ("oliver_stokes", "Duck Breast",                "viewed",        3, 0.55),
    ("oliver_stokes", "Bristol Blue",               "viewed",        4, 0.51),

    # ── lucy_bishopston ── fermented + light bakery + seasonal ───────────────
    ("lucy_bishopston", "Kefir",                    "purchased",     1, 0.92),
    ("lucy_bishopston", "Sourdough Loaf",           "purchased",     2, 0.88),
    ("lucy_bishopston", "Greek-Style Yoghurt",      "purchased",     3, 0.85),
    ("lucy_bishopston", "Chilli Jam",               "purchased",     4, 0.82),
    ("lucy_bishopston", "Wildflower Honey",         "purchased",     5, 0.79),
    ("lucy_bishopston", "Kombucha Original",        "added_to_cart", 1, 0.75),
    ("lucy_bishopston", "Elderflower Cordial",      "added_to_cart", 2, 0.71),
    ("lucy_bishopston", "Ginger Beer",              "added_to_cart", 3, 0.67),
    ("lucy_bishopston", "Brioche Loaf",             "viewed",        1, 0.62),
    ("lucy_bishopston", "Butternut Squash",         "viewed",        2, 0.58),
    ("lucy_bishopston", "Acacia Honey",             "viewed",        3, 0.54),
    ("lucy_bishopston", "Natural Yoghurt",          "viewed",        4, 0.50),

    # ── raj_easton ── spiced / lamb / complex flavours ────────────────────────
    ("raj_easton", "Lamb Chops",                    "purchased",     1, 0.93),
    ("raj_easton", "Chilli Jam",                    "purchased",     2, 0.89),
    ("raj_easton", "Everything Bagels",             "purchased",     3, 0.86),
    ("raj_easton", "Duck Breast",                   "purchased",     4, 0.83),
    ("raj_easton", "Ginger Beer",                   "purchased",     5, 0.80),
    ("raj_easton", "Lamb Mince",                    "added_to_cart", 1, 0.75),
    ("raj_easton", "Pork Ribs",                     "added_to_cart", 2, 0.71),
    ("raj_easton", "Acacia Honey",                  "added_to_cart", 3, 0.67),
    ("raj_easton", "Cavolo Nero",                   "viewed",        1, 0.62),
    ("raj_easton", "Dark Porter",                   "viewed",        2, 0.58),
    ("raj_easton", "Lamb Shoulder",                 "viewed",        3, 0.54),
    ("raj_easton", "Spelt Loaf",                    "viewed",        4, 0.50),

    # ── foodhub_bristol ── bulk essentials ────────────────────────────────────
    ("foodhub_bristol", "Organic Carrots",          "purchased",     1, 0.95),
    ("foodhub_bristol", "New Potatoes",             "purchased",     2, 0.92),
    ("foodhub_bristol", "Baby Spinach",             "purchased",     3, 0.88),
    ("foodhub_bristol", "Whole Milk",               "purchased",     4, 0.85),
    ("foodhub_bristol", "Wholemeal Farmhouse Loaf", "purchased",     5, 0.82),
    ("foodhub_bristol", "Tenderstem Broccoli",      "added_to_cart", 1, 0.78),
    ("foodhub_bristol", "Free-Range Eggs",          "added_to_cart", 2, 0.74),
    ("foodhub_bristol", "Unsalted Butter",          "added_to_cart", 3, 0.70),
    ("foodhub_bristol", "Sweet Potatoes",           "viewed",        1, 0.65),
    ("foodhub_bristol", "Natural Yoghurt",          "viewed",        2, 0.60),
    ("foodhub_bristol", "Pork Sausages",            "viewed",        3, 0.56),

    # ── harbourside_chef ── restaurant staples ────────────────────────────────
    ("harbourside_chef", "Free-Range Chicken Thighs", "purchased",   1, 0.94),
    ("harbourside_chef", "Sourdough Loaf",           "purchased",    2, 0.90),
    ("harbourside_chef", "Beef Mince",               "purchased",    3, 0.87),
    ("harbourside_chef", "Double Cream",             "purchased",    4, 0.84),
    ("harbourside_chef", "Unsalted Butter",          "purchased",    5, 0.80),
    ("harbourside_chef", "Chicken Breast",           "added_to_cart", 1, 0.76),
    ("harbourside_chef", "Crème Fraîche",            "added_to_cart", 2, 0.72),
    ("harbourside_chef", "Seeded Rye Loaf",          "added_to_cart", 3, 0.68),
    ("harbourside_chef", "Beef Ribeye Steaks",       "viewed",        1, 0.64),
    ("harbourside_chef", "Focaccia",                 "viewed",        2, 0.59),
    ("harbourside_chef", "Whole Milk",               "viewed",        3, 0.55),

    # ── fareshare_bristol ── charity bulk ────────────────────────────────────
    ("fareshare_bristol", "Organic Carrots",         "purchased",    1, 0.96),
    ("fareshare_bristol", "Wholemeal Farmhouse Loaf","purchased",    2, 0.92),
    ("fareshare_bristol", "Whole Milk",              "purchased",    3, 0.89),
    ("fareshare_bristol", "New Potatoes",            "purchased",    4, 0.86),
    ("fareshare_bristol", "Free-Range Eggs",         "purchased",    5, 0.83),
    ("fareshare_bristol", "Baby Spinach",            "added_to_cart", 1, 0.78),
    ("fareshare_bristol", "Natural Yoghurt",         "added_to_cart", 2, 0.74),
    ("fareshare_bristol", "Pork Sausages",           "added_to_cart", 3, 0.70),
    ("fareshare_bristol", "Malt Loaf",               "viewed",        1, 0.65),
    ("fareshare_bristol", "Unsalted Butter",         "viewed",        2, 0.60),
    ("fareshare_bristol", "Sweet Potatoes",          "viewed",        3, 0.56),
]

# ── Recurring Orders ──────────────────────────────────────────────────────────

RECURRING_ORDERS = [
    {
        "org_username": "foodhub_bristol",
        "name": "Weekly Veg Box",
        "frequency": "weekly",
        "order_day": 0,    # Monday
        "delivery_day": 2, # Wednesday
        "status": "active",
        "items": [
            ("Organic Carrots", 5),
            ("New Potatoes", 5),
            ("Baby Spinach", 4),
            ("Tenderstem Broccoli", 3),
            ("Curly Kale", 3),
        ],
    },
    {
        "org_username": "harbourside_chef",
        "name": "Kitchen Weekly Supplies",
        "frequency": "weekly",
        "order_day": 1,    # Tuesday
        "delivery_day": 3, # Thursday
        "status": "active",
        "items": [
            ("Sourdough Loaf", 8),
            ("Free-Range Chicken Thighs", 4),
            ("Beef Mince", 3),
        ],
    },
    {
        "org_username": "fareshare_bristol",
        "name": "Fortnightly Community Box",
        "frequency": "fortnightly",
        "order_day": 2,    # Wednesday
        "delivery_day": 4, # Friday
        "status": "active",
        "items": [
            ("Organic Carrots", 20),
            ("New Potatoes", 15),
            ("Baby Spinach", 10),
            ("Wholemeal Farmhouse Loaf", 12),
            ("Whole Milk", 18),
        ],
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
# Command
# ═══════════════════════════════════════════════════════════════════════════════

class Command(BaseCommand):
    help = "Seed the database with comprehensive Bristol-area demo data."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing seed data first.")

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        now = timezone.now()

        cat_map      = self._seed_categories()
        allergen_map = self._seed_allergens()
        admin_acc    = self._seed_admin()
        producer_map = self._seed_producers()
        customer_map, org_map = self._seed_customers()
        product_map  = self._seed_products(cat_map, allergen_map, producer_map)
        self._seed_farm_stories(producer_map, customer_map, now)
        self._seed_recipes(producer_map, product_map, now)
        self._seed_orders(producer_map, customer_map, product_map, now)
        self._seed_reviews(product_map, customer_map, now)
        self._seed_announcements(admin_acc, now)
        self._seed_recurring_orders(org_map, customer_map, product_map, now)
        self._seed_recommendation_interactions(product_map, customer_map, now)

        self.stdout.write(self.style.SUCCESS("\n✓ Comprehensive seed complete!"))

    # ── Flush ────────────────────────────────────────────────────────────────

    def _flush(self):
        self.stdout.write("Flushing seed data...")
        all_usernames = (
            [p["username"] for p in PRODUCERS]
            + [c["username"] for c in CUSTOMERS]
            + [c["username"] for c in ORG_CUSTOMERS]
            + ["admin_farmlocal"]
        )
        # Delete in reverse-dependency order to avoid PROTECT constraint errors.
        CommissionLedger.objects.all().delete()
        SettlementLine.objects.all().delete()
        WeeklySettlement.objects.all().delete()
        Payment.objects.all().delete()
        ProducerOrderStatusEvent.objects.all().delete()
        OrderItem.objects.all().delete()
        ProducerOrder.objects.all().delete()
        Order.objects.all().delete()          # cascades DistanceRecord
        RecurringOrderItem.objects.all().delete()
        RecurringOrder.objects.all().delete()
        RecommendationInteraction.objects.all().delete()
        FarmStoryLike.objects.all().delete()
        FarmStory.objects.all().delete()
        Review.objects.all().delete()
        Recipe.objects.all().delete()
        Announcement.objects.all().delete()
        # Deleting accounts cascades Producer, Customer, Organisation, Address, Cart
        Account.objects.filter(username__in=all_usernames).delete()
        Category.objects.filter(name__in=[c["name"] for c in CATEGORIES]).delete()
        Allergen.objects.filter(name__in=[a[0] for a in Allergen.ALLERGEN_DATA]).delete()
        self.stdout.write(self.style.WARNING("  Seed data cleared."))

    # ── Categories ───────────────────────────────────────────────────────────

    def _seed_categories(self):
        cat_map = {}
        for c in CATEGORIES:
            obj, created = Category.objects.get_or_create(
                name=c["name"], defaults={"description": c["description"]}
            )
            cat_map[obj.name] = obj
            if created:
                self.stdout.write(f"  [+] Category: {obj.name}")
        return cat_map

    # ── Allergens ────────────────────────────────────────────────────────────

    def _seed_allergens(self):
        allergen_map = {}
        for key, name, description in Allergen.ALLERGEN_DATA:
            obj, created = Allergen.objects.get_or_create(
                name=key, defaults={"description": description}
            )
            allergen_map[key] = obj
            if created:
                self.stdout.write(f"  [+] Allergen: {key}")
        return allergen_map

    # ── Admin ────────────────────────────────────────────────────────────────

    def _seed_admin(self):
        account, created = Account.objects.get_or_create(
            username="admin_farmlocal",
            defaults={
                "email": "admin@farmlocal.com",
                "first_name": "Farm",
                "last_name": "Admin",
                "account_type": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            account.set_password(SEED_PASSWORD)
            account.save()
            self.stdout.write(f"  [+] Admin: admin@farmlocal.com")
        return account

    # ── Producers ────────────────────────────────────────────────────────────

    def _seed_producers(self):
        producer_map = {}
        for p in PRODUCERS:
            account, created = Account.objects.get_or_create(
                username=p["username"],
                defaults={
                    "email": p["email"],
                    "first_name": p["first_name"],
                    "last_name": p["last_name"],
                    "account_type": "producer",
                },
            )
            if created:
                account.set_password(SEED_PASSWORD)
                account.save()
                self.stdout.write(f"  [+] Producer account: {p['email']}")

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

            producer, prod_created = Producer.objects.get_or_create(
                account=account,
                defaults={
                    "company_name": p["company_name"],
                    "company_number": p["company_number"],
                    "company_description": p["company_description"],
                    "lead_time_hours": p["lead_time_hours"],
                    "business_address": addr,
                },
            )
            producer_map[p["username"]] = producer
            if prod_created:
                self.stdout.write(f"  [+] Producer: {producer.company_name}")
        return producer_map

    # ── Customers ────────────────────────────────────────────────────────────

    def _seed_customers(self):
        customer_map = {}
        org_map = {}

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
                account.set_password(SEED_PASSWORD)
                account.save()
                self.stdout.write(f"  [+] Customer: {c['email']}")

            customer, _ = Customer.objects.get_or_create(
                account=account, defaults={"phone_number": c["phone"]}
            )
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
            if customer.default_delivery_address_id != addr.id:
                customer.default_delivery_address = addr
                customer.save(update_fields=["default_delivery_address"])

            customer_map[c["username"]] = (account, customer, addr)

        for c in ORG_CUSTOMERS:
            account, created = Account.objects.get_or_create(
                username=c["username"],
                defaults={
                    "email": c["email"],
                    "first_name": c["first_name"],
                    "last_name": c["last_name"],
                    "account_type": c["account_type"],
                },
            )
            if created:
                account.set_password(SEED_PASSWORD)
                account.save()
                self.stdout.write(f"  [+] Org customer: {c['email']}")

            customer, _ = Customer.objects.get_or_create(
                account=account, defaults={"phone_number": c["phone"]}
            )
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
            if customer.default_delivery_address_id != addr.id:
                customer.default_delivery_address = addr
                customer.save(update_fields=["default_delivery_address"])

            org, _ = Organisation.objects.get_or_create(
                customer=customer,
                defaults={
                    "organisation_name": c["org"]["organisation_name"],
                    "organisation_email": c["org"]["organisation_email"],
                    "organisation_type": c["org"]["organisation_type"],
                },
            )
            org_map[c["username"]] = org
            customer_map[c["username"]] = (account, customer, addr)

        return customer_map, org_map

    # ── Products ─────────────────────────────────────────────────────────────

    def _seed_products(self, cat_map, allergen_map, producer_map):
        product_map = {}
        for p in PRODUCTS:
            defaults = {
                "category": cat_map.get(p["category"]),
                "producer": producer_map[p["producer"]],
                "price": Decimal(p["price"]),
                "unit": p["unit"],
                "stock": p["stock"],
                "organic_certified": p.get("organic_certified", False),
                "status": "available",
                "description": p.get("description", ""),
                "image": p.get("image"),
                "availability_mode": p.get("availability_mode", "year_round"),
                "season_start_month": p.get("season_start_month"),
                "season_end_month": p.get("season_end_month"),
                "is_surplus": p.get("is_surplus", False),
                "discount_percentage": p.get("discount_percentage", 0),
                "surplus_note": p.get("surplus_note", ""),
                "low_stock_threshold": p.get("low_stock_threshold", 10),
            }
            obj, created = Product.objects.get_or_create(name=p["name"], defaults=defaults)
            if not created:
                for k, v in defaults.items():
                    if k == "image":
                        if v and not obj.image:
                            obj.image = v
                        continue
                    setattr(obj, k, v)
                obj.save()

            for allergen_key in p.get("allergens", []):
                if allergen_key in allergen_map:
                    obj.allergens.add(allergen_map[allergen_key])

            product_map[p["name"]] = obj
            if created:
                self.stdout.write(f"  [+] Product: {obj.name}")
        return product_map

    # ── Farm Stories ─────────────────────────────────────────────────────────

    def _seed_farm_stories(self, producer_map, customer_map, now):
        all_customer_accounts = [acc for acc, _, _ in customer_map.values()]
        story_objects = []
        for s in FARM_STORIES:
            producer = producer_map[s["producer"]]
            created_at = now - timedelta(days=s["days_ago"])
            story, created = FarmStory.objects.get_or_create(
                producer=producer,
                title=s["title"],
                defaults={
                    "body": s["body"],
                    "image": s.get("image"),
                    "is_published": True,
                },
            )
            if created:
                FarmStory.objects.filter(pk=story.pk).update(created_at=created_at)
                self.stdout.write(f"  [+] Farm Story: {story.title[:50]}")
            story_objects.append(story)

        # Distribute likes — each customer likes roughly half the stories
        for i, story in enumerate(story_objects):
            for j, (username, (account, _, _)) in enumerate(customer_map.items()):
                if (i + j) % 3 != 0:  # ~2/3 of customers like each story
                    FarmStoryLike.objects.get_or_create(story=story, customer=account)

    # ── Recipes ──────────────────────────────────────────────────────────────

    def _seed_recipes(self, producer_map, product_map, now):
        for r in RECIPES:
            producer = producer_map[r["producer"]]
            created_at = now - timedelta(days=r["days_ago"])
            recipe, created = Recipe.objects.get_or_create(
                producer=producer,
                title=r["title"],
                defaults={
                    "description": r["description"],
                    "ingredients": r["ingredients"],
                    "instructions": r["instructions"],
                    "image": r.get("image"),
                    "seasonal_tag": r.get("seasonal_tag", "all_year"),
                    "is_published": True,
                    "published_at": created_at,
                },
            )
            if created:
                Recipe.objects.filter(pk=recipe.pk).update(created_at=created_at)
                for pname in r.get("products", []):
                    if pname in product_map:
                        recipe.products.add(product_map[pname])
                self.stdout.write(f"  [+] Recipe: {recipe.title[:50]}")

    # ── Orders ───────────────────────────────────────────────────────────────

    def _seed_orders(self, producer_map, customer_map, product_map, now):
        order_status_map = {
            "delivered": "completed",
            "ready":     "confirmed",
            "preparing": "confirmed",
            "accepted":  "confirmed",
            "pending":   "pending",
            "cancelled": "cancelled",
            "rejected":  "cancelled",
        }

        completed_producer_orders = []
        created_status_event_count = 0

        for cust_user, prod_user, items, po_status, days_ago, del_days in SEED_ORDERS:
            cust_account, _, cust_addr = customer_map[cust_user]
            producer = producer_map[prod_user]
            created_at = now - timedelta(days=days_ago)

            subtotal = sum(
                Decimal(str(product_map[pname].price)) * qty
                for pname, qty in items
            )
            commission = (subtotal * COMMISSION_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            order = Order.objects.create(
                account=cust_account,
                delivery_address=cust_addr,
                status=order_status_map.get(po_status, "pending"),
                total_amount=subtotal,
                commission_amount=commission,
            )
            Order.objects.filter(pk=order.pk).update(created_at=created_at)

            delivery_date = (created_at + timedelta(days=del_days)).date() if del_days else None
            po = ProducerOrder.objects.create(
                order=order,
                producer=producer,
                status=po_status,
                total_amount=subtotal,
                delivery_date=delivery_date,
            )
            ProducerOrder.objects.filter(pk=po.pk).update(created_at=created_at)
            created_status_event_count += self._seed_producer_order_status_history(
                producer_order=po,
                customer_account=cust_account,
                created_at=created_at,
            )

            for pname, qty in items:
                product = product_map[pname]
                price = Decimal(str(product.price))
                OrderItem.objects.create(
                    producer_order=po,
                    product=product,
                    quantity=qty,
                    price_snapshot=price,
                    line_total=price * qty,
                )

            # Payment record
            pay_status = {
                "delivered": "paid",
                "ready":     "paid",
                "preparing": "paid",
                "accepted":  "paid",
                "pending":   "pending",
                "cancelled": "cancelled",
                "rejected":  "cancelled",
            }.get(po_status, "pending")
            Payment.objects.create(
                order=order,
                amount=subtotal,
                status=pay_status,
                provider="stripe",
            )

            if po_status == "delivered":
                completed_producer_orders.append((po, subtotal, commission, created_at))

            self.stdout.write(
                f"  [+] Order #{order.id}: {cust_user} → {prod_user} ({po_status}, £{subtotal})"
            )

        self.stdout.write(f"  [+] {created_status_event_count} order update audit records created.")
        self._seed_settlements(completed_producer_orders, producer_map, now)

    def _seed_producer_order_status_history(self, producer_order, customer_account, created_at):
        if producer_order.status_events.exists():
            return 0

        final_status = producer_order.status
        producer_account = getattr(producer_order.producer, "account", None)

        accepted_hours = 4 + (producer_order.pk % 9)     # 4-12 hours
        prep_hours = 20 + (producer_order.pk % 9)        # roughly 1 day
        ready_hours = 24 + (producer_order.pk % 25)      # 1-2 days
        cancel_hours = 6 + (producer_order.pk % 13)      # 6-18 hours

        accepted_at = created_at + timedelta(hours=accepted_hours)
        preparing_at = accepted_at + timedelta(hours=prep_hours)
        ready_at = preparing_at + timedelta(hours=ready_hours)

        events = [
            {
                "previous_status": "",
                "new_status": "pending",
                "changed_by": customer_account,
                "note": "Order received and awaiting producer confirmation.",
                "created_at": created_at,
            }
        ]

        if final_status == "accepted":
            events.append({
                "previous_status": "pending",
                "new_status": "accepted",
                "changed_by": producer_account,
                "note": "Order accepted by producer.",
                "created_at": accepted_at,
            })
        elif final_status == "preparing":
            events.extend([
                {
                    "previous_status": "pending",
                    "new_status": "accepted",
                    "changed_by": producer_account,
                    "note": "Order accepted by producer.",
                    "created_at": accepted_at,
                },
                {
                    "previous_status": "accepted",
                    "new_status": "preparing",
                    "changed_by": producer_account,
                    "note": "Producer has started preparing the order.",
                    "created_at": preparing_at,
                },
            ])
        elif final_status == "ready":
            events.extend([
                {
                    "previous_status": "pending",
                    "new_status": "accepted",
                    "changed_by": producer_account,
                    "note": "Order accepted by producer.",
                    "created_at": accepted_at,
                },
                {
                    "previous_status": "accepted",
                    "new_status": "preparing",
                    "changed_by": producer_account,
                    "note": "Producer has started preparing the order.",
                    "created_at": preparing_at,
                },
                {
                    "previous_status": "preparing",
                    "new_status": "ready",
                    "changed_by": producer_account,
                    "note": "Order is ready for collection or delivery.",
                    "created_at": ready_at,
                },
            ])
        elif final_status == "delivered":
            delivered_at = ready_at + timedelta(hours=2 + (producer_order.pk % 5))
            if producer_order.delivery_date:
                on_date_midday = (created_at + timedelta(
                    days=(producer_order.delivery_date - created_at.date()).days
                )).replace(hour=12, minute=0, second=0, microsecond=0)
                if on_date_midday > ready_at:
                    delivered_at = on_date_midday

            events.extend([
                {
                    "previous_status": "pending",
                    "new_status": "accepted",
                    "changed_by": producer_account,
                    "note": "Order accepted by producer.",
                    "created_at": accepted_at,
                },
                {
                    "previous_status": "accepted",
                    "new_status": "preparing",
                    "changed_by": producer_account,
                    "note": "Producer has started preparing the order.",
                    "created_at": preparing_at,
                },
                {
                    "previous_status": "preparing",
                    "new_status": "ready",
                    "changed_by": producer_account,
                    "note": "Order is ready for collection or delivery.",
                    "created_at": ready_at,
                },
                {
                    "previous_status": "ready",
                    "new_status": "delivered",
                    "changed_by": producer_account,
                    "note": "Order marked as delivered.",
                    "created_at": delivered_at,
                },
            ])
        elif final_status == "cancelled":
            events.append({
                "previous_status": "pending",
                "new_status": "cancelled",
                "changed_by": producer_account,
                "note": "Order cancelled before fulfilment.",
                "created_at": created_at + timedelta(hours=cancel_hours),
            })
        elif final_status == "rejected":
            events.append({
                "previous_status": "pending",
                "new_status": "rejected",
                "changed_by": producer_account,
                "note": "Order rejected by producer due to availability.",
                "created_at": created_at + timedelta(hours=cancel_hours),
            })

        created_count = 0
        for evt in events:
            created = ProducerOrderStatusEvent.objects.create(
                producer_order=producer_order,
                previous_status=evt["previous_status"],
                new_status=evt["new_status"],
                changed_by=evt["changed_by"],
                note=evt["note"],
            )
            ProducerOrderStatusEvent.objects.filter(pk=created.pk).update(created_at=evt["created_at"])
            created_count += 1

        return created_count

    # ── Settlements ───────────────────────────────────────────────────────────

    def _seed_settlements(self, completed_pos, producer_map, now):
        # Phase 1: aggregate totals per (week_start, producer)
        # week_buckets: week_start → {producer_id → {sales, commission, pos[]}}
        week_buckets = {}
        for po, subtotal, commission, created_at in completed_pos:
            monday = (created_at - timedelta(days=created_at.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            week_buckets.setdefault(monday, {})
            week_buckets[monday].setdefault(
                po.producer_id,
                {"sales": Decimal("0"), "commission": Decimal("0"), "pos": []},
            )
            week_buckets[monday][po.producer_id]["sales"] += subtotal
            week_buckets[monday][po.producer_id]["commission"] += commission
            week_buckets[monday][po.producer_id]["pos"].append((po, subtotal, commission))

        # Phase 2: create settlements, lines, and per-PO ledger entries
        for week_start, producer_totals in week_buckets.items():
            week_end = week_start + timedelta(days=7)
            settlement, _ = WeeklySettlement.objects.get_or_create(
                start_period=week_start,
                end_period=week_end,
                defaults={
                    "status": "completed",
                    "processed_at": week_end + timedelta(days=1),
                },
            )

            for producer_id, totals in producer_totals.items():
                payout = totals["sales"] - totals["commission"]
                sl, _ = SettlementLine.objects.get_or_create(
                    settlement=settlement,
                    producer_id=producer_id,
                    defaults={
                        "total_sales": totals["sales"],
                        "commission_amount": totals["commission"],
                        "payout_amount": payout,
                        "payout_status": "paid",
                    },
                )

                for po, po_subtotal, po_commission in totals["pos"]:
                    po_payout = po_subtotal - po_commission
                    CommissionLedger.objects.get_or_create(
                        producer_order=po,
                        defaults={
                            "settlement_line": sl,
                            "commission_rate": COMMISSION_RATE,
                            "commission_amount": po_commission,
                            "payout_amount": po_payout,
                        },
                    )

        self.stdout.write(f"  [+] {len(week_buckets)} weekly settlements created.")

    # ── Reviews ───────────────────────────────────────────────────────────────

    def _review_rating_from_seed(self, seed_value):
        bucket = seed_value % 100
        if bucket < 54:
            return 5
        if bucket < 84:
            return 4
        if bucket < 95:
            return 3
        if bucket < 98:
            return 2
        return 1

    def _review_delivery_datetime(self, order_item):
        producer_order = order_item.producer_order
        created_at = producer_order.created_at

        if producer_order.delivery_date:
            delivery_days = max(0, (producer_order.delivery_date - created_at.date()).days)
            return created_at + timedelta(days=delivery_days, hours=12)

        return created_at + timedelta(days=2, hours=6)

    def _review_title_and_text(self, product, rating, seed_value):
        category = (product.category.name if product.category else "").lower()

        category_bases = {
            "vegetables": [
                "Excellent seasonal veg",
                "Fresh produce with great flavour",
                "Lovely local vegetables",
            ],
            "fruit": [
                "Beautifully fresh fruit",
                "Ripe and full of flavour",
                "Great quality seasonal fruit",
            ],
            "bakery": [
                "Brilliant bake quality",
                "Freshly baked and delicious",
                "Great local bakery quality",
            ],
            "dairy": [
                "Creamy and very fresh",
                "Excellent dairy quality",
                "Great local dairy products",
            ],
            "honey & preserves": [
                "Rich flavour and lovely texture",
                "Quality preserves from a local producer",
                "Fantastic local honey",
            ],
            "meat": [
                "Great quality and well prepared",
                "Fresh, tasty and reliable",
                "Excellent local meat quality",
            ],
            "drinks": [
                "Refreshing and well balanced",
                "Great flavour and quality",
                "Brilliant local drinks",
            ],
        }
        positive_closers = [
            "Will definitely order again.",
            "Really pleased with this purchase.",
            "Great value for locally sourced food.",
            "A reliable favourite in our weekly order.",
        ]
        neutral_closers = [
            "Overall a good product and we would buy again.",
            "Solid quality and still better than supermarket alternatives.",
            "Happy overall, with just a couple of minor points.",
        ]
        low_closers = [
            "I appreciate the local approach and would try again.",
            "Hope the next batch is better because we love buying local.",
        ]
        review_cues = [
            "The freshness stood out straight away and everything kept well through the week.",
            "You can taste the local quality, and the lower food miles matter to us.",
            "Delivery was smooth and arrived in good condition.",
            "Great flavour and far better than the equivalent supermarket version.",
            "Lovely to support a producer with strong sustainability values.",
            "Packaging was practical and reduced unnecessary waste.",
        ]

        base_titles = category_bases.get(
            category,
            ["Great local product", "Quality produce from local growers", "Fresh and reliable quality"],
        )

        if rating >= 5:
            title = base_titles[seed_value % len(base_titles)]
        elif rating == 4:
            title = f"{base_titles[seed_value % len(base_titles)]} overall"
        elif rating == 3:
            title = f"Good quality with minor issues"
        elif rating == 2:
            title = f"Not as good as expected this time"
        else:
            title = f"Disappointing batch this time"

        cue_a = review_cues[seed_value % len(review_cues)]
        cue_b = review_cues[(seed_value + 2) % len(review_cues)]

        if rating >= 4:
            closing = positive_closers[seed_value % len(positive_closers)]
            text = f"{product.name} was exactly what we hoped for. {cue_a} {cue_b} {closing}"
        elif rating == 3:
            closing = neutral_closers[seed_value % len(neutral_closers)]
            text = (
                f"{product.name} was generally good and tasted fresh. "
                f"{cue_a} There was slight variation in this batch. {closing}"
            )
        elif rating == 2:
            closing = low_closers[seed_value % len(low_closers)]
            text = (
                f"{product.name} was below our usual expectations on this order. "
                f"Flavour and consistency were a bit uneven, though delivery was still prompt. {closing}"
            )
        else:
            closing = low_closers[seed_value % len(low_closers)]
            text = (
                f"This batch of {product.name} did not meet expectations. "
                f"It seemed less fresh than usual, but we appreciate the producer's local focus. {closing}"
            )

        return title, text

    def _review_response_text(self, product, rating):
        if rating >= 4:
            return (
                f"Thank you for your kind feedback on our {product.name}. "
                "We're really glad you enjoyed it, and we appreciate your support for local Bristol producers."
            )
        if rating == 3:
            return (
                f"Thanks for taking the time to review our {product.name}. "
                "We appreciate the balanced feedback and will keep refining each batch."
            )
        return (
            f"Thank you for your honest feedback on the {product.name}, and sorry this order fell short. "
            "We've shared this with the team and will work to improve consistency on upcoming deliveries."
        )

    def _seed_reviews(self, product_map, customer_map, now):
        delivered_items = list(
            OrderItem.objects.select_related(
                "product",
                "product__category",
                "producer_order__producer",
                "producer_order__order",
                "producer_order__order__account",
            )
            .filter(
                product__isnull=False,
                producer_order__status="delivered",
                producer_order__order__status="completed",
            )
            .order_by("-producer_order__created_at", "-created_at", "-id")
        )

        if not delivered_items:
            self.stdout.write("  [+] 0 reviews created.")
            return

        existing_pairs = set(Review.objects.values_list("account_id", "product_id"))
        latest_item_by_pair = {}
        purchase_count_by_product = {}
        for item in delivered_items:
            account_id = item.producer_order.order.account_id
            key = (account_id, item.product_id)
            if key not in latest_item_by_pair:
                latest_item_by_pair[key] = item
            purchase_count_by_product[item.product_id] = purchase_count_by_product.get(item.product_id, 0) + 1

        created_count = 0

        # 1) Seed curated reviews first (backwards-compatible with 8-field tuples).
        # Optional tuple item 9: edited_days_after_creation (int).
        for entry in REVIEWS:
            if len(entry) < 8:
                continue

            cust_user, prod_name, rating, title, text, anon, days_ago, producer_response = entry[:8]
            edited_days_after_creation = entry[8] if len(entry) >= 9 else None

            if cust_user not in customer_map or prod_name not in product_map:
                continue

            account = customer_map[cust_user][0]
            product = product_map[prod_name]
            key = (account.id, product.id)
            if key in existing_pairs:
                continue

            order_item = latest_item_by_pair.get(key)
            if not order_item:
                continue

            delivered_at = self._review_delivery_datetime(order_item)
            review_created_at = now - timedelta(days=days_ago)
            if review_created_at <= delivered_at:
                review_created_at = delivered_at + timedelta(hours=6 + (order_item.id % 12))
            if review_created_at > now:
                review_created_at = now - timedelta(hours=2 + (order_item.id % 24))

            responded_at = None
            if producer_response:
                responded_at = review_created_at + timedelta(
                    days=1 + (order_item.id % 5),
                    hours=2 + (order_item.id % 6),
                )
                if responded_at > now:
                    responded_at = now - timedelta(hours=1)
                if responded_at <= review_created_at:
                    responded_at = review_created_at + timedelta(hours=12)

            review_updated_at = review_created_at
            if edited_days_after_creation is not None:
                try:
                    edit_days = int(edited_days_after_creation)
                except (TypeError, ValueError):
                    edit_days = 0
                if edit_days > 0:
                    edit_days = max(2, min(20, edit_days))
                    review_updated_at = review_created_at + timedelta(
                        days=edit_days,
                        hours=1 + (order_item.id % 5),
                    )
                    if review_updated_at > now:
                        review_updated_at = now - timedelta(hours=1)
                    if review_updated_at <= review_created_at:
                        review_updated_at = review_created_at + timedelta(hours=12)

            review, created = Review.objects.get_or_create(
                product=product,
                account=account,
                defaults={
                    "order_item": order_item,
                    "rating": rating,
                    "review_title": title,
                    "review_text": text,
                    "is_anonymous": anon,
                    "producer_response": producer_response or "",
                    "responded_at": responded_at,
                },
            )
            if not created:
                continue

            Review.objects.filter(pk=review.pk).update(
                created_at=review_created_at,
                updated_at=review_updated_at,
                responded_at=responded_at,
            )
            created_count += 1
            existing_pairs.add(key)

            self.stdout.write(f"  [+] Review: {cust_user} → {prod_name} ({rating}★)")

        # 2) Auto-generate additional realistic reviews from delivered purchases
        # to improve coverage and density on product pages.
        candidate_items = [
            item
            for key, item in latest_item_by_pair.items()
            if key not in existing_pairs
        ]

        candidate_items.sort(
            key=lambda item: (
                purchase_count_by_product.get(item.product_id, 0),
                getattr(item.product, "stock", 0),
                item.product_id,
                item.id,
            ),
            reverse=True,
        )

        for item in candidate_items:
            account = item.producer_order.order.account
            product = item.product
            key = (account.id, product.id)
            if key in existing_pairs:
                continue

            seed_value = (account.id * 37) + (product.id * 13) + (item.id * 7)
            rating = self._review_rating_from_seed(seed_value)
            title, text = self._review_title_and_text(product, rating, seed_value)

            delivered_at = self._review_delivery_datetime(item)
            review_created_at = delivered_at + timedelta(
                days=2 + (seed_value % 26),
                hours=8 + (seed_value % 9),
            )
            if review_created_at <= delivered_at:
                review_created_at = delivered_at + timedelta(hours=6)
            if review_created_at > now:
                review_created_at = now - timedelta(hours=2 + (seed_value % 36))

            is_anonymous = (seed_value % 7) == 0
            include_response = (seed_value % 4) == 0 or (rating <= 3 and (seed_value % 2) == 0)
            producer_response = self._review_response_text(product, rating) if include_response else ""

            responded_at = None
            if include_response:
                responded_at = review_created_at + timedelta(
                    days=1 + (seed_value % 5),
                    hours=2 + (seed_value % 6),
                )
                if responded_at > now:
                    responded_at = now - timedelta(hours=1)
                if responded_at <= review_created_at:
                    responded_at = review_created_at + timedelta(hours=12)

            # Keep most reviews unedited; a small subset looks naturally edited.
            is_edited = (seed_value % 11) == 0
            review_updated_at = review_created_at
            if is_edited:
                review_updated_at = review_created_at + timedelta(
                    days=2 + (seed_value % 19),
                    hours=1 + (seed_value % 4),
                )
                if review_updated_at > now:
                    review_updated_at = now - timedelta(hours=1)
                if review_updated_at <= review_created_at:
                    review_updated_at = review_created_at + timedelta(hours=12)

            review, created = Review.objects.get_or_create(
                product=product,
                account=account,
                defaults={
                    "order_item": item,
                    "rating": rating,
                    "review_title": title,
                    "review_text": text,
                    "is_anonymous": is_anonymous,
                    "producer_response": producer_response,
                    "responded_at": responded_at,
                },
            )
            if not created:
                continue

            Review.objects.filter(pk=review.pk).update(
                created_at=review_created_at,
                updated_at=review_updated_at,
                responded_at=responded_at,
            )
            created_count += 1
            existing_pairs.add(key)

            self.stdout.write(
                f"  [+] Review: {account.username} → {product.name} ({rating}★)"
            )

        self.stdout.write(f"  [+] {created_count} reviews created.")

    # ── Announcements ────────────────────────────────────────────────────────

    def _seed_announcements(self, admin_acc, now):
        for a in ANNOUNCEMENTS:
            created_at = now - timedelta(days=a["days_ago"])
            obj, created = Announcement.objects.get_or_create(
                title=a["title"],
                defaults={"body": a["body"], "created_by": admin_acc},
            )
            if created:
                Announcement.objects.filter(pk=obj.pk).update(created_at=created_at)
                self.stdout.write(f"  [+] Announcement: {a['title'][:50]}")

    # ── Recurring Orders ──────────────────────────────────────────────────────

    def _seed_recurring_orders(self, org_map, customer_map, product_map, now):
        for r in RECURRING_ORDERS:
            org = org_map.get(r["org_username"])
            if not org:
                continue
            _, _, addr = customer_map[r["org_username"]]
            next_monday = now + timedelta(days=(7 - now.weekday()))

            ro, created = RecurringOrder.objects.get_or_create(
                organisation=org,
                name=r["name"],
                defaults={
                    "delivery_address": addr,
                    "frequency": r["frequency"],
                    "order_day": r["order_day"],
                    "delivery_day": r["delivery_day"],
                    "status": r["status"],
                    "next_run_at": next_monday,
                    "starts_at": now - timedelta(days=90),
                },
            )
            if created:
                for pname, qty in r["items"]:
                    if pname in product_map:
                        RecurringOrderItem.objects.get_or_create(
                            recurring_order=ro,
                            product=product_map[pname],
                            defaults={"quantity": qty},
                        )
                self.stdout.write(f"  [+] Recurring order: {r['name']} for {r['org_username']}")

    # ── Recommendation Interactions ───────────────────────────────────────────

    def _seed_recommendation_interactions(self, product_map, customer_map, now):
        count = 0
        for username, pname, event_type, rank, prob in RECOMMENDATION_INTERACTIONS:
            if username not in customer_map or pname not in product_map:
                continue
            account = customer_map[username][0]
            _, created = RecommendationInteraction.objects.get_or_create(
                account=account,
                product=product_map[pname],
                event_type=event_type,
                defaults={
                    "recommendation_rank": rank,
                    "reorder_probability": prob,
                },
            )
            if created:
                count += 1
        self.stdout.write(f"  [+] {count} recommendation interactions created.")
