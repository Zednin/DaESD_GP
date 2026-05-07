import stripe
import json

from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from apps.cart.models import Cart
from apps.orders.models import (
    Order,
    OrderItem,
    ProducerOrder,
    CommissionLedger,
    RecurringOrder,
    RecurringOrderEvent,
    RecurringOrderItem,
)
# recurring order payment functions
from apps.orders.recurring_services import (
    get_delivery_date,
    get_item_rows,
    get_next_run_after,
    money,
)

# bulk payment functions
from apps.orders.bulk_services import (
    can_use_bulk_orders,
    get_checkout_unit_price,
    has_bulk_item_rows,
    has_bulk_items,
)
from apps.payments.models import Payment
from apps.addresses.models import Address
from apps.catalog.models import Product
from apps.communications.email_service import (
    send_customer_order_confirmation,
    send_producer_new_order_notification,
)

stripe.api_key = settings.STRIPE_SECRET_KEY

COMMISSION_RATE = Decimal("0.05")
MIN_STRIPE_PAYMENT_AMOUNT = Decimal("0.30")
DELIVERY_FEE_PER_PRODUCER = Decimal("3.99")
FREE_DELIVERY_THRESHOLD = Decimal("40.00")

# special instruction text limit
metadata_text_limit = 450

def get_customer_default_delivery_address(user):
    customer = getattr(user, "customer_profile", None)

    if customer and customer.default_delivery_address:
        return customer.default_delivery_address

    return (
        Address.objects
        .filter(
            account=user,
            address_type=Address.AddressType.DELIVERY,
            is_default=True,
        )
        .first()
    )


def get_customer_name(user):
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username or user.email


def create_checkout_customer(user, address=None):
    customer_data = {
        "email": user.email or None,
        "name": get_customer_name(user),
    }

    customer_profile = getattr(user, "customer_profile", None)
    if customer_profile and customer_profile.phone_number:
        customer_data["phone"] = customer_profile.phone_number

    if address:
        customer_data["shipping"] = {
            "name": get_customer_name(user),
            "phone": customer_profile.phone_number if customer_profile and customer_profile.phone_number else None,
            "address": {
                "line1": address.address_line_1,
                "line2": address.address_line_2 or "",
                "city": address.city,
                "postal_code": address.postcode,
                "country": "GB",
            },
        }

    return stripe.Customer.create(**customer_data)

def clean_special_instructions(data):
    instructions = str(data.get("special_instructions") or "").strip()

    if len(instructions) > metadata_text_limit:
        raise ValidationError({"detail": "Delivery instructions must be 450 characters or fewer."})

    return instructions


def clean_requested_delivery_date(data):
    value = data.get("requested_delivery_date")
    if not value:
        return None

    requested_date = parse_date(str(value))
    if requested_date is None:
        raise ValidationError({"detail": "Choose a valid delivery date."})
    return requested_date


def validate_stripe_minimum_amount(total_amount):
    if money(total_amount) < MIN_STRIPE_PAYMENT_AMOUNT:
        raise ValidationError({
            "detail": "Card payments must be at least £0.30. Add another item to continue."
        })


def get_row_total(unit_price, quantity):
    return money(Decimal(unit_price) * int(quantity or 0))


def get_checkout_total_from_rows(rows):
    return money(sum((get_row_total(row["unit_price"], row["quantity"]) for row in rows), Decimal("0.00")))


def get_cart_checkout_rows(cart_items):
    return [
        {
            "item": item,
            "unit_price": get_checkout_unit_price(
                item.price_snapshot,
                product=item.product,
                quantity=item.quantity,
            ),
            "quantity": item.quantity,
        }
        for item in cart_items
    ]


def get_recurring_checkout_rows(item_rows):
    return [
        {
            "row": row,
            "unit_price": get_checkout_unit_price(
                row["product"].price,
                product=row["product"],
                quantity=row["quantity"],
            ),
            "quantity": row["quantity"],
        }
        for row in item_rows
    ]

# producer lead times set the earliest allowed delivery window.
def get_cart_lead_time_hours(cart_items):
    return max(
        48,
        *(int(getattr(item.product.producer, "lead_time_hours", 48) or 48) for item in cart_items),
    )


def get_item_rows_lead_time_hours(item_rows):
    return max(
        48,
        *(int(getattr(row["product"].producer, "lead_time_hours", 48) or 48) for row in item_rows),
    )


