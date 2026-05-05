import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuCheck,
  LuCircleAlert,
  LuEllipsis,
  LuMinus,
  LuPackage,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { useAuth } from "../../auth/AuthContext";
import { ensureCsrf } from "../../utils/auth";
import apiClient from "../../utils/apiClient";
import styles from "./RecurringOrders.module.css";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function normaliseResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getApiError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.item_updates === "string") return data.item_updates;
  if (Array.isArray(data.item_updates) && data.item_updates.length > 0) return data.item_updates[0];
  if (typeof data.items === "string") return data.items;
  if (Array.isArray(data.items) && data.items.length > 0) return data.items[0];
  return fallback;
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFrequency(value) {
  return value === "fortnightly" ? "Fortnightly" : "Weekly";
}

function formatDayDate(dayValue, dateValue) {
  const day = weekdays[Number(dayValue)] || (
    dateValue
      ? new Date(dateValue).toLocaleDateString("en-GB", { weekday: "long" })
      : "Not scheduled"
  );
  return `${day} / ${formatDate(dateValue)}`;
}

function getSchedule(order) {
  // use current schedule first, then next event
  return order.current_schedule || order.next_event || {};
}

function isScheduleComplete(schedule) {
  const orderStatus = (schedule.order_status || "").toLowerCase();
  return ["completed", "complete", "delivered"].includes(orderStatus);
}

function getScheduleStatus(order) {
  const schedule = getSchedule(order);
  // confirmed turns delivered once linked order is done
  if (schedule.status === "confirmed" && isScheduleComplete(schedule)) return "delivered";
  return schedule.status || "pending";
}

function getStatusLabel(status) {
  if (status === "confirmed") return "Confirmed";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

function isOrderReference(item) {
  return item.startsWith("Order #");
}

function getScheduleSummary(order) {
  const schedule = getSchedule(order);
  const status = getScheduleStatus(order);

  if (status === "confirmed") {
    return [
      `Paid ${formatDate(schedule.paid_at)}`,
      `Delivery ${formatDate(schedule.delivery_date)}`,
      schedule.order_reference ? `Order #${schedule.order_reference}` : null,
    ].filter(Boolean);
  }

  if (status === "delivered") {
    return [
      `Complete ${formatDate(schedule.delivery_date)}`,
      schedule.order_reference ? `Order #${schedule.order_reference}` : null,
      `Next order ${formatDate(schedule.next_scheduled_for)}`,
    ].filter(Boolean);
  }

  if (status === "cancelled") {
    return [
      `Next schedule order ${formatDate(schedule.next_scheduled_for)}`,
      `Next schedule delivery ${formatDate(schedule.next_delivery_date)}`,
    ];
  }

  return [
    `Order ${formatDate(schedule.scheduled_for)}`,
    `Delivery ${formatDate(schedule.delivery_date)}`,
  ];
}

function getOrderItems(order) {
  // flatten producer groups for editing and payment
  return (order.item_groups || []).flatMap((group) =>
    (group.items || []).map((item) => ({
      ...item,
      producer_id: group.producer_id,
      producer_name: group.producer_name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      line_total: Number(item.line_total),
    }))
  );
}

function groupItems(items) {
  const groups = new Map();

  items.forEach((item) => {
    const producerId = item.producer_id || item.producer_profile_id || "unknown";
    if (!groups.has(producerId)) {
      groups.set(producerId, {
        producer_id: producerId,
        producer_name: item.producer_name || "Producer",
        items: [],
      });
    }
    groups.get(producerId).items.push(item);
  });

  return Array.from(groups.values());
}

function getItemTotal(items) {
  return items.reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity || 0),
    0
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <LuPackage size={28} />
      <h3>No recurring orders yet</h3>
      <p>Restaurant recurring orders will appear here after checkout.</p>
    </div>
  );
}

