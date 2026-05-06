from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from .views import get_checkout_total_from_rows, validate_stripe_minimum_amount


class StripeMinimumAmountTests(SimpleTestCase):
    def test_checkout_total_uses_quantity(self):
        rows = [
            {"unit_price": Decimal("0.10"), "quantity": 3},
        ]

        self.assertEqual(get_checkout_total_from_rows(rows), Decimal("0.30"))

    def test_rejects_totals_below_stripe_minimum(self):
        with self.assertRaises(ValidationError):
            validate_stripe_minimum_amount(Decimal("0.29"))

    def test_allows_totals_at_stripe_minimum(self):
        validate_stripe_minimum_amount(Decimal("0.30"))
