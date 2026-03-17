import stripe

from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.cart.models import Cart
from apps.orders.models import Order, OrderItem, ProducerOrder, CommissionLedger
from apps.payments.models import Payment
from apps.addresses.models import Address

stripe.api_key = settings.STRIPE_SECRET_KEY

COMMISSION_RATE = Decimal("0.05")


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

stripe.api_key = settings.STRIPE_SECRET_KEY


class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(account=request.user)
        items = cart.items.select_related("product").all()

        if not items.exists():
            return Response(
                {"detail": "Cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        line_items = []
        for item in items:
            line_items.append({
                "price_data": {
                    "currency": "gbp",
                    "product_data": {
                        "name": item.product.name,
                    },
                    "unit_amount": int(item.price_snapshot * 100),
                },
                "quantity": item.quantity,
            })

        frontend_url = settings.FRONTEND_URL

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/cart",
            customer_email=request.user.email or None,
            shipping_address_collection={
                "allowed_countries": ["GB"],
            },
            metadata={
                "user_id": str(request.user.id),
                "cart_id": str(cart.id),
            },
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


def handle_checkout_session_completed(session):
    user_id = session.get("metadata", {}).get("user_id")
    cart_id = session.get("metadata", {}).get("cart_id")

    if not user_id or not cart_id:
        return

    # Prevent duplicate order creation if Stripe retries webhook
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

    total_amount = money(sum(
        Decimal(item.price_snapshot) * item.quantity for item in cart_items
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
                Decimal(item.price_snapshot) * item.quantity
                for item in producer_items
            ))

            commission = money(subtotal * COMMISSION_RATE)
            payout_amount = money(subtotal - commission)
            total_commission += commission

            producer = producer_items[0].product.producer
            delivery_date = (
                timezone.now() + timedelta(hours=producer.lead_time_hours)
            ).date()

            producer_order = ProducerOrder.objects.create(
                order=order,
                producer_id=producer_id,
                status="pending",
                total_amount=subtotal,
                delivery_date=delivery_date,
            )

            for cart_item in producer_items:
                line_total = money(Decimal(cart_item.price_snapshot) * cart_item.quantity)

                OrderItem.objects.create(
                    producer_order=producer_order,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    price_snapshot=cart_item.price_snapshot,
                    line_total=line_total,
                )

            CommissionLedger.objects.create(
                producer_order=producer_order,
                commission_rate=Decimal("5.00"),
                commission_amount=commission,
                payout_amount=payout_amount,
            )

        order.commission_amount = money(total_commission)
        order.save(update_fields=["commission_amount"])

        cart.items.all().delete()