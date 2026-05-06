// groups checkout items by producer so lead-time rules stay consistent.
const defaultLeadTimeHours = 48;

export function getItemLeadTimeHours(item) {
  const leadTimeHours = Number(
    item?.leadTimeHours ?? item?.lead_time_hours ?? item?.producer_lead_time_hours
  );

  return Number.isFinite(leadTimeHours) && leadTimeHours > 0
    ? leadTimeHours
    : defaultLeadTimeHours;
}

export function getItemQuantity(item) {
  const quantity = Number(item?.qty ?? item?.quantity ?? 0);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

export function getProducerLeadTimeGroups(items) {
  const groups = new Map();

  (items || []).forEach((item) => {
    const producerId = item?.producer_id ?? item?.producer_profile_id ?? item?.producer ?? "unknown";
    const groupKey = String(producerId);
    const leadTimeHours = getItemLeadTimeHours(item);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        producerId: groupKey,
        producerName: item?.producer_name || item?.producerName || "Producer",
        leadTimeHours,
        quantity: 0,
      });
    }

    const group = groups.get(groupKey);
    group.leadTimeHours = Math.max(group.leadTimeHours, leadTimeHours);
    group.quantity += getItemQuantity(item);
  });

  return Array.from(groups.values());
}

export function getMaxLeadTimeHours(items) {
  const groups = getProducerLeadTimeGroups(items);

  return Math.max(
    defaultLeadTimeHours,
    ...groups.map((group) => group.leadTimeHours)
  );
}

export function getMinimumLeadDays(leadTimeHours) {
  return Math.max(1, Math.ceil(Number(leadTimeHours || defaultLeadTimeHours) / 24));
}

export function getRecurringLeadDays(orderDay, deliveryDay) {
  const daysBetween = (Number(deliveryDay) - Number(orderDay) + 7) % 7;
  return daysBetween === 0 ? 7 : daysBetween;
}

export function hasRecurringLeadTime(orderDay, deliveryDay, leadTimeHours) {
  return getRecurringLeadDays(orderDay, deliveryDay) * 24 >= Number(leadTimeHours || defaultLeadTimeHours);
}