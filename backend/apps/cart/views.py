from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CartItem, Cart
from .serializers import CartSerializer
from apps.catalog.models import Product


def _get_effective_price(product):
    """Return surplus_price if the product has an active surplus deal, else regular price."""
    if product.surplus_active:
        return product.surplus_price
    return product.price


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
            qty = int(it.get("qty", 1))

            if not product_id or qty <= 0:
                continue

            product = Product.objects.get(id=product_id)

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
    def get_queryset(self):
        return CartItem.objects.filter(cart__account=self.request.user)

    def create(self, request):
        cart, _ = Cart.objects.get_or_create(account=request.user)
        product = Product.objects.get(id=request.data["product_id"])

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={
                "quantity": request.data.get("quantity", 1),
                "price_snapshot": _get_effective_price(product),
            },
        )

        if not created:
            item.quantity += int(request.data.get("quantity", 1))
        item.price_snapshot = _get_effective_price(product)
        item.save()

        return Response({"status": "ok"})
    
    def partial_update(self, request, *args, **kwargs):
        # PATCH /cart-items/<id>/ { "quantity": 3 }
        item = self.get_object()
        qty = int(request.data.get("quantity", 1))
        item.quantity = max(1, qty)
        item.save()
        return Response({"status": "ok"})

    def destroy(self, request, *args, **kwargs):
        # DELETE /cart-items/<id>/
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        CartItem.objects.filter(cart__account=request.user).delete()
        return Response({"status": "ok"}, status=status.HTTP_200_OK)