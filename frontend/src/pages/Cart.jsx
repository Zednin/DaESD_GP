import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "./Cart.module.css";
import { Link } from "react-router-dom";
import {
  readCart,
  updateCartQty,
  removeFromCart,
  getCartDiscountTotal,
  getCartLinePricing,
  getCartOriginalSubtotal,
  getCartSubtotal,
  getQuantityLimit,
  MIN_CHECKOUT_AMOUNT,
} from "../utils/cartStorage";
import apiClient from "../utils/apiClient";
import { useAuth } from "../auth/AuthContext";

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function getProducerName(item) {
  return item.producerName || item.producer_name || "Unknown producer";
}

function getProducerId(item) {
  return item.producerId || item.producer_id || getProducerName(item);
}

function getImageUrl(item) {
  return item.image || item.image_url || "";
}

function QuantityStepper({ value, max, onDecrease, onIncrease }) {
  const atMax = Number.isFinite(max) && Number(value) >= max;

  return (
    <div className={styles.qtyStepper}>
      <button
        type="button"
        className={styles.qtyButton}
        onClick={onDecrease}
        disabled={Number(value) <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>

      <motion.span
        key={value}
        className={styles.qtyNumber}
        initial={{ scale: 0.86 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
      >
        {value}
      </motion.span>

      <button
        type="button"
        className={styles.qtyButton}
        onClick={onIncrease}
        disabled={atMax}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export default function Cart() {
  const { canUseBulkOrders } = useAuth();
  const [items, setItems] = useState(() => readCart());
  const [productDetails, setProductDetails] = useState({});
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    function sync() {
      setItems(readCart());
    }

    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);

  const productIdsKey = useMemo(() => {
    return [...new Set(items.map((item) => item.productId).filter(Boolean))]
      .sort()
      .join(",");
  }, [items]);

  useEffect(() => {
    const productIds = productIdsKey ? productIdsKey.split(",") : [];

    if (productIds.length === 0) {
      const timer = window.setTimeout(() => setProductDetails({}), 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;

    Promise.all(
      productIds.map((id) =>
        apiClient
          .get(`/products/${id}/`)
          .then(({ data }) => [id, data])
          .catch(() => [id, null])
      )
    ).then((entries) => {
      if (!cancelled) {
        setProductDetails(
          Object.fromEntries(entries.filter(([, product]) => product))
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [productIdsKey]);

  const enrichedItems = useMemo(() => {
    return items
      .map((item, index) => {
        const product = productDetails[item.productId] || {};

        return {
          ...item,
          name: product.name || item.name,
          unit: product.unit || item.unit,
          image: product.image || item.image,
          producerId:
            product.producer_id ||
            product.producer ||
            item.producerId ||
            item.producer_id,
          producerName:
            product.producer_name ||
            item.producerName ||
            item.producer_name ||
            "Unknown producer",
          categoryName: product.category_name || item.categoryName,
          stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : item.stock,
          status: product.status || item.status,
          bulk_stock_threshold: product.bulk_stock_threshold ?? item.bulk_stock_threshold,
          bulk_stock_discount: product.bulk_stock_discount ?? item.bulk_stock_discount,
          pre_bulk_price: item.pre_bulk_price ?? item.price,
          displayOrder: index,
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [items, productDetails]);

  const pricedItems = useMemo(() => {
    return enrichedItems.map((item) => ({
      ...item,
      pricing: getCartLinePricing(item, { canUseBulkOrders }),
    }));
  }, [canUseBulkOrders, enrichedItems]);

  const producerGroups = useMemo(() => {
    const groups = new Map();

    pricedItems.forEach((item) => {
      const producerId = getProducerId(item);
      const producerName = getProducerName(item);

      if (!groups.has(producerId)) {
        groups.set(producerId, {
          producerId,
          producerName,
          items: [],
          subtotal: 0,
          discount: 0,
          firstDisplayOrder: item.displayOrder,
        });
      }

      const group = groups.get(producerId);

      group.items.push(item);
      group.subtotal += item.pricing.lineTotal;
      group.discount += item.pricing.discountAmount;
      group.firstDisplayOrder = Math.min(group.firstDisplayOrder, item.displayOrder);
    });

    return Array.from(groups.values()).sort(
      (a, b) => a.firstDisplayOrder - b.firstDisplayOrder
    );
  }, [pricedItems]);

  const originalSubtotal = useMemo(
    () => getCartOriginalSubtotal(pricedItems, { canUseBulkOrders }),
    [canUseBulkOrders, pricedItems]
  );
  const bulkDiscount = useMemo(
    () => getCartDiscountTotal(pricedItems, { canUseBulkOrders }),
    [canUseBulkOrders, pricedItems]
  );
  const subtotal = useMemo(
    () => getCartSubtotal(pricedItems, { canUseBulkOrders }),
    [canUseBulkOrders, pricedItems]
  );

  const totalItems = useMemo(
    () => pricedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [pricedItems]
  );
  const belowMinimumCheckoutAmount = pricedItems.length > 0 && subtotal < MIN_CHECKOUT_AMOUNT;
  const minimumRemaining = Math.max(0, MIN_CHECKOUT_AMOUNT - subtotal);

  async function updateQty(productId, nextQty) {
    const qty = Math.max(1, Number(nextQty || 1));
    setCartError("");

    try {
      await updateCartQty(productId, qty, { canUseBulkOrders });
    } catch (error) {
      setCartError(error.message || "Could not update quantity.");
    }
  }

  async function removeItem(productId) {
    setCartError("");
    await removeFromCart(productId);
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Basket</span>
        <h1>Your basket</h1>
        <p>Review your selected products, grouped by producer, before checkout.</p>
        {cartError && <p className={styles.errorText}>{cartError}</p>}
      </header>

      {items.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.emptyIcon}>🛒</div>
          <h2>Your basket is empty</h2>
          <p>Add something tasty from Products.</p>
          <Link className={styles.primaryBtn} to="/products">
            Browse products
          </Link>
        </section>
      ) : (
        <div className={styles.layout}>
          <section className={styles.itemsColumn}>
            {producerGroups.map((group) => (
              <section key={group.producerId} className={styles.producerCard}>
                <div className={styles.producerHeader}>
                  <div>
                    <span className={styles.producerLabel}>Producer</span>
                    <h2>{group.producerName}</h2>
                  </div>

                  <div className={styles.producerSummary}>
                    <span>
                      {group.items.length} product
                      {group.items.length === 1 ? "" : "s"}
                    </span>
                    <strong>{money(group.subtotal)}</strong>
                  </div>
                </div>

                <ul className={styles.list}>
                  {group.items.map((item) => {
                    const pricing = item.pricing;
                    const lineTotal = pricing.lineTotal;
                    const imageUrl = getImageUrl(item);
                    const maxQuantity = getQuantityLimit(item, { canUseBulkOrders });

                    return (
                      <li key={item.productId} className={styles.row}>
                        <div className={styles.thumb}>
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className={styles.productImage}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.imageFallback}>No image</div>
                          )}
                        </div>

                        <div className={styles.info}>
                          <div className={styles.nameRow}>
                            <div className={styles.name}>{item.name}</div>
                            {pricing.discountAmount > 0 && (
                              <span className={styles.bulkTag}>Bulk order</span>
                            )}
                          </div>

                          <div className={styles.meta}>
                            {item.categoryName && (
                              <span>{item.categoryName} · </span>
                            )}
                            <span>{money(pricing.unitPrice)} / {item.unit || "item"}</span>
                          </div>

                          <div className={styles.controls}>
                            <div className={styles.qtyControl}>
                              <span className={styles.qtyLabel}>Qty</span>
                              <QuantityStepper
                                value={item.qty}
                                max={maxQuantity}
                                onDecrease={() =>
                                  updateQty(item.productId, Number(item.qty) - 1)
                                }
                                onIncrease={() =>
                                  updateQty(item.productId, Number(item.qty) + 1)
                                }
                              />
                            </div>

                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => removeItem(item.productId)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className={styles.totalBlock}>
                          <span>Line total</span>
                          {pricing.discountAmount > 0 ? (
                            <strong className={styles.linePriceCompare}>
                              <span>{money(pricing.originalLineTotal)}</span>
                              <i aria-hidden="true">|</i>
                              <b>{money(lineTotal)}</b>
                            </strong>
                          ) : (
                            <strong>{money(lineTotal)}</strong>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            <div className={styles.backRow}>
              <Link className={styles.linkBtn} to="/products">
                ← Continue shopping
              </Link>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Order summary</h2>

            <ul className={styles.summaryList}>
              {pricedItems.map((item) => (
                <li key={item.productId} className={styles.summaryItemRow}>
                  <span>{item.name} × {item.qty}</span>
                  <strong>{money(item.pricing.originalLineTotal)}</strong>
                </li>
              ))}
            </ul>

            <div className={styles.summaryRow}>
              <span>Total</span>
              <strong>{money(originalSubtotal)}</strong>
            </div>

            <div className={`${styles.summaryRow} ${bulkDiscount > 0 ? styles.discountRow : ""}`}>
              <span>Discount</span>
              <strong>{bulkDiscount > 0 ? `-${money(bulkDiscount)}` : money(0)}</strong>
            </div>

            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>

            {belowMinimumCheckoutAmount && (
              <div className={styles.minimumNotice}>
                <strong>{money(minimumRemaining)} more to checkout</strong>
                <span>Card payments need to be at least {money(MIN_CHECKOUT_AMOUNT)}.</span>
              </div>
            )}

            <p className={styles.summaryHint}>
              {totalItems} item{totalItems === 1 ? "" : "s"} from {producerGroups.length} producer{producerGroups.length === 1 ? "" : "s"}.
            </p>

            <Link
              className={`${styles.checkoutBtn} ${belowMinimumCheckoutAmount ? styles.disabledCheckoutBtn : ""}`}
              to={belowMinimumCheckoutAmount ? "/cart" : "/checkout"}
              aria-disabled={belowMinimumCheckoutAmount}
              onClick={(event) => {
                if (belowMinimumCheckoutAmount) {
                  event.preventDefault();
                }
              }}
            >
              {belowMinimumCheckoutAmount ? "Go to checkout" : "Go to checkout"}
            </Link>

            <Link
              className={`${styles.secondaryBtn} ${belowMinimumCheckoutAmount ? styles.addMorePriorityBtn : ""}`}
              to="/products"
            >
              Add more items
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
