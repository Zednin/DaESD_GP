import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { readCart, getCartSubtotal } from "../../utils/cartStorage";
import { ensureCsrf, getCookie } from "../../utils/auth";
import RecurringOrderModal from "./RecurringOrderModal";
import styles from "./Checkout.module.css";

export default function Checkout() {
  const [items] = useState(() => readCart());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringPrefs, setRecurringPrefs] = useState(null);

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
      await ensureCsrf();
      const csrf = getCookie("csrftoken");

      const res = await fetch("/api/checkout/create-session/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrf,
        },
        body: JSON.stringify(
          recurringPrefs ? { recurring: recurringPrefs } : {}
        ),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Checkout failed:", data);
        throw new Error(data?.detail || "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err.message || "Something went wrong");
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
        {/* LEFT: action panel */}
        <section className={styles.formCard}>
          <h2>Ready to complete your order?</h2>

          <p className={styles.note}>
            You’ll confirm payment and delivery details securely on the next page.
          </p>

          {error && <p className={styles.error}>{error}</p>}

          // recurring order form 
          {recurringPrefs && (
            <div className={styles.recurringBadge}>
              <div className={styles.recurringBadgeInfo}>
                <span className={styles.recurringBadgeLabel}>Recurring Order</span>
                <span className={styles.recurringBadgeDetails}>
                  {recurringPrefs.frequency === "fortnightly" ? "Fortnightly" : "Weekly"}
                  {" · "}
                  Order every{" "}
                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][recurringPrefs.order_day]}
                  {" · "}
                  Deliver every{" "}
                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][recurringPrefs.delivery_day]}
                </span>
              </div>
              <button
                type="button"
                className={styles.recurringRemove}
                onClick={() => setRecurringPrefs(null)}
              >
                ×
              </button>
            </div>
          )}

          <label className={styles.recurringToggle}>
            <input
              type="checkbox"
              checked={!!recurringPrefs}
              onChange={(e) => {
                if (e.target.checked) {
                  setShowRecurring(true);
                } else {
                  setRecurringPrefs(null);
                }
              }}
            />
            <span>Set as Recurring Order</span>
          </label>

          <button
            onClick={handleSubmit}
            className={styles.payBtn}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Continue to payment"}
          </button>
        </section>

        {/* RIGHT: order summary */}
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