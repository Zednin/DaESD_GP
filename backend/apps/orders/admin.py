from django.contrib import admin
from .models import (
    Order,
    ProducerOrder,
    OrderItem,
    RecurringOrder,
    RecurringOrderItem,
    RecurringOrderEvent,
    WeeklySettlement,
    SettlementLine,
    CommissionLedger,
)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Order._meta.fields]


@admin.register(ProducerOrder)
class ProducerOrderAdmin(admin.ModelAdmin):
    list_display = [field.name for field in ProducerOrder._meta.fields]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = [field.name for field in OrderItem._meta.fields]


@admin.register(RecurringOrder)
class RecurringOrderAdmin(admin.ModelAdmin):
    list_display = [field.name for field in RecurringOrder._meta.fields]


@admin.register(RecurringOrderItem)
class RecurringOrderItemAdmin(admin.ModelAdmin):
    list_display = [field.name for field in RecurringOrderItem._meta.fields]


@admin.register(RecurringOrderEvent)
class RecurringOrderEventAdmin(admin.ModelAdmin):
    list_display = [field.name for field in RecurringOrderEvent._meta.fields]


@admin.register(WeeklySettlement)
class WeeklySettlementAdmin(admin.ModelAdmin):
    list_display = [field.name for field in WeeklySettlement._meta.fields]


@admin.register(SettlementLine)
class SettlementLineAdmin(admin.ModelAdmin):
    list_display = [field.name for field in SettlementLine._meta.fields]


@admin.register(CommissionLedger)
class CommissionLedgerAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CommissionLedger._meta.fields]