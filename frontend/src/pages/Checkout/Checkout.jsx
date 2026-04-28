import { useMemo, useState } from "react";
import { readCart, getCartSubtotal } from "../../utils/cartStorage";
import apiClient from "../../utils/apiClient";
import styles from "./Checkout.module.css";

export default function Checkout() {
  const [items] = useState(() => readCart());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const { data } = await apiClient.post("/checkout/create-session/", {});

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
    </main>
  );
}