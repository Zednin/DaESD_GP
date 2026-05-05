from decimal import Decimal, ROUND_HALF_UP

# Bulk order min quantity
bulk_quantity_threshold = 20

# discount rate on order
bulk_discount_rate = Decimal("0.05")

# round value to 2 decimal place
money_quant = Decimal("0.01")


# convert money to 2dp
def money_amount(value):
    return Decimal(value or 0).quantize(money_quant, rounding=ROUND_HALF_UP)

# check if order items is > 20
def has_bulk_items(items):
    return any(item.quantity > bulk_quantity_threshold for item in items)


# check recurring checkout rows
def has_bulk_item_rows(item_rows):
    return any(row["quantity"] > bulk_quantity_threshold for row in item_rows)

# gets all bulk items in order
def has_bulk_producer_order(producer_order):
    return has_bulk_items(producer_order.items.all())

# gets specific items for each producer that is bulked
def has_bulk_order(order):
    return any(has_bulk_producer_order(producer_order) for producer_order in order.producer_orders.all())

# gets price of each bulk listed item
def get_checkout_unit_price(price, bulk_order):
    if bulk_order:
        return get_bulk_unit_price(price)
    return money_amount(price)

# calculates final price
def get_bulk_unit_price(price):
    return money_amount(Decimal(price or 0) * (Decimal("1.00") - bulk_discount_rate))