def get_bulk_min_delivery_date(cart_items):
    lead_time_hours = get_cart_lead_time_hours(cart_items)
    return (timezone.now() + timedelta(hours=lead_time_hours)).date()

def validate_requested_delivery_date(cart_items, requested_delivery_date, fulfilment_method):
    if requested_delivery_date is None:
        label = "pickup" if fulfilment_method == "pickup" else "delivery"
        raise ValidationError({"detail": f"Choose a {label} date for this order."})

    min_delivery_date = get_bulk_min_delivery_date(cart_items)
    if requested_delivery_date < min_delivery_date:
        formatted_date = min_delivery_date.strftime("%d %b %Y")
        label = "Pickup" if fulfilment_method == "pickup" else "Delivery"
        raise ValidationError({"detail": f"{label} must be on or after {formatted_date}."})

def clean_requested_delivery_dates(data):
    value = data.get("requested_delivery_dates")

    if not isinstance(value, dict):
        raise ValidationError({"detail": "Choose a date for each producer."})

    cleaned = {}

    for producer_id, date_value in value.items():
        requested_date = parse_date(str(date_value))

        if requested_date is None:
            raise ValidationError({"detail": "Choose valid dates for each producer."})

        cleaned[str(producer_id)] = requested_date

    return cleaned


def validate_requested_delivery_dates(cart_items, requested_delivery_dates, fulfilment_method):
    label = "pickup" if fulfilment_method == "pickup" else "delivery"

    producer_items = {}
    for item in cart_items:
        producer_id = str(item.product.producer_id)
        producer_items.setdefault(producer_id, []).append(item)

    for producer_id, items in producer_items.items():
        requested_date = requested_delivery_dates.get(producer_id)

        if requested_date is None:
            producer_name = items[0].product.producer.company_name
            raise ValidationError({"detail": f"Choose a {label} date for {producer_name}."})

        min_date = get_bulk_min_delivery_date(items)
        if requested_date < min_date:
            producer_name = items[0].product.producer.company_name
            formatted_date = min_date.strftime("%d %b %Y")
            raise ValidationError({
                "detail": f"{producer_name} must be on or after {formatted_date}."
            })


def serialise_requested_delivery_dates(requested_delivery_dates):
    return json.dumps({
        str(producer_id): delivery_date.isoformat()
        for producer_id, delivery_date in requested_delivery_dates.items()
    })


def parse_requested_delivery_dates_metadata(metadata):
    try:
        raw = json.loads(metadata.get("requested_delivery_dates", "{}"))
    except (TypeError, json.JSONDecodeError):
        return {}

    parsed = {}
    for producer_id, date_value in raw.items():
        parsed_date = parse_date(str(date_value))
        if parsed_date:
            parsed[str(producer_id)] = parsed_date

    return parsed

def validate_bulk_delivery_date(cart_items, requested_delivery_date):
    if requested_delivery_date is None:
        raise ValidationError({"detail": "Choose a delivery date for this bulk order."})

    min_delivery_date = get_bulk_min_delivery_date(cart_items)
    if requested_delivery_date < min_delivery_date:
        formatted_date = min_delivery_date.strftime("%d %b %Y")
        raise ValidationError({"detail": f"Bulk delivery must be on or after {formatted_date}."})


def get_restaurant_organisation(user):
    customer = getattr(user, "customer_profile", None)
    organisation = getattr(customer, "organisation", None)

    if getattr(user, "account_type", "") == "restaurant" and organisation:
        return organisation

    if getattr(organisation, "organisation_type", "") == "restaurant":
        return organisation

    return None


def clean_recurring_payload(data):
    if not isinstance(data, dict):
        raise ValueError("Recurring order details are invalid.")

    frequency = data.get("frequency", "weekly")
    if frequency not in {"weekly", "fortnightly"}:
        raise ValueError("Recurring order frequency is invalid.")

    try:
        order_day = int(data.get("order_day", 0))
        delivery_day = int(data.get("delivery_day", 2))
    except (TypeError, ValueError):
        raise ValueError("Recurring order days are invalid.")

    if order_day not in range(7) or delivery_day not in range(7):
        raise ValueError("Recurring order days are invalid.")

    name = str(data.get("name") or "My recurring order").strip()[:100]

    return {
        "name": name or "My recurring order",
        "frequency": frequency,
        "order_day": order_day,
        "delivery_day": delivery_day,
    }


