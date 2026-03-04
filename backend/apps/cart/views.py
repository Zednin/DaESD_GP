from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CartItem, Cart
from .serializers import CartSerializer
from apps.catalog.models import Product

class CartViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get"]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(account=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    


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
                "price_snapshot": product.price,
            },
        )

        if not created:
            item.quantity += int(request.data.get("quantity", 1))
            item.save()

        return Response({"status": "ok"})
    