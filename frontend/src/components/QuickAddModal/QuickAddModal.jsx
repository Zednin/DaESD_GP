import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import styles from "./QuickAddModal.module.css";
import { getAllergenInfo, formatAllergenList } from "../../utils/allergenIcons";
import { getCartQtyForProduct, readCart } from "../../utils/cartStorage";

export default function QuickAddModal({
  product,
  onClose,
  onAdd,
  cartSubtotal,
  freeShippingThreshold = 40,
}) {
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addStatus, setAddStatus] = useState("idle");
  const [addError, setAddError] = useState("");
  const [cartQty, setCartQty] = useState(() => getCartQtyForProduct(product?.id, readCart()));
  const closeTimerRef = useRef(null);

  const images = useMemo(() => {
    return product?.image ? [product.image] : [];
  }, [product]);

  const progress = Math.min(cartSubtotal / freeShippingThreshold, 1);
  const remaining = Math.max(freeShippingThreshold - cartSubtotal, 0);
  const stockLimit = useMemo(() => {
    const stock = Number(product?.stock);
    return Number.isFinite(stock) ? Math.max(0, stock) : Infinity;
  }, [product]);
  const isUnavailable = product?.status === "unavailable" || stockLimit <= 0;
  const availableToAdd = Number.isFinite(stockLimit)
    ? Math.max(0, stockLimit - cartQty)
    : Infinity;
  const addBlockedByStock = !isUnavailable && qty > availableToAdd;
  const cannotAddMore = !isUnavailable && availableToAdd <= 0;
  const addDisabled = isUnavailable || (addStatus === "idle" && (addBlockedByStock || cannotAddMore));
  const stockMessage = useMemo(() => {
    if (addError) return addError;
    if (isUnavailable || addStatus !== "idle" || !Number.isFinite(stockLimit)) return "";
    if (cannotAddMore) return "Stock limit reached.";
    if (addBlockedByStock) return `${availableToAdd} more available.`;
    return "";
  }, [addBlockedByStock, addError, addStatus, availableToAdd, cannotAddMore, cartQty, isUnavailable, stockLimit]);

  function updateQty(next) {
    if (isUnavailable) {
      setQty(1);
      return;
    }

    setAddError("");
    setQty(Math.min(Math.max(1, next), stockLimit));
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    function syncCartQty() {
      setCartQty(getCartQtyForProduct(product?.id, readCart()));
    }

    syncCartQty();
    window.addEventListener("cart:updated", syncCartQty);
    return () => window.removeEventListener("cart:updated", syncCartQty);
  }, [product]);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setQty(1);
    setActiveImage(0);
    setAddStatus("idle");
    setAddError("");
  }, [product]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  async function handleAdd() {
    if (addDisabled || addStatus !== "idle") return;

    try {
      await onAdd(product, qty);
      setAddStatus("added");
      setAddError("");
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(onClose, 1100);
    } catch (err) {
      setAddStatus("idle");
      setAddError(err?.message || "This quantity could not be added to your basket.");
    }
  }

  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick add ${product.name}`}
      >
        <div className={styles.modalHeader}>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.media}>
            <div className={styles.imageStage}>
              {images.length > 0 ? (
                <img
                  src={images[activeImage]}
                  alt={product.name}
                  className={styles.mainImage}
                />
              ) : (
                <div className={styles.mainImagePlaceholder}>No image available</div>
              )}

              {images.length > 1 && (
                <div className={styles.dots} aria-label="Image carousel">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.dot} ${idx === activeImage ? styles.dotActive : ""}`}
                      onClick={() => setActiveImage(idx)}
                      aria-label={`View image ${idx + 1}`}
                      aria-current={idx === activeImage ? "true" : "false"}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.info}>
            <div className={styles.titleBlock}>
              <h2 className={styles.title}>{product.name}</h2>
              <div className={styles.priceLine}>
                {product.original_price ? (
                  <>
                    <span className={styles.originalPriceStrike}>
                      £{Number(product.original_price).toFixed(2)}
                    </span>
                    <span className={styles.surplusPrice}>
                      £{Number(product.price).toFixed(2)}
                    </span>
                    <span className={styles.unit}>/ {product.unit}</span>
                    <span className={styles.surplusBadge}>DISCOUNT DEAL</span>
                  </>
                ) : (
                  <>
                    <span className={styles.price}>
                      £{Number(product.price).toFixed(2)}
                    </span>
                    <span className={styles.unit}>/ {product.unit}</span>
                  </>
                )}
              </div>
            </div>

            {product.description ? (
              <p className={styles.desc}>{product.description}</p>
            ) : (
              <p className={styles.descMuted}>Fresh, locally sourced produce.</p>
            )}

            <div className={styles.allergenSection}>
              <h4 className={styles.allergenHeading}>Allergen Information</h4>
              {product.allergens && product.allergens.length > 0 ? (
                <>
                  <p className={styles.allergenContains}>
                    {formatAllergenList(product.allergens)}
                  </p>
                  <div className={styles.allergenIcons}>
                    {product.allergens.map((a) => {
                      const { Icon, label } = getAllergenInfo(a.name);
                      return (
                        <span key={a.id} className={styles.allergenIconTag} title={label}>
                          <Icon size={16} />
                          <span>{label}</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className={styles.allergenNone}>No common allergens</p>
              )}
            </div>

            <div className={styles.controls}>
              <label className={styles.qtyLabel}>
                Quantity
                {Number.isFinite(stockLimit) && (
                  <span> · {stockLimit} in stock</span>
                )}
              </label>
              <br />
              <div className={styles.qtyRow}>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  disabled={isUnavailable || qty <= 1}
                  onClick={() => updateQty(qty - 1)}
                >
                  −
                </button>

                <input
                  type="number"
                  min={1}
                  max={Number.isFinite(stockLimit) ? stockLimit : undefined}
                  disabled={isUnavailable}
                  className={styles.qtyInput}
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateQty(Number.isFinite(n) ? n : 1);
                  }}
                />

                <button
                  type="button"
                  className={styles.qtyBtn}
                  disabled={isUnavailable || qty >= stockLimit}
                  onClick={() => updateQty(qty + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={styles.addBtn}
                disabled={addDisabled}
                onClick={handleAdd}
              >
                {isUnavailable && "Out of stock"}
                {!isUnavailable && addStatus === "added" && "Added ✓"}
                {!isUnavailable && addStatus === "idle" &&
                  `Add to basket — £${(Number(product.price) * qty).toFixed(2)}`}
                {!isUnavailable && addStatus === "idle" && product.original_price && (
                  <span className={styles.btnSaving}>
                    {" "}
                    (save £
                    {(
                      (Number(product.original_price) - Number(product.price)) *
                      qty
                    ).toFixed(2)}
                    )
                  </span>
                )}
              </button>
              {stockMessage && <p className={styles.stockMessage}>{stockMessage}</p>}
            </div>

            <div className={styles.shipping}>
              <div className={styles.shippingText}>
                {remaining > 0 ? (
                  <>
                    Spend <strong>£{remaining.toFixed(2)}</strong> more for{" "}
                    <strong>FREE</strong> delivery
                  </>
                ) : (
                  <>
                    You’ve unlocked <strong>FREE</strong> delivery
                  </>
                )}
              </div>

              <div className={styles.bar}>
                <div
                  className={styles.barFill}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <div className={styles.barMeta}>
                <span>£0</span>
                <span>£{freeShippingThreshold.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