def get_recurring_delivery_lead_hours(order_day, delivery_day):
    days_between = (int(delivery_day) - int(order_day)) % 7
    if days_between == 0:
        days_between = 7
    return days_between * 24


def validate_recurring_delivery_lead_time(cart_items, recurring_payload):
    lead_time_hours = get_cart_lead_time_hours(cart_items)
    validate_recurring_delivery_lead_hours(lead_time_hours, recurring_payload)


# recurring schedules must still respect producer lead times at checkout time.
def validate_recurring_delivery_lead_hours(lead_time_hours, recurring_payload):
    delivery_lead_hours = get_recurring_delivery_lead_hours(
        recurring_payload["order_day"],
        recurring_payload["delivery_day"],
    )

    if delivery_lead_hours < lead_time_hours:
        raise ValidationError({
            "detail": f"Recurring delivery day must be at least {lead_time_hours} hours after the order day."
        })


def get_next_run_at(order_day):
    now = timezone.now()
    days_until_next = (int(order_day) - now.weekday()) % 7
    if days_until_next == 0:
        days_until_next = 7
    return now + timedelta(days=days_until_next)


def get_recurring_payload_schedule(recurring_payload):
    scheduled_for = get_next_run_at(recurring_payload["order_day"])
    days_until_delivery = (
        int(recurring_payload["delivery_day"]) - int(recurring_payload["order_day"])
    ) % 7
    if days_until_delivery == 0:
        days_until_delivery = 7
    return scheduled_for, (scheduled_for + timedelta(days=days_until_delivery)).date()



def get_cart_stock_error(cart_items):
    for item in cart_items:
        product = item.product

        if product.status != "available":
            return f"{product.name} is currently unavailable."

        if item.quantity > product.stock:
            return (
                f"Only {product.stock} {product.unit or 'item'}"
                f"{'' if product.stock == 1 else 's'} of {product.name} are in stock."
            )

    return None

def clean_fulfilment_method(data):
    value = str(data.get("fulfilment_method") or "delivery").strip()
    if value not in {"delivery", "pickup"}:
        raise ValidationError({"detail": "Choose delivery or pickup."})
    return value


def get_producer_count(cart_items):
    return len({item.product.producer_id for item in cart_items})


def get_delivery_fee(total_amount, cart_items, fulfilment_method):
    if fulfilment_method != "delivery":
        return Decimal("0.00")
    if money(total_amount) >= FREE_DELIVERY_THRESHOLD:
        return Decimal("0.00")
    return money(DELIVERY_FEE_PER_PRODUCER * get_producer_count(cart_items))

def safe_send_customer_email(order):
    try:
        send_customer_order_confirmation(order)
    except Exception as e:
        print(f"Customer order email failed for order {order.id}: {e}")


def safe_send_producer_email(producer_order):
    try:
        send_producer_new_order_notification(producer_order)
    except Exception as e:
        print(f"Producer order email failed for producer order {producer_order.id}: {e}")

# validate items on checkout
def validate_cart_items_for_checkout(cart_items):
    unavailable_names = []
    stock_names = []

    # ENSURE THEY ARE AVAILABLE
    for item in cart_items:
        if item.product.status != "available":
            unavailable_names.append(item.product.name)
        if item.product.stock < item.quantity:
            stock_names.append(f"{item.product.name} ({item.product.stock} available)")

    # messages to list unavailable items
    messages = []
    if unavailable_names:
        messages.append(f"Unavailable: {', '.join(unavailable_names)}")

    # incase stock is low
    if stock_names:
        messages.append(f"Not enough stock: {', '.join(stock_names)}")

    if messages:
        raise ValidationError({"detail": "; ".join(messages)})