function DeleteConfirmModal({ order, deleting, onClose, onConfirm }) {
  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <div
        className={`${styles.editModal} ${styles.deleteModal}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Delete recurring order</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        <p className={styles.deleteCopy}>
          Delete <strong>{order.name}</strong>? This removes the recurring order from your account.
        </p>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeliveryModal({ order, saving, onClose, onConfirm }) {
  // customer can adjust the next delivery before paying
  const [items, setItems] = useState(getOrderItems(order));
  const [formError, setFormError] = useState("");
  const schedule = getSchedule(order);
  const scheduleStatus = getScheduleStatus(order);
  const deliveryDate = ["cancelled", "delivered"].includes(scheduleStatus)
    ? schedule.next_delivery_date
    : schedule.delivery_date;

  const groupedItems = useMemo(() => groupItems(items), [items]);
  const total = useMemo(() => getItemTotal(items), [items]);

  function updateQuantity(product, nextQuantity) {
    const quantity = Math.max(0, Number(nextQuantity));
    setItems((current) =>
      quantity === 0
        ? current.filter((item) => Number(item.product) !== Number(product))
        : current.map((item) =>
            Number(item.product) === Number(product)
              ? { ...item, quantity, line_total: quantity * Number(item.price) }
              : item
          )
    );
  }

  function submit(event) {
    event.preventDefault();
    setFormError("");

    if (items.length === 0) {
      setFormError("Choose at least one item for this delivery.");
      return;
    }

    // send the chosen products to checkout
    onConfirm(order.id, items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    })));
  }

  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <form
        className={`${styles.editModal} ${styles.confirmModal}`}
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3>Confirm delivery</h3>
            <p className={styles.modalSub}>{order.name} - {formatDate(deliveryDate)}</p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        {formError && <div className={styles.inlineError}>{formError}</div>}

        <div className={styles.confirmItems}>
          {groupedItems.map((group) => (
            <section key={group.producer_id} className={styles.producerGroup}>
              <h4>{group.producer_name}</h4>
              {group.items.map((item) => (
                <div key={item.product} className={styles.confirmItemRow}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>£{Number(item.price).toFixed(2)} / {item.unit}</span>
                  </div>
                  <div className={styles.quantityStepper}>
                    <button type="button" onClick={() => updateQuantity(item.product, item.quantity - 1)} aria-label={`Decrease ${item.product_name}`}>
                      <LuMinus size={14} />
                    </button>
                    <span className={styles.stepperValue}>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product, item.quantity + 1)} aria-label={`Increase ${item.product_name}`}>
                      <LuPlus size={14} />
                    </button>
                  </div>
                  <strong>£{(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className={styles.confirmFooter}>
          <span>Total due</span>
          <strong>£{total.toFixed(2)}</strong>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={styles.confirmBtn} disabled={saving}>
            <LuCheck size={15} />
            {saving ? "Sending to checkout..." : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditRecurringOrderModal({
  order,
  producers,
  products,
  loadingProducers,
  loadingProducts,
  saving,
  onClose,
  onSave,
  onLoadProducts,
}) {
  // edits the saved recurring template
  const [form, setForm] = useState({
    name: order.name || "",
    frequency: order.frequency || "weekly",
    order_day: order.order_day ?? 0,
    delivery_day: order.delivery_day ?? 2,
  });
  const [items, setItems] = useState(
    getOrderItems(order).map((item) => ({
      ...item,
      quantity: String(item.quantity),
    }))
  );
  const [removedIds, setRemovedIds] = useState([]);
  const [removedProductIds, setRemovedProductIds] = useState([]);
  const [producerId, setProducerId] = useState("");
  const [productId, setProductId] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [formError, setFormError] = useState("");

  const selectedProductIds = useMemo(
    () => new Set([
      ...items.map((item) => Number(item.product)),
      ...removedProductIds.map((product) => Number(product)),
    ]),
    [items, removedProductIds]
  );

  const producerOptions = useMemo(() => {
    return producers
      .map((producer) => ({
        id: String(producer.id),
        name: producer.company_name || "Producer",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [producers]);

  const productOptions = useMemo(() => {
    // only show available products for the chosen producer
    return products.filter((product) => {
      const ownerId = String(product.producer_profile_id || product.producer || "");
      if (producerId && ownerId !== producerId) return false;
      if (selectedProductIds.has(Number(product.id))) return false;
      return product.status === "available";
    });
  }, [products, producerId, selectedProductIds]);

  const total = useMemo(() => getItemTotal(items), [items]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItemQuantity(product, value) {
    setItems((current) =>
      current.map((item) =>
        Number(item.product) === Number(product)
          ? { ...item, quantity: value }
          : item
      )
    );
  }

  function changeProducer(value) {
    setProducerId(value);
    setProductId("");
    if (value) {
      onLoadProducts(value);
    }
  }

  function removeTemplateItem(item) {
    // saved items are sent back as quantity zero
    if (item.id) {
      setRemovedIds((current) => Array.from(new Set([...current, item.id])));
      setRemovedProductIds((current) => Array.from(new Set([...current, item.product])));
    }
    setItems((current) => current.filter((row) => Number(row.product) !== Number(item.product)));
  }

  function addTemplateProduct() {
    setFormError("");
    const product = products.find((item) => Number(item.id) === Number(productId));
    const quantity = Number(addQuantity);

    if (!product) {
      setFormError("Choose a product to add.");
      return;
    }

    if (selectedProductIds.has(Number(product.id))) {
      setFormError("This product is already in the recurring order.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setFormError("Quantity must be a whole number of at least 1.");
      return;
    }

    setItems((current) => [
      ...current,
      {
        product: product.id,
        product_name: product.name,
        producer_id: product.producer_profile_id || product.producer,
        producer_name: product.producer_name,
        unit: product.unit,
        price: Number(product.price),
        quantity: String(quantity),
        line_total: Number(product.price) * quantity,
      },
    ]);
    setProductId("");
    setAddQuantity("1");
  }

  function submit(event) {
    event.preventDefault();
    setFormError("");

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormError("Give this recurring order a name.");
      return;
    }

    if (items.length === 0) {
      setFormError("Keep at least one product in the recurring order.");
      return;
    }

    // build the backend item update payload
    const productIds = new Set();
    const rows = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      const product = Number(item.product);

      if (!Number.isInteger(quantity) || quantity < 1) {
        setFormError("Quantities must be whole numbers of at least 1.");
        return;
      }

      if (productIds.has(product)) {
        setFormError("A product can only appear once in a recurring order.");
        return;
      }

      productIds.add(product);
      rows.push({
        ...(item.id ? { id: item.id } : {}),
        product,
        quantity,
      });
    }

    onSave(order.id, {
      name: trimmedName,
      frequency: form.frequency,
      order_day: Number(form.order_day),
      delivery_day: Number(form.delivery_day),
      item_updates: [
        ...rows,
        ...removedIds.map((id) => ({ id, quantity: 0 })),
      ],
    });
  }

  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <form
        className={`${styles.editModal} ${styles.templateModal}`}
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3>Edit recurring order</h3>
            <p className={styles.modalSub}>{order.name}</p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        {formError && <div className={styles.inlineError}>{formError}</div>}

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} maxLength={100} required />
          </label>
          <label className={styles.field}>
            <span>Arrangement</span>
            <select value={form.frequency} onChange={(event) => updateForm("frequency", event.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Order day</span>
            <select value={form.order_day} onChange={(event) => updateForm("order_day", event.target.value)}>
              {weekdays.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Delivery day</span>
            <select value={form.delivery_day} onChange={(event) => updateForm("delivery_day", event.target.value)}>
              {weekdays.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>
        </div>

        <section className={styles.editSection}>
          <h4>List</h4>
          <div className={styles.templateItemsList}>
            {groupItems(items).map((group) => (
              <div key={group.producer_id} className={styles.templateProducerGroup}>
                <h5>{group.producer_name}</h5>
                {group.items.map((item) => (
                  <div key={item.product} className={styles.templateItemRow}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>£{Number(item.price).toFixed(2)} / {item.unit}</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => updateItemQuantity(item.product, event.target.value)}
                      aria-label={`${item.product_name} quantity`}
                    />
                    <button type="button" className={styles.removeItemBtn} onClick={() => removeTemplateItem(item)} aria-label={`Remove ${item.product_name}`}>
                      <LuX size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.addProductBox}>
          <h4>Add product</h4>
          <div className={styles.addProductGridFull}>
            <label className={styles.field}>
              <span>Producer</span>
              <select value={producerId} onChange={(event) => changeProducer(event.target.value)} disabled={loadingProducers}>
                <option value="">Choose producer</option>
                {producerOptions.map((producer) => (
                  <option key={producer.id} value={producer.id}>{producer.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Product</span>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={!producerId || loadingProducts}>
                <option value="">
                  {loadingProducts ? "Loading products..." : "Choose product"}
                </option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - £{Number(product.price).toFixed(2)} / {product.unit}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Quantity</span>
              <input type="number" min="1" step="1" value={addQuantity} onChange={(event) => setAddQuantity(event.target.value)} />
            </label>
          </div>

          {producerId && !loadingProducts && productOptions.length === 0 && (
            <div className={styles.emptyCompact}>No available products to add for this producer.</div>
          )}

          <button type="button" className={styles.secondaryBtn} onClick={addTemplateProduct} disabled={!productId}>
            <LuPlus size={15} />
            Add product
          </button>
        </section>

        <div className={styles.confirmFooter}>
          <span>Template total</span>
          <strong>£{total.toFixed(2)}</strong>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            <LuCheck size={15} />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RecurringOrders() {
  const { canUseRecurringOrders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [producers, setProducers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducers, setLoadingProducers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(canUseRecurringOrders);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const loadRecurringOrders = useCallback(async () => {
    if (!canUseRecurringOrders) return;

    try {
      // load saved recurring templates for this account
      setLoading(true);
      setError("");
      const { data } = await apiClient.get("/recurring-orders/");
      setOrders(normaliseResponse(data));
    } catch (err) {
      setError(getApiError(err, "Something went wrong while loading recurring orders."));
    } finally {
      setLoading(false);
    }
  }, [canUseRecurringOrders]);

  async function loadProducers() {
    if (producers.length > 0 || loadingProducers) return;

    try {
      setLoadingProducers(true);
      const { data } = await apiClient.get("/producers/", {
        params: { ordering: "company_name" },
      });
      setProducers(normaliseResponse(data));
    } catch (err) {
      setError(getApiError(err, "Failed to load producers."));
    } finally {
      setLoadingProducers(false);
    }
  }

  async function loadProducts(producerId) {
    if (!producerId) {
      setProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);
      const { data } = await apiClient.get("/products/", {
        params: { status: "available", producer: producerId, ordering: "name" },
      });
      setProducts(normaliseResponse(data));
    } catch (err) {
      setError(getApiError(err, "Failed to load products."));
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadRecurringOrders();
  }, [loadRecurringOrders]);

  async function cancelNextOrder(order) {
    try {
      // skip only the next scheduled delivery
      setActionId(order.id);
      await ensureCsrf();
      const { data } = await apiClient.post(`/recurring-orders/${order.id}/skip-next/`);
      setOrders((current) =>
        current.map((currentOrder) => (currentOrder.id === order.id ? data : currentOrder))
      );
    } catch (err) {
      setError(getApiError(err, "Failed to cancel the next recurring order."));
    } finally {
      setActionId(null);
    }
  }

  async function confirmDelivery(orderId, items) {
    try {
      // creates a stripe checkout for the next delivery
      setActionId(orderId);
      await ensureCsrf();
      const { data } = await apiClient.post(`/recurring-orders/${orderId}/confirm-next/`, { items });
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      setError(getApiError(err, "Failed to confirm this delivery."));
      setActionId(null);
    }
  }

  async function saveRecurringOrder(orderId, payload) {
    try {
      // saves schedule and item changes
      setActionId(orderId);
      await ensureCsrf();
      const { data } = await apiClient.patch(`/recurring-orders/${orderId}/`, payload);
      setOrders((current) =>
        current.map((currentOrder) => (currentOrder.id === orderId ? data : currentOrder))
      );
      setEditTarget(null);
    } catch (err) {
      setError(getApiError(err, "Failed to save recurring order."));
    } finally {
      setActionId(null);
    }
  }

  async function deleteRecurringOrder(order) {
    try {
      setDeletingId(order.id);
      await ensureCsrf();
      await apiClient.delete(`/recurring-orders/${order.id}/`);
      setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(getApiError(err, "Failed to delete recurring order."));
    } finally {
      setDeletingId(null);
    }
  }

  function openEditModal(order) {
    setEditTarget(order);
    setMenuOpenId(null);
    setProducts([]);
    loadProducers();
  }

  function openDeleteModal(order) {
    setDeleteTarget(order);
    setMenuOpenId(null);
  }

  function openConfirmModal(order) {
    setConfirmTarget(order);
  }

  if (!canUseRecurringOrders) {
    return null;
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h2 className={styles.title}>Recurring orders</h2>
          <p className={styles.subtitle}>
            Review upcoming restaurant deliveries, adjust quantities, and confirm payment.
          </p>
        </div>

        <button type="button" className={styles.refreshBtn} onClick={loadRecurringOrders}>
          <LuRefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className={styles.errorState}>
          <LuCircleAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>Loading recurring orders...</div>
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.list}>
          {orders.map((order) => {
            const schedule = getSchedule(order);
            const scheduleStatus = getScheduleStatus(order);
            const scheduleComplete = scheduleStatus === "delivered";
            // finished schedules show the next dates
            const canCancelSchedule = ["pending", "delivered"].includes(scheduleStatus) && order.status !== "cancelled";
            const canConfirmSchedule = ["pending", "cancelled", "delivered"].includes(scheduleStatus) && order.status !== "cancelled";
            const confirmLabel = scheduleStatus === "cancelled"
              ? "Restore and confirm"
              : scheduleComplete
              ? "Confirm next delivery"
              : "Confirm delivery";
            const scheduleOrderDate = ["cancelled", "delivered"].includes(scheduleStatus)
              ? schedule.next_scheduled_for
              : schedule.scheduled_for || order.next_run_at;
            const scheduleDeliveryDate = ["cancelled", "delivered"].includes(scheduleStatus)
              ? schedule.next_delivery_date
              : schedule.delivery_date;

            return (
            <article key={order.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>{order.name}</h3>
                  <div className={styles.scheduleSummary}>
                    {scheduleStatus !== "delivered" && (
                      <span className={`${styles.statusBadge} ${styles[`status-${scheduleStatus}`] || ""}`}>
                        Current schedule: {getStatusLabel(scheduleStatus)}
                      </span>
                    )}
                    {getScheduleSummary(order).map((item) => (
                      <span
                        key={item}
                        className={isOrderReference(item) ? styles.orderReferenceBadge : undefined}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.menuWrap}>
                  <button
                    type="button"
                    className={styles.menuBtn}
                    onClick={() => setMenuOpenId((current) => (current === order.id ? null : order.id))}
                    aria-label={`${order.name} options`}
                  >
                    <LuEllipsis size={21} />
                  </button>
                  {menuOpenId === order.id && (
                    <div className={styles.actionMenu}>
                      <button type="button" onClick={() => openEditModal(order)}>
                        <LuPencil size={15} />
                        Edit
                      </button>
                      <button type="button" onClick={() => openDeleteModal(order)}>
                        <LuTrash2 size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.recurringSplit}>
                <dl className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <dt>Arrangement</dt>
                    <dd>{formatFrequency(order.frequency)}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Last delivery</dt>
                    <dd>{formatDate(order.last_delivery?.delivery_date)}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Order date</dt>
                    <dd>{formatDayDate(order.order_day, scheduleOrderDate)}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Delivery day</dt>
                    <dd>{formatDayDate(order.delivery_day, scheduleDeliveryDate)}</dd>
                  </div>
                </dl>

                <div className={styles.listColumn}>
                  {order.item_groups?.map((group) => (
                    <section key={group.producer_id} className={styles.producerGroup}>
                      <h4>{group.producer_name}</h4>
                      <ul>
                        {group.items.map((item) => (
                          <li key={item.id}>
                            <span>{item.product_name}</span>
                            <span>{item.quantity} x £{Number(item.price).toFixed(2)}</span>
                            <strong>£{Number(item.line_total).toFixed(2)}</strong>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.totalBlock}>
                  <span>Total</span>
                  <strong>£{Number(order.total_cost).toFixed(2)}</strong>
                </div>
                <div className={styles.footerControls}>
                  {scheduleComplete && (
                    <span className={styles.completedScheduleNote}>
                      Scheduled Order{schedule.order_reference ? ` #${schedule.order_reference}` : ""}: {order.name} {formatDate(schedule.delivery_date)} Complete
                    </span>
                  )}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={actionId === order.id || deletingId === order.id || !canCancelSchedule}
                      onClick={() => cancelNextOrder(order)}
                    >
                      Cancel next order
                    </button>
                    <button
                      type="button"
                      className={styles.confirmBtn}
                      disabled={actionId === order.id || deletingId === order.id || !canConfirmSchedule}
                      onClick={() => openConfirmModal(order)}
                    >
                      {confirmLabel}
                    </button>
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {confirmTarget && (
        <ConfirmDeliveryModal
          order={confirmTarget}
          saving={actionId === confirmTarget.id}
          onClose={() => setConfirmTarget(null)}
          onConfirm={confirmDelivery}
        />
      )}

      {editTarget && (
        <EditRecurringOrderModal
          order={editTarget}
          producers={producers}
          products={products}
          loadingProducers={loadingProducers}
          loadingProducts={loadingProducts}
          saving={actionId === editTarget.id}
          onClose={() => setEditTarget(null)}
          onSave={saveRecurringOrder}
          onLoadProducts={loadProducts}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          order={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteRecurringOrder(deleteTarget)}
        />
      )}
    </section>
  );
}