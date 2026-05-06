from decimal import Decimal, ROUND_HALF_UP

bulk_quantity_threshold = 20
bulk_discount_percent = Decimal("5.00")
bulk_account_types = {"producer", "restaurant", "community_group"}
money_quant = Decimal("0.01")


def money_amount(value):
    return Decimal(value or 0).quantize(money_quant, rounding=ROUND_HALF_UP)


# product settings override the default bulk threshold and discount.
def get_bulk_threshold(product):
    value = getattr(product, "bulk_stock_threshold", bulk_quantity_threshold)
    return max(1, int(value if value is not None else bulk_quantity_threshold))


def get_bulk_discount_rate(product=None):
    value = getattr(product, "bulk_stock_discount", bulk_discount_percent)
    return Decimal(str(value if value is not None else bulk_discount_percent)) / Decimal("100")


def is_bulk_quantity(product, quantity):
    return int(quantity or 0) >= get_bulk_threshold(product)


def get_individual_quantity_limit(product):
    return max(0, min(bulk_quantity_threshold, get_bulk_threshold(product) - 1))


def has_bulk_items(items):
    return any(is_bulk_quantity(item.product, item.quantity) for item in items)


def has_bulk_item_rows(item_rows):
    return any(is_bulk_quantity(row["product"], row["quantity"]) for row in item_rows)


# bulk ordering is limited to producers and organisation-backed accounts.
def can_use_bulk_orders(user):
    if getattr(user, "account_type", "") in bulk_account_types:
        return True

    customer = getattr(user, "customer_profile", None)
    organisation = getattr(customer, "organisation", None)
    return bool(getattr(organisation, "organisation_type", ""))


def has_bulk_producer_order(producer_order):
    return has_bulk_items(producer_order.items.all())


def has_bulk_order(order):
    return any(has_bulk_producer_order(producer_order) for producer_order in order.producer_orders.all())


# checkout stores the final unit price that was charged for each order item.
def get_checkout_unit_price(price, product=None, quantity=None):
    if product is not None and quantity is not None:
        if is_bulk_quantity(product, quantity):
            return get_bulk_unit_price(price, product)
        return money_amount(price)

    return money_amount(price)


def get_bulk_unit_price(price, product=None):
    return money_amount(Decimal(price or 0) * (Decimal("1.00") - get_bulk_discount_rate(product)))
