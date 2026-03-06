import { useEffect, useMemo, useState } from "react";
import styles from "./Cart.module.css";
import { Link } from "react-router-dom";
import { readCart, updateCartQty, removeFromCart, getCartSubtotal } from "../utils/cartStorage";


export default function Cart() {
  const [items, setItems] = useState(() => readCart());

  useEffect(() => {
    function sync() {
      setItems(readCart());
    }
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);

  async function updateQty(productId, nextQty) {
    await updateCartQty(productId, nextQty);
  }

  async function removeItem(productId) {
    await removeFromCart(productId);
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>Your basket</h1>
        <p>Review items, adjust quantities, then checkout.</p>
      </header>

      {items.length === 0 ? (
        <section className={styles.empty}>
          <h2>Your basket is empty</h2>
          <p>Add something tasty from Products.</p>
          <Link className={styles.primaryBtn} to="/products">
            Browse products
          </Link>
        </section>
      ) : (
        <div className={styles.layout}>
          {/* LEFT: items */}
          <section className={styles.itemsCard}>
            <div className={styles.itemsHeader}>
              <span className={styles.itemsTitle}>Items</span>
              <span className={styles.itemsMeta}>{items.length} items</span>
            </div>

            <ul className={styles.list}>
              {items.map((item) => {
                const lineTotal = item.qty * Number(item.price);
                return (
                  <li key={item.productId} className={styles.row}>
                    <div className={styles.thumb} aria-hidden="true" />

                    <div className={styles.info}>
                      <div className={styles.name}>{item.name}</div>
                      <div className={styles.meta}>
                        £{Number(item.price).toFixed(2)} / {item.unit}
                      </div>

                      <div className={styles.controls}>
                        <label className={styles.qtyLabel}>
                          Qty
                          <input
                            className={styles.qtyInput}
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateQty(item.productId, e.target.value)}
                          />
                        </label>

                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeItem(item.productId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className={styles.total}>
                      £{lineTotal.toFixed(2)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={styles.backRow}>
              <Link className={styles.linkBtn} to="/products">
                ← Continue shopping
              </Link>
            </div>
          </section>

          {/* RIGHT: summary */}
          <aside className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Summary</h2>

            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <strong>£{subtotal.toFixed(2)}</strong>
            </div>

            <div className={styles.summaryHint}>
              Delivery and any discounts will be calculated at checkout.
            </div>

            <Link className={styles.checkoutBtn} to="/checkout">
              Go to checkout
            </Link>

            <Link className={styles.secondaryBtn} to="/products">
              Add more items
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}