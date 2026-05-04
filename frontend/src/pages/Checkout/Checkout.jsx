import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { readCart, getCartSubtotal } from "../../utils/cartStorage";
import apiClient from "../../utils/apiClient";
import { useAuth } from "../../auth/AuthContext";
import RecurringOrderModal from "./RecurringOrderModal";
import styles from "./Checkout.module.css";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function isRestaurantCustomer(user) {
  return (
    user?.account_type === "restaurant" ||
    user?.organisation?.organisation_type === "restaurant"
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const [items] = useState(() => readCart());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringPrefs, setRecurringPrefs] = useState(null);

  const canCreateRecurring = isRestaurantCustomer(user);

  const subtotal = useMemo(
    () => getCartSubtotal(items),
    [items]
  );

  const commission = subtotal * 0.05;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (recurringPrefs && !canCreateRecurring) {
        throw new Error("Recurring orders are only available for restaurant customers.");
      }

      const payload = recurringPrefs ? { recurring: recurringPrefs } : {};
      const { data } = await apiClient.post("/checkout/create-session/", payload);

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="container">
        <h1>Your cart is empty</h1>
      </main>
    );
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(value);

  return (
    <main className={`container ${styles.page}`}>
      <h1>Checkout</h1>

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <h2>Ready to complete your order?</h2>

          <p className={styles.note}>
            You’ll confirm payment and delivery details securely on the next page.
          </p>

          {error && <p className={styles.error}>{error}</p>}

          {canCreateRecurring && recurringPrefs && (
            <div className={styles.recurringBadge}>
              <div className={styles.recurringBadgeInfo}>
                <span className={styles.recurringBadgeLabel}>Recurring order</span>
                <span className={styles.recurringBadgeDetails}>
                  {recurringPrefs.frequency === "fortnightly" ? "Fortnightly" : "Weekly"}
                  {" · "}
                  Order every {WEEKDAYS[recurringPrefs.order_day]}
                  {" · "}
                  Deliver every {WEEKDAYS[recurringPrefs.delivery_day]}
                </span>
              </div>
              <button
                type="button"
                className={styles.recurringRemove}
                onClick={() => setRecurringPrefs(null)}
                aria-label="Remove recurring order"
              >
                ×
              </button>
            </div>
          )}

          {canCreateRecurring && (
            <label className={styles.recurringToggle}>
              <input
                type="checkbox"
                checked={Boolean(recurringPrefs)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setShowRecurring(true);
                  } else {
                    setRecurringPrefs(null);
                  }
                }}
              />
              <span>Make this a recurring order</span>
            </label>
          )}

          <button
            onClick={handleSubmit}
            className={styles.payBtn}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Continue to payment"}
          </button>
        </section>

        <aside className={styles.summaryCard}>
          <h2>Order summary</h2>

          <ul className={styles.summaryList}>
            {items.map((item) => (
              <li key={item.productId} className={styles.summaryRow}>
                <span>
                  {item.name} × {item.qty}
                </span>
                <span>
                  {formatCurrency(item.qty * Number(item.price))}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          <div className={styles.totalRow}>
            <span>Platform fee (5%)</span>
            <span>{formatCurrency(commission)}</span>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showRecurring && (
          <RecurringOrderModal
            items={items}
            initialValue={recurringPrefs}
            onClose={() => setShowRecurring(false)}
            onConfirm={(prefs) => {
              setRecurringPrefs(prefs);
              setShowRecurring(false);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}