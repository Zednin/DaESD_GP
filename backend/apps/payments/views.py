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

# special instruction text limit
metadata_text_limit = 450

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
    line_items = []
    for row in item_rows:
        product = row["product"]
        unit_price = get_checkout_unit_price(
            product.price,
            product=product,
            quantity=row["quantity"],
        )
        line_items.append({
            "price_data": {
                "currency": "gbp",
                "product_data": {
                    "name": product.name,
                },
                "unit_amount": int(unit_price * 100),
            },
            "quantity": row["quantity"],
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

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        success_url=f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/my-account",
        customer_email=user.email or None,
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

        special_instructions = clean_special_instructions(request.data) if bulk_order else ""
        requested_delivery_date = None

        if bulk_order and recurring_delivery_date:
            requested_delivery_date = recurring_delivery_date
        elif bulk_order:
            requested_delivery_date = clean_requested_delivery_date(request.data)

        if bulk_order and not recurring_delivery_date:
            validate_bulk_delivery_date(cart_items, requested_delivery_date)

        line_items = []
        for item in cart_items:
            unit_price = get_checkout_unit_price(
                item.price_snapshot,
                product=item.product,
                quantity=item.quantity,
            )
            line_items.append({
                "price_data": {
                    "currency": "gbp",
                    "product_data": {
                        "name": item.product.name,
                    },
                    "unit_amount": int(unit_price * 100),
                },
                "quantity": item.quantity,
            })

        frontend_url = settings.FRONTEND_URL

        metadata = {
            "user_id": str(request.user.id),
            "cart_id": str(cart.id),
        }

        if bulk_order:
            metadata["bulk_order"] = "true"
            metadata["requested_delivery_date"] = requested_delivery_date.isoformat()
            if special_instructions:
                metadata["special_instructions"] = special_instructions

        if recurring_payload:
            metadata["recurring_order"] = json.dumps(recurring_payload)

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/cart",
            customer_email=request.user.email or None,
            shipping_address_collection={
                "allowed_countries": ["GB"],
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
    special_instructions = metadata.get("special_instructions", "") if bulk_order else ""
    requested_delivery_date = parse_date(metadata.get("requested_delivery_date", "")) if bulk_order else None

    # saves discounted total for bulk, normal price for standard
    total_amount = money(sum(
        get_checkout_unit_price(
            item.price_snapshot,
            product=item.product,
            quantity=item.quantity,
        ) * item.quantity
        for item in cart_items
    ))

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
            total_amount=total_amount,
            commission_amount=Decimal("0.00"),
            special_instructions=special_instructions,
            stripe_session_id=session["id"],
        )

        Payment.objects.create(
            order=order,
            provider="stripe",
            amount=total_amount,
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

            producer = producer_items[0].product.producer
            delivery_date = (
                timezone.now() + timedelta(hours=producer.lead_time_hours)
            ).date()
            if recurring_delivery_date:
                delivery_date = recurring_delivery_date
            if bulk_order and requested_delivery_date:
                delivery_date = requested_delivery_date

            producer_order = ProducerOrder.objects.create(
                order=order,
                producer_id=producer_id,
                status="pending",
                total_amount=subtotal,
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
    delivery_date = get_delivery_date(recurring_order, event.scheduled_for)

    with transaction.atomic():
        order = Order.objects.create(
            account=account,
            delivery_address=recurring_order.delivery_address,
            status="pending",
            total_amount=total_amount,
            commission_amount=Decimal("0.00"),
            stripe_session_id=session["id"],
        )

        Payment.objects.create(
            order=order,
            provider="stripe",
            amount=total_amount,
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

            producer_order = ProducerOrder.objects.create(
                order=order,
                producer_id=producer_id,
                status="pending",
                total_amount=subtotal,
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