# builds stripe checkout for recurring events.
def create_recurring_checkout_session(user, event, item_payloads=None):
    item_rows = get_item_rows(event.recurring_order, item_payloads)
    bulk_order = has_bulk_item_rows(item_rows)
    if bulk_order and not can_use_bulk_orders(user):
        raise ValidationError({"detail": "Bulk orders are only available for organisation and producer accounts."})

    validate_recurring_delivery_lead_hours(
        get_item_rows_lead_time_hours(item_rows),
        {
            "order_day": event.recurring_order.order_day,
            "delivery_day": event.recurring_order.delivery_day,
        },
    )

    recurring_items = [
        {"product": row["product"].id, "quantity": row["quantity"]}
        for row in item_rows
    ]

    # gets all the items
    checkout_rows = get_recurring_checkout_rows(item_rows)
    validate_stripe_minimum_amount(get_checkout_total_from_rows(checkout_rows))

    line_items = []
    for checkout_row in checkout_rows:
        row = checkout_row["row"]
        product = row["product"]
        line_items.append({
            "price_data": {
                "currency": "gbp",
                "product_data": {
                    "name": product.name,
                },
                "unit_amount": int(checkout_row["unit_price"] * 100),
            },
            "quantity": checkout_row["quantity"],
        })

    # directs to frontend container
    frontend_url = settings.FRONTEND_URL
    metadata = {
        # the webhook uses this split to create the linked recurring order once.
        "checkout_kind": "recurring_confirmation",
        "user_id": str(user.id),
        "recurring_order_id": str(event.recurring_order_id),
        "recurring_event_id": str(event.id),
        "recurring_items": json.dumps(recurring_items),
    }
    if bulk_order:
        metadata["bulk_order"] = "true"
        
    default_address = get_customer_default_delivery_address(user)
    stripe_customer = create_checkout_customer(user, default_address)

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        success_url=f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/my-account",
        customer=stripe_customer.id,
        shipping_address_collection={
            "allowed_countries": ["GB"],
        },
        customer_update={
            "shipping": "auto",
        },
        metadata=metadata,
    )
    return session


