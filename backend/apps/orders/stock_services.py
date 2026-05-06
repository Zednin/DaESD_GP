from apps.catalog.models import InventoryAdjustment, Product
from rest_framework.exceptions import ValidationError


def deduct_stock_for_producer_order(producer_order, user=None):
    items = list(producer_order.items.select_related("product"))
    if not items:
        return

    item_ids = [item.id for item in items]
    adjusted_item_ids = set(
        InventoryAdjustment.objects.filter(
            order_item_id__in=item_ids,
            reason="order_adjustment",
        ).values_list("order_item_id", flat=True)
    )
    product_ids = [
        item.product_id
        for item in items
        if item.id not in adjusted_item_ids
    ]
    products = {
        product.id: product
        for product in Product.objects.select_for_update().filter(id__in=product_ids)
    }

    for item in items:
        if item.id in adjusted_item_ids:
            continue

        product = products[item.product_id]
        if product.stock < item.quantity:
            detail = (
                f"Cannot accept order: insufficient {product.name} stock "
                f"({product.stock} available, {item.quantity} needed)."
            )
            raise ValidationError(
                {"detail": detail}
            )

        # inventory adjustments own the stock mutation and audit trail.
        InventoryAdjustment.objects.create(
            product=product,
            order_item=item,
            delta_quantity=-item.quantity,
            reason="order_adjustment",
            changed_by=user,
        )

        if product.stock == 0 and product.status != "unavailable":
            product.status = "unavailable"
            product.save(update_fields=["status", "updated_at"])