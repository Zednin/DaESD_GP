from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"

    def ready(self):
        """Register signal handlers once the app registry is fully loaded."""
        from django.db.models.signals import post_save

        from apps.orders.models import OrderItem

        from .signals import handle_order_item_purchase

        post_save.connect(handle_order_item_purchase, sender=OrderItem)
