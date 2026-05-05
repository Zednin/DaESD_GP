from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Product
from .models import RecurringOrderEvent

# convert p's to 2dp
def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

# calculate delivery date from recurring order
def get_delivery_date(recurring_order, scheduled_for=None):
    scheduled = scheduled_for or recurring_order.next_run_at
    days_until_delivery = (int(recurring_order.delivery_day) - int(recurring_order.order_day)) % 7
    if days_until_delivery == 0:
        days_until_delivery = 7
    return (scheduled + timedelta(days=days_until_delivery)).date()

# calcualte next run, depending if order is weekly or fortnite
def get_next_run_after(recurring_order, scheduled_for=None):
    scheduled = scheduled_for or recurring_order.next_run_at
    interval_days = 14 if recurring_order.frequency == "fortnightly" else 7
    return scheduled + timedelta(days=interval_days)

# finds next scheduled event
def get_or_create_next_event(recurring_order):
    event = RecurringOrderEvent.objects.get_or_create(
        recurring_order=recurring_order,
        scheduled_for=recurring_order.next_run_at,
        defaults={
            "status": "created",
        },
    )[0]
    return event

# schedule object used in front end
def get_schedule_payload(recurring_order, event, schedule_status):
    delivery_date = get_delivery_date(recurring_order, event.scheduled_for)
    next_scheduled_for = get_next_run_after(recurring_order, event.scheduled_for)
    next_delivery_date = get_delivery_date(recurring_order, next_scheduled_for)

    return {
        "event_id": event.id,
        "status": schedule_status,
        "scheduled_for": event.scheduled_for,
        "delivery_date": delivery_date,
        "order_id": event.order_id,
        "order_reference": event.order_id,
        "order_status": event.order.status if event.order_id else None,
        "paid_at": event.order.created_at if event.order_id else None,
        "next_scheduled_for": next_scheduled_for,
        "next_delivery_date": next_delivery_date,
    }

# checks if the current schedule is paid
def get_current_schedule(recurring_order):
    paid_event = (
        recurring_order.events
        .filter(order__isnull=False)
        .select_related("order")
        .order_by("-scheduled_for")
        .first()
    )
    # if paid label status as confirmed
    if paid_event and get_delivery_date(recurring_order, paid_event.scheduled_for) >= timezone.localdate():
        return get_schedule_payload(recurring_order, paid_event, "confirmed")

    # status of different orders
    event = get_or_create_next_event(recurring_order)
    if event.order_id:
        schedule_status = "confirmed"
    elif event.status == "skipped":
        schedule_status = "cancelled"
    else:
        schedule_status = "pending"

    return get_schedule_payload(recurring_order, event, schedule_status)


@transaction.atomic # protects from partial writes
def get_payable_event(recurring_order):

    # Finds next payable event (this week ordered / cancelled, prepare next week)
    event = get_or_create_next_event(recurring_order)
    if event.order_id:
        return event

    # if date is in the past, move recurring order schedule forward
    # prevent paying for cancelled events
    scheduled_for = event.scheduled_for
    should_move_forward = event.status == "skipped" and scheduled_for <= timezone.now()
    should_move_forward = should_move_forward or (event.status != "skipped" and scheduled_for <= timezone.now())

    if should_move_forward:
        while scheduled_for <= timezone.now():
            scheduled_for = get_next_run_after(recurring_order, scheduled_for)

        recurring_order.next_run_at = scheduled_for
        recurring_order.save(update_fields=["next_run_at", "updated_at"])
        event = get_or_create_next_event(recurring_order)

    # if order is skipped or cancelled, saved as just created instead of arranging event
    if event.status == "skipped":
        event.status = "created"
        event.save(update_fields=["status"])

    return event

# gets last paid recurring order
def get_last_paid_event(recurring_order):
    return (
        recurring_order.events
        .filter(order__isnull=False)
        .order_by("-scheduled_for")
        .first()
    )

# collects problems before raising error
def validate_item_rows_available(item_rows):
    unavailable_names = []
    stock_names = []

    # checks each item in order,
    for row in item_rows:
        product = row["product"]
        quantity = row["quantity"]

        # checks availaibility
        if product.status != "available":
            unavailable_names.append(product.name)

        # checks if enough stock for order
        if product.stock < quantity:
            stock_names.append(f"{product.name} ({product.stock} available)")

    # messagegs 
    messages = []
    if unavailable_names:
        messages.append(f"Unavailable: {', '.join(unavailable_names)}")
    if stock_names:
        messages.append(f"Not enough stock: {', '.join(stock_names)}")

    if messages:
        raise ValidationError({"items": "; ".join(messages)})


# tuns recurring template into a list 
def get_item_rows(recurring_order, item_payloads=None, validate_availability=True):

    # check if there is custom payload to order
    # if not just default to recurring template product x quantity
    if item_payloads is None:
        template_items = recurring_order.items.select_related("product", "product__producer")
        item_rows = [
            {
                "product": item.product,
                "quantity": item.quantity,
            }
            for item in template_items
        ]
        if validate_availability:
            validate_item_rows_available(item_rows)
        return item_rows

    # Checks if inputs are valid before confirming order, 
    quantities_by_product = {}
    for item in item_payloads:
        product_id = item.get("product") or item.get("product_id")
        try:
            product_id = int(product_id)
            quantity = int(item.get("quantity"))
        except (TypeError, ValueError):
            raise ValidationError({"items": "Recurring order items are invalid."})

        if quantity < 0:
            raise ValidationError({"items": "Item quantities cannot be negative."})
        if quantity == 0:
            continue

        quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + quantity

    if not quantities_by_product:
        raise ValidationError({"items": "Choose at least one item for this delivery."})

    template_product_ids = set(
        recurring_order.items.values_list("product_id", flat=True)
    )
    if set(quantities_by_product.keys()) - template_product_ids:
        raise ValidationError({"items": "Confirm delivery items must belong to the recurring order."})

    products = {
        product.id: product
        for product in Product.objects.filter(id__in=quantities_by_product.keys()).select_related("producer")
    }

    missing_ids = set(quantities_by_product.keys()) - set(products.keys())
    if missing_ids:
        raise ValidationError({"items": "One or more products could not be found."})

    item_rows = [
        {
            "product": products[product_id],
            "quantity": quantity,
        }
        for product_id, quantity in quantities_by_product.items()
    ]

    if validate_availability:
        validate_item_rows_available(item_rows)

    return item_rows

# cancels / skips unpaid event
@transaction.atomic
def skip_next_event(recurring_order):
    event = get_or_create_next_event(recurring_order)

    if event.order_id:
        raise ValidationError({"detail": "This recurring delivery has already been paid."})

    event.status = "skipped"
    event.save(update_fields=["status"])

    return event