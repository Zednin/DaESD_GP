from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CartItem, Cart
from .serializers import CartSerializer
from apps.catalog.models import Product
from apps.orders.bulk_services import can_use_bulk_orders, get_individual_quantity_limit


def _get_effective_price(product):
    """Return surplus_price if the product has an active surplus deal, else regular price."""
    if product.surplus_active:
        return product.surplus_price
    return product.price

def _stock_error(product, requested_quantity, user=None):
    if product.status != "available":
        return f"{product.name} is currently unavailable."

    individual_limit = get_individual_quantity_limit(product)
    if user is not None and requested_quantity > individual_limit and not can_use_bulk_orders(user):
        return f"Individual customers can add up to {individual_limit} of each item."

    if requested_quantity > product.stock:
        return (
            f"Only {product.stock} {product.unit or 'item'}"
            f"{'' if product.stock == 1 else 's'} of {product.name} are in stock."
        )

    return None


def _parse_positive_int(value, default=1):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    return max(1, parsed)


class CartViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post"]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(account=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=["post"], url_path="merge")
    def merge(self, request):
        """
        Expects: { "items": [ { "product_id": 1, "qty": 2 }, ... ] }
        Merges into user's cart (adds quantities).
        """
        cart, _ = Cart.objects.get_or_create(account=request.user)
        items = request.data.get("items", [])

        for it in items:
            product_id = it.get("product_id")
            qty = _parse_positive_int(it.get("qty", 1))

            if not product_id:
                continue

            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                continue

            existing_quantity = (
                CartItem.objects
                .filter(cart=cart, product=product)
                .values_list("quantity", flat=True)
                .first()
            ) or 0

            requested_total = existing_quantity + qty
            error = _stock_error(product, requested_total, request.user)

            if error:
                return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={"quantity": qty, "price_snapshot": _get_effective_price(product)},
            )

            if not created:
                cart_item.quantity += qty
            cart_item.price_snapshot = _get_effective_price(product)
            cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
    


class CartItemViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    # Security check: only return recurring orders that belong to the logged-in user's organisation.
    def get_queryset(self):
        return CartItem.objects.filter(cart__account=self.request.user)

    def create(self, request):
        cart, _ = Cart.objects.get_or_create(account=request.user)
        try:
            product = Product.objects.get(id=request.data["product_id"])
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        requested_quantity = _parse_positive_int(request.data.get("quantity", 1))
        existing_quantity = (
            CartItem.objects
            .filter(cart=cart, product=product)
            .values_list("quantity", flat=True)
            .first()
        ) or 0
        requested_total = existing_quantity + requested_quantity

        error = _stock_error(product, requested_total, request.user)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={
                "quantity": requested_quantity,
                "price_snapshot": _get_effective_price(product),
            },
        )

        if not created:
            item.quantity += requested_quantity
        item.price_snapshot = _get_effective_price(product)
        item.save()

        return Response({"status": "ok"})
    
    def partial_update(self, request, *args, **kwargs):
        # PATCH /cart-items/<id>/ { "quantity": 3 }
        item = self.get_object()
        qty = _parse_positive_int(request.data.get("quantity", 1))

        error = _stock_error(item.product, qty, request.user)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        item.quantity = qty
        item.save()
        return Response({"status": "ok"})

    def destroy(self, request, *args, **kwargs):
        # DELETE /cart-items/<id>/
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        CartItem.objects.filter(cart__account=request.user).delete()
        return Response({"status": "ok"}, status=status.HTTP_200_OK)