from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Account, Customer

# This function runs automatically AFTER an Account is saved
@receiver(post_save, sender=Account)
def handle_account_creation(sender, instance, created, **kwargs):
    if created:
        if instance.is_superuser:
            instance.account_type = 'admin'
            instance.save(update_fields=['account_type'])
        elif instance.account_type == 'customer':
            Customer.objects.create(account=instance)