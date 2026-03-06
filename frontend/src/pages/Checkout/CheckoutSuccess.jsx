import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { refreshCartFromServer } from "../../utils/cartStorage";
import styles from "./CheckoutSuccess.module.css";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    async function syncCart() {
      try {
        await refreshCartFromServer();

        // small follow-up sync in case webhook finishes just after redirect
        setTimeout(async () => {
          try {
            await refreshCartFromServer();
          } catch (err) {
            console.error("Second cart refresh failed:", err);
          }
        }, 1500);
      } catch (err) {
        console.error("Failed to refresh cart after checkout:", err);
      }
    }

    syncCart();
  }, []);

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1>Payment successful</h1>
        <p>Your order has been placed successfully.</p>

        {sessionId && (
          <p className={styles.meta}>
            Reference: <span>{sessionId}</span>
          </p>
        )}

        <div className={styles.actions}>
          <Link to="/products" className={styles.primaryBtn}>
            Continue shopping
          </Link>
          <Link to="/" className={styles.secondaryBtn}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}