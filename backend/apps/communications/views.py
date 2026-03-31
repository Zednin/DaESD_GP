from django.shortcuts import render


def preview_order_email(request):
    # Fake minimal data
    class FakeUser:
        first_name = "Jeff"
        username = "epstein123"

    class FakeProduct:
        name = "Organic Apples"

    class FakeItem:
        quantity = 2
        product = FakeProduct()
        line_total = 4.50

    class FakeProducerOrder:
        items = [FakeItem()]

    class FakeOrder:
        id = 123
        total_amount = 12.99
        account = FakeUser()

        def producer_orders(self):
            return [FakeProducerOrder()]

    order = FakeOrder()

    return render(request, "emails/order_confirmation.html", {"order": order})