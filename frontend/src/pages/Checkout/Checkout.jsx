import { useMemo, useState } from "react";
import { readCart, getCartSubtotal } from "../../utils/cartStorage";
import { ensureCsrf, getCookie } from "../../utils/auth";
import styles from "./Checkout.module.css";

export default function Checkout() {
  const [items] = useState(() => readCart());

  const subtotal = useMemo(
    () => getCartSubtotal(items),
    [items]
  );

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

async function handleSubmit(e) {
  e.preventDefault();

  const payload = {
    items,
    subtotal,
    delivery: formData,
  };

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
      body: JSON.stringify(payload),
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
    alert("Unable to start checkout. Please try again.");
  }
}

  return (
    <main className={`container ${styles.page}`}>
      <h1>Checkout</h1>

      <div className={styles.layout}>
        {/* LEFT: delivery form */}
        <section className={styles.formCard}>
          <h2>Delivery details</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              name="fullName"
              placeholder="Full name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              name="addressLine1"
              placeholder="Address line 1"
              value={formData.addressLine1}
              onChange={handleChange}
              required
            />

            <input
              name="addressLine2"
              placeholder="Address line 2"
              value={formData.addressLine2}
              onChange={handleChange}
            />

            <input
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              required
            />

            <input
              name="postcode"
              placeholder="Postcode"
              value={formData.postcode}
              onChange={handleChange}
              required
            />

            <button type="submit" className={styles.payBtn}>
              Place order
            </button>
          </form>
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
                  £{(item.qty * Number(item.price)).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <strong>£{subtotal.toFixed(2)}</strong>
          </div>
        </aside>
      </div>
    </main>
  );
}