# recurring order checkout
class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    # gets cart items and groups items by producer
    def post(self, request):
        cart, _ = Cart.objects.get_or_create(account=request.user)
        items = (
            cart.items
            .select_related("product", "product__producer")
            .prefetch_related("product__allergens")
            .all()
        )

        if not items.exists():
            return Response(
                {"detail": "Cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recurring_payload = None
        if request.data.get("recurring"):
            if not get_restaurant_organisation(request.user):
                return Response(
                    {"detail": "Recurring orders are only available for restaurant customers."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            try:
                recurring_payload = clean_recurring_payload(request.data.get("recurring"))
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        cart_items = list(items)
        validate_cart_items_for_checkout(cart_items)

        if recurring_payload:
            validate_recurring_delivery_lead_time(cart_items, recurring_payload)

        has_allergen_products = any(item.product.allergens.exists() for item in cart_items)
        if has_allergen_products and not request.data.get("allergen_acknowledged"):
            return Response(
                {
                    "detail": "Please confirm that you have reviewed the allergen information before checkout."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # checks if any items are bulked
        bulk_order = has_bulk_items(cart_items)
        if bulk_order and not can_use_bulk_orders(request.user):
            return Response(
                {"detail": "Bulk orders are only available for organisation and producer accounts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recurring_delivery_date = None
        if recurring_payload:
            recurring_delivery_date = get_recurring_payload_schedule(recurring_payload)[1]

        requested_delivery_dates = {}
        if recurring_delivery_date:
            requested_delivery_dates = {
                str(item.product.producer_id): recurring_delivery_date
                for item in cart_items
            }
        else:
            requested_delivery_dates = clean_requested_delivery_dates(request.data)

        checkout_rows = get_cart_checkout_rows(cart_items)
        items_total = get_checkout_total_from_rows(checkout_rows)
        fulfilment_method = clean_fulfilment_method(request.data)
        special_instructions = clean_special_instructions(request.data)
        if not recurring_payload:
            validate_requested_delivery_dates(
                cart_items,
                requested_delivery_dates,
                fulfilment_method,
            )

        delivery_fee = get_delivery_fee(items_total, cart_items, fulfilment_method)
        checkout_total = money(items_total + delivery_fee)

        validate_stripe_minimum_amount(checkout_total)

        line_items = []
        for checkout_row in checkout_rows:
            item = checkout_row["item"]
            line_items.append({
                "price_data": {
                    "currency": "gbp",
                    "product_data": {
                        "name": item.product.name,
                    },
                    "unit_amount": int(checkout_row["unit_price"] * 100),
                },
                "quantity": checkout_row["quantity"],
            })

        frontend_url = settings.FRONTEND_URL

        metadata = {
            "user_id": str(request.user.id),
            "cart_id": str(cart.id),
            "fulfilment_method": fulfilment_method,
            "delivery_fee": str(delivery_fee),
        }

        if bulk_order:
            metadata["bulk_order"] = "true"

        if requested_delivery_dates:
            metadata["requested_delivery_dates"] = serialise_requested_delivery_dates(
                requested_delivery_dates
            )

        if recurring_payload:
            metadata["recurring_order"] = json.dumps(recurring_payload)
            
        if delivery_fee > 0:
            line_items.append({
                "price_data": {
                    "currency": "gbp",
                    "product_data": {
                        "name": "Delivery fee",
                    },
                    "unit_amount": int(delivery_fee * 100),
                },
                "quantity": 1,
            })
            
        if special_instructions:
            metadata["special_instructions"] = special_instructions

        default_address = get_customer_default_delivery_address(request.user)
        stripe_customer = create_checkout_customer(request.user, default_address)

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/cart",
            customer=stripe_customer.id,
            shipping_address_collection={
                "allowed_countries": ["GB"],
            },
            customer_update={
                "shipping": "auto",
            },
            metadata=metadata,
        )

        return Response({"url": session.url}, status=status.HTTP_200_OK)

@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        return HttpResponse("Invalid payload", status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse("Invalid signature", status=400)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        handle_checkout_session_completed(session)

    return HttpResponse(status=200)

# completed checkout
def handle_checkout_session_completed(session):

    # get meta data from stripe
    metadata = session.get("metadata", {})
    if metadata.get("checkout_kind") == "recurring_confirmation":
        handle_recurring_checkout_session_completed(session)
        return

    user_id = metadata.get("user_id")
    cart_id = metadata.get("cart_id")

    if not user_id or not cart_id:
        return

    # Stripe can retry webhooks, so the session id is the idempotency guard.
    if Order.objects.filter(stripe_session_id=session["id"]).exists():
        return

    try:
        cart = Cart.objects.prefetch_related("items__product__producer").get(
            id=cart_id,
            account_id=user_id,
        )
    except Cart.DoesNotExist:
        return

    cart_items = list(cart.items.all())
    if not cart_items:
        return

    recurring_payload = None
    if metadata.get("recurring_order"):
        try:
            recurring_payload = clean_recurring_payload(
                json.loads(metadata["recurring_order"])
            )
        except (TypeError, ValueError, json.JSONDecodeError):
            recurring_payload = None

    recurring_scheduled_for = None
    recurring_delivery_date = None
    if recurring_payload:
        recurring_scheduled_for, recurring_delivery_date = get_recurring_payload_schedule(
            recurring_payload
        )

    # checks metadata
    bulk_order = metadata.get("bulk_order") == "true" and has_bulk_items(cart_items)
    special_instructions = metadata.get("special_instructions", "")
    requested_delivery_dates = parse_requested_delivery_dates_metadata(metadata)

    fulfilment_method = metadata.get("fulfilment_method", "delivery")
    if fulfilment_method not in {"delivery", "pickup"}:
        fulfilment_method = "delivery"

    try:
        delivery_fee = money(Decimal(metadata.get("delivery_fee", "0.00")))
    except Exception:
        delivery_fee = Decimal("0.00")

    # saves discounted total for bulk, normal price for standard
    total_amount = money(sum(
        get_checkout_unit_price(
            item.price_snapshot,
            product=item.product,
            quantity=item.quantity,
        ) * item.quantity
        for item in cart_items
    ))
    order_total_amount = money(total_amount + delivery_fee)

    shipping = session.get("shipping_details") or {}
    customer_details = session.get("customer_details") or {}
    address = shipping.get("address") or customer_details.get("address") or {}

    line1 = address.get("line1")
    city = address.get("city")
    postcode = address.get("postal_code")

    if not line1 or not city or not postcode:
        print("Missing Stripe address data")
        print("shipping_details:", shipping)
        print("customer_details:", customer_details)
        print("full session:", session)
        return

    with transaction.atomic():
        product_ids = [item.product_id for item in cart_items]
        locked_products = {
            product.id: product
            for product in Product.objects.select_for_update().filter(id__in=product_ids)
        }

        for cart_item in cart_items:
            locked_product = locked_products.get(cart_item.product_id)

            if locked_product is None:
                return

            cart_item.product = locked_product

        stock_error = get_cart_stock_error(cart_items)
        if stock_error:
            print(f"Stripe webhook stock validation failed: {stock_error}")
            return

        delivery_address = Address.objects.create(
            account_id=user_id,
            address_type=Address.AddressType.DELIVERY,
            is_default=False,
            address_line_1=line1,
            address_line_2=address.get("line2", ""),
            city=city,
            postcode=postcode,
        )

        order = Order.objects.create(
            account_id=user_id,
            delivery_address=delivery_address,
            status="pending",
            total_amount=order_total_amount,
            fulfilment_method=fulfilment_method,
            delivery_fee=delivery_fee,
            commission_amount=Decimal("0.00"),
            special_instructions=special_instructions,
            stripe_session_id=session["id"],
        )

        Payment.objects.create(
            order=order,
            provider="stripe",
            amount=order_total_amount,
            currency="GBP",
            status="paid",
        )

        items_by_producer = {}
        for cart_item in cart_items:
            producer_id = cart_item.product.producer_id
            items_by_producer.setdefault(producer_id, []).append(cart_item)

        total_commission = Decimal("0.00")

        for producer_id, producer_items in items_by_producer.items():
            subtotal = money(sum(
                get_checkout_unit_price(
                    item.price_snapshot,
                    product=item.product,
                    quantity=item.quantity,
                ) * item.quantity
                for item in producer_items
            ))

            commission = money(subtotal * COMMISSION_RATE)
            payout_amount = money(subtotal - commission)
            total_commission += commission

            producer_delivery_fee = Decimal("0.00")
            if fulfilment_method == "delivery" and delivery_fee > 0:
                producer_delivery_fee = DELIVERY_FEE_PER_PRODUCER

            producer = producer_items[0].product.producer
            delivery_date = (
                timezone.now() + timedelta(hours=producer.lead_time_hours)
            ).date()
            if recurring_delivery_date:
                delivery_date = recurring_delivery_date
            producer_requested_date = requested_delivery_dates.get(str(producer_id))
            if producer_requested_date:
                delivery_date = producer_requested_date

            producer_order = ProducerOrder.objects.create(
                order=order,
                producer_id=producer_id,
                status="pending",
                total_amount=subtotal,
                delivery_fee=producer_delivery_fee,
                delivery_date=delivery_date,
            )

            for cart_item in producer_items:
                price_snapshot = get_checkout_unit_price(
                    cart_item.price_snapshot,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                )
                line_total = money(price_snapshot * cart_item.quantity)

                OrderItem.objects.create(
                    producer_order=producer_order,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    price_snapshot=price_snapshot,
                    line_total=line_total,
                )

            CommissionLedger.objects.create(
                producer_order=producer_order,
                commission_rate=Decimal("5.00"),
                commission_amount=commission,
                payout_amount=payout_amount,
            )

        if recurring_payload:
            organisation = get_restaurant_organisation(order.account)
            if organisation:
                recurring_order = RecurringOrder.objects.create(
                    organisation=organisation,
                    delivery_address=delivery_address,
                    name=recurring_payload["name"],
                    frequency=recurring_payload["frequency"],
                    order_day=recurring_payload["order_day"],
                    delivery_day=recurring_payload["delivery_day"],
                    next_run_at=recurring_scheduled_for,
                )

                for cart_item in cart_items:
                    RecurringOrderItem.objects.create(
                        recurring_order=recurring_order,
                        product=cart_item.product,
                        quantity=cart_item.quantity,
                    )

                RecurringOrderEvent.objects.create(
                    recurring_order=recurring_order,
                    scheduled_for=recurring_scheduled_for,
                    status="created",
                    order=order,
                )

        order.commission_amount = money(total_commission)
        order.save(update_fields=["commission_amount"])

        cart.items.all().delete()

        producer_orders = list(
            order.producer_orders.all()
            .select_related("producer")
            .prefetch_related("items__product")
        )

        transaction.on_commit(lambda: safe_send_customer_email(order))

        for producer_order in producer_orders:
            transaction.on_commit(
                lambda po=producer_order: safe_send_producer_email(po)
            )

# Handle completed checkout for recurring event
def handle_recurring_checkout_session_completed(session):

    # what happened, is it recurring?, who did that
    metadata = session.get("metadata", {})
    event_id = metadata.get("recurring_event_id")
    user_id = metadata.get("user_id")
    fulfilment_method = metadata.get("fulfilment_method", "delivery")
    if fulfilment_method not in {"delivery", "pickup"}:
        fulfilment_method = "delivery"

    try:
        delivery_fee = money(Decimal(metadata.get("delivery_fee", "0.00")))
    except Exception:
        delivery_fee = Decimal("0.00")
    special_instructions = metadata.get("special_instructions", "")

    if not event_id or not user_id:
        return

    if Order.objects.filter(stripe_session_id=session["id"]).exists():
        return

    try:
        event = (
            RecurringOrderEvent.objects
            .select_related(
                "recurring_order__organisation__customer__account",
                "recurring_order__delivery_address",
            )
            .get(id=event_id, recurring_order__organisation__customer__account_id=user_id)
        )
    except RecurringOrderEvent.DoesNotExist:
        return

    if event.order_id:
        return

    try:
        item_payloads = json.loads(metadata.get("recurring_items", "[]"))
    except (TypeError, json.JSONDecodeError):
        return

    try:
        event_items = get_item_rows(
            event.recurring_order,
            item_payloads,
            validate_availability=False,
        )
    except ValidationError:
        return

    if not event_items:
        return

    recurring_order = event.recurring_order
    account = recurring_order.organisation.customer.account
    bulk_order = has_bulk_item_rows(event_items)
    total_amount = money(sum(
        (
            get_checkout_unit_price(
                row["product"].price,
                product=row["product"],
                quantity=row["quantity"],
            ) * row["quantity"]
            for row in event_items
        ),
        Decimal("0.00"),
    ))
    order_total_amount = money(total_amount + delivery_fee)
    delivery_date = get_delivery_date(recurring_order, event.scheduled_for)

    with transaction.atomic():
        order = Order.objects.create(
            account=account,
            delivery_address=recurring_order.delivery_address,
            status="pending",
            total_amount=order_total_amount,
            fulfilment_method=fulfilment_method,
            delivery_fee=delivery_fee,
            special_instructions=special_instructions,
            commission_amount=Decimal("0.00"),
            stripe_session_id=session["id"],
        )

        Payment.objects.create(
            order=order,
            provider="stripe",
            amount=order_total_amount,
            currency="GBP",
            status="paid",
        )

        items_by_producer = {}
        for row in event_items:
            producer_id = row["product"].producer_id
            items_by_producer.setdefault(producer_id, []).append(row)

        total_commission = Decimal("0.00")

        for producer_id, producer_items in items_by_producer.items():
            subtotal = money(sum(
                (
                    get_checkout_unit_price(
                        item["product"].price,
                        product=item["product"],
                        quantity=item["quantity"],
                    ) * item["quantity"]
                    for item in producer_items
                ),
                Decimal("0.00"),
            ))
            commission = money(subtotal * COMMISSION_RATE)
            payout_amount = money(subtotal - commission)
            total_commission += commission
            
            producer_delivery_fee = Decimal("0.00")
            if fulfilment_method == "delivery" and delivery_fee > 0:
                producer_delivery_fee = DELIVERY_FEE_PER_PRODUCER

            producer_order = ProducerOrder.objects.create(
                order=order,
                producer_id=producer_id,
                status="pending",
                total_amount=subtotal,
                delivery_fee=producer_delivery_fee,
                delivery_date=delivery_date,
            )
            

            for item in producer_items:
                product = item["product"]
                quantity = item["quantity"]
                price_snapshot = get_checkout_unit_price(
                    product.price,
                    product=product,
                    quantity=quantity,
                )
                OrderItem.objects.create(
                    producer_order=producer_order,
                    product=product,
                    quantity=quantity,
                    price_snapshot=price_snapshot,
                    line_total=money(price_snapshot * quantity),
                )

            CommissionLedger.objects.create(
                producer_order=producer_order,
                commission_rate=Decimal("5.00"),
                commission_amount=commission,
                payout_amount=payout_amount,
            )

        order.commission_amount = money(total_commission)
        order.save(update_fields=["commission_amount"])

        event.order = order
        event.save(update_fields=["order"])

        recurring_order.next_run_at = get_next_run_after(recurring_order, event.scheduled_for)
        recurring_order.save(update_fields=["next_run_at", "updated_at"])

        producer_orders = list(
            order.producer_orders.all()
            .select_related("producer")
            .prefetch_related("items__product")
        )

        transaction.on_commit(lambda: safe_send_customer_email(order))

        for producer_order in producer_orders:
            transaction.on_commit(
                lambda po=producer_order: safe_send_producer_email(po)
            )
