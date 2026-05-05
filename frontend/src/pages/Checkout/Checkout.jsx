import { useEffect, useMemo, useState } from "react";
import { readCart, getCartSubtotal } from "../../utils/cartStorage";
import apiClient from "../../utils/apiClient";
import styles from "./Checkout.module.css";

export default function Checkout() {
  const [items] = useState(() => readCart());
  const [productDetails, setProductDetails] = useState({});
  const [allergenAcknowledged, setAllergenAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subtotal = useMemo(
    () => getCartSubtotal(items),
    [items]
  );

  const commission = subtotal * 0.05;

  const productIdsKey = useMemo(() => {
    return [...new Set(items.map((item) => item.productId).filter(Boolean))]
      .sort()
      .join(",");
  }, [items]);

  useEffect(() => {
    const productIds = productIdsKey ? productIdsKey.split(",") : [];

    if (productIds.length === 0) {
      setProductDetails({});
      return;
    }

    Promise.all(
      productIds.map((id) =>
        apiClient
          .get(`/products/${id}/`)
          .then(({ data }) => [id, data])
          .catch(() => [id, null])
      )
    ).then((entries) => {
      setProductDetails(
        Object.fromEntries(entries.filter(([, product]) => product))
      );
    });
  }, [productIdsKey]);

  const allergenItems = useMemo(() => {
    return items
      .map((item) => {
        const product = productDetails[item.productId];
        const allergens = product?.allergens ?? [];

        return {
          ...item,
          name: product?.name || item.name,
          allergens,
        };
      })
      .filter((item) => item.allergens.length > 0);
  }, [items, productDetails]);

  const requiresAllergenAcknowledgement = allergenItems.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (requiresAllergenAcknowledgement && !allergenAcknowledged) {
      setError("Please confirm that you have reviewed the allergen information.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/checkout/create-session/", {
        allergen_acknowledged: allergenAcknowledged,
      });

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

          <div className={styles.allergenNotice}>
            <h3>Allergen information</h3>
            {requiresAllergenAcknowledgement ? (
              <>
                <p>
                  The following basket items include declared allergens. Please review them before continuing.
                </p>
                <ul className={styles.allergenList}>
                  {allergenItems.map((item) => (
                    <li key={item.productId}>
                      <strong>{item.name}</strong>
                      <span>
                        {item.allergens.map((allergen) => allergen.name).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No common allergens are declared for the products currently in your basket.</p>
            )}

            <label className={styles.acknowledgement}>
              <input
                type="checkbox"
                checked={allergenAcknowledged}
                onChange={(e) => setAllergenAcknowledged(e.target.checked)}
              />
              <span>I have reviewed the allergen information for my basket.</span>
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            onClick={handleSubmit}
            className={styles.payBtn}
            disabled={loading || (requiresAllergenAcknowledgement && !allergenAcknowledged)}
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
