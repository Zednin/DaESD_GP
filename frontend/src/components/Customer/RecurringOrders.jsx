import { useEffect, useState } from "react";
import {
  LuCalendarDays,
  LuCircleAlert,
  LuPencil,
  LuPackage,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { useAuth } from "../../auth/AuthContext";
import { ensureCsrf } from "../../utils/auth";
import apiClient from "../../utils/apiClient";
import styles from "./RecurringOrders.module.css";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MIN_DELIVERY_LEAD_DAYS = 2;
const LEAD_TIME_MESSAGE = "minimum 48 hour difference between order and delivery.";

function hasMinimumDeliveryLeadTime(orderDay, deliveryDay) {
  const daysBetween = (Number(deliveryDay) - Number(orderDay) + 7) % 7;
  return daysBetween >= MIN_DELIVERY_LEAD_DAYS;
}

function isRestaurantCustomer(user) {
  return (
    user?.account_type === "restaurant" ||
    user?.organisation?.organisation_type === "restaurant"
  );
}

function normaliseResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
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

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status-${status}`] || ""}`}>
      {status}
    </span>
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

function RecurringOrderEditModal({ order, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: order.name || "",
    frequency: order.frequency || "weekly",
    order_day: order.order_day ?? 0,
    delivery_day: order.delivery_day ?? 2,
  });
  const [items, setItems] = useState(
    (order.items || []).map((item) => ({
      ...item,
      quantity: String(item.quantity),
    }))
  );
  const [formError, setFormError] = useState("");
  const hasDeliveryLeadTime = hasMinimumDeliveryLeadTime(
    form.order_day,
    form.delivery_day
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateQuantity(itemId, quantity) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }

  function removeItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Give this recurring order a name.");
      return;
    }

    if (!hasDeliveryLeadTime) {
      setFormError(LEAD_TIME_MESSAGE);
      return;
    }

    if (items.length === 0) {
      setFormError("Keep at least one item in the recurring order.");
      return;
    }

    const quantityUpdates = items.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity),
    }));
    const removedUpdates = order.items
      .filter((item) => !items.some((current) => current.id === item.id))
      .map((item) => ({ id: item.id, quantity: 0 }));

    if (quantityUpdates.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      setFormError("Item quantities must be whole numbers of at least 1.");
      return;
    }

    onSave(order.id, {
      name: form.name.trim(),
      frequency: form.frequency,
      order_day: Number(form.order_day),
      delivery_day: Number(form.delivery_day),
      item_updates: [...quantityUpdates, ...removedUpdates],
    });
  }

  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <form
        className={styles.editModal}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Edit recurring order</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        {formError && <div className={styles.inlineError}>{formError}</div>}

        <label className={styles.field}>
          <span>Order name</span>
          <input name="name" value={form.name} onChange={handleChange} maxLength={100} required />
        </label>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Frequency</span>
            <select name="frequency" value={form.frequency} onChange={handleChange}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Order day</span>
            <select name="order_day" value={form.order_day} onChange={handleChange}>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Delivery day</span>
            <select name="delivery_day" value={form.delivery_day} onChange={handleChange}>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>
        </div>

        {!hasDeliveryLeadTime && (
          <div className={styles.leadTimeNotice}>{LEAD_TIME_MESSAGE}</div>
        )}

        <div className={styles.editItemsBox}>
          <h4>Items</h4>
          <div className={styles.editItemsList}>
            {items.map((item) => (
              <div key={item.id} className={styles.editItemRow}>
                <div>
                  <strong>{item.product_name}</strong>
                  {!item.product_available && (
                    <em className={styles.unavailableLabel}>
                      (product currently unavailable!)
                    </em>
                  )}
                  <span>£{Number(item.price).toFixed(2)} / {item.unit}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.id, event.target.value)}
                  aria-label={`${item.product_name} quantity`}
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.product_name}`}
                >
                  <LuTrash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={saving || !hasDeliveryLeadTime}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RecurringOrders() {
  const { user } = useAuth();
  const canUseRecurringOrders = isRestaurantCustomer(user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(canUseRecurringOrders);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadRecurringOrders() {
    if (!canUseRecurringOrders) return;

    try {
      setLoading(true);
      setError("");
      const { data } = await apiClient.get("/recurring-orders/");
      setOrders(normaliseResponse(data));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Something went wrong while loading recurring orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecurringOrders();
  }, [canUseRecurringOrders]);

  async function updateStatus(orderId, status) {
    try {
      setUpdatingId(orderId);
      await ensureCsrf();
      const { data } = await apiClient.patch(`/recurring-orders/${orderId}/`, { status });
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data : order))
      );
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update recurring order.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveRecurringOrder(orderId, payload) {
    try {
      setUpdatingId(orderId);
      await ensureCsrf();
      const { data } = await apiClient.patch(`/recurring-orders/${orderId}/`, payload);
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data : order))
      );
      setEditingOrder(null);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.item_updates?.[0] ||
          "Failed to save recurring order."
      );
    } finally {
      setUpdatingId(null);
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
      setError(err?.response?.data?.detail || "Failed to delete recurring order.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!canUseRecurringOrders) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Account</p>
          <h2 className={styles.title}>Recurring orders</h2>
          <p className={styles.subtitle}>
            Recurring orders are available for restaurant customers.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h2 className={styles.title}>Recurring orders</h2>
          <p className={styles.subtitle}>
            Manage weekly and fortnightly restaurant orders created from checkout.
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
          {orders.map((order) => (
            <article key={order.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.titleRow}>
                    <h3>{order.name}</h3>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className={styles.metaRow}>
                    <span>
                      <LuCalendarDays size={14} />
                      {formatFrequency(order.frequency)} · order every {WEEKDAYS[order.order_day]}
                    </span>
                    <span>
                      <LuCalendarDays size={14} />
                      Deliver every {WEEKDAYS[order.delivery_day]}
                    </span>
                    <span>
                      <LuCalendarDays size={14} />
                      Next run {formatDate(order.next_run_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.itemsBox}>
                <h4>Items</h4>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.product_name}
                        {!item.product_available && (
                          <em className={styles.unavailableLabel}>
                            (product currently unavailable!)
                          </em>
                        )}
                      </span>
                      <strong>{item.quantity} {item.unit}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={updatingId === order.id || deletingId === order.id}
                  onClick={() => setEditingOrder(order)}
                >
                  <LuPencil size={15} />
                  Edit
                </button>

                {order.status === "paused" ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={updatingId === order.id || deletingId === order.id}
                    onClick={() => updateStatus(order.id, "active")}
                  >
                    <LuPlay size={15} />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={order.status !== "active" || updatingId === order.id || deletingId === order.id}
                    onClick={() => updateStatus(order.id, "paused")}
                  >
                    <LuPause size={15} />
                    Pause
                  </button>
                )}

                <button
                  type="button"
                  className={styles.dangerBtn}
                  disabled={order.status === "cancelled" || updatingId === order.id || deletingId === order.id}
                  onClick={() => updateStatus(order.id, "cancelled")}
                >
                  <LuX size={15} />
                  Cancel
                </button>

                <button
                  type="button"
                  className={styles.dangerBtn}
                  disabled={updatingId === order.id || deletingId === order.id}
                  onClick={() => setDeleteTarget(order)}
                >
                  <LuTrash2 size={15} />
                  {deletingId === order.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingOrder && (
        <RecurringOrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={saveRecurringOrder}
          saving={updatingId === editingOrder.id}
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
