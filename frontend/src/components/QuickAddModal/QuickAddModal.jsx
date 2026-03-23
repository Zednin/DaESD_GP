import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "./QuickAddModal.module.css";
import { getAllergenInfo, formatAllergenList } from "../../utils/allergenIcons";

export default function QuickAddModal({
  product,
  onClose,
  onAdd,
  cartSubtotal,
  freeShippingThreshold = 40,
}) {
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Dummy images for the time being
  const images = useMemo(() => {
    return [0, 1, 2]; // placeholders
  }, [product]);

  const progress = Math.min(cartSubtotal / freeShippingThreshold, 1);
  const remaining = Math.max(freeShippingThreshold - cartSubtotal, 0);

  // ESC to close
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setQty(1);
    setActiveImage(0);
    }, [product]);

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
          {/* LEFT: image area */}
          <div className={styles.media}>
            <div className={styles.imageStage}>
              <div className={styles.mainImagePlaceholder} />

              {/* Carousel indicators (lines/dots) */}
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
            </div>
          </div>

          {/* RIGHT: info */}
          <div className={styles.info}>
            <div className={styles.titleBlock}>
              <h2 className={styles.title}>{product.name}</h2>
              <div className={styles.priceLine}>
                <span className={styles.price}>
                  £{Number(product.price).toFixed(2)}
                </span>
                <span className={styles.unit}>/ {product.unit}</span>
              </div>
            </div>

            {product.description ? (
              <p className={styles.desc}>{product.description}</p>
            ) : (
              <p className={styles.descMuted}>Fresh, locally sourced produce.</p>
            )}

            {/* Allergen information */}
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
              <label className={styles.qtyLabel}>Quantity</label>
              <br/>
              <div className={styles.qtyRow}>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => setQty((v) => Math.max(1, v - 1))}
                >
                  −
                </button>

                <input
                  type="number"
                  min={1}
                  className={styles.qtyInput}
                  value={qty}
                  onChange={(e) => {
                      const n = Number(e.target.value);
                      setQty(Number.isFinite(n) ? Math.max(1, n) : 1);
                  }}
                />

                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => setQty((v) => v + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={styles.addBtn}
                onClick={() => onAdd(product, qty)}
              >
                Add to basket — £{(Number(product.price) * qty).toFixed(2)}
              </button>
            </div>

            {/* Free shipping progress bar */}
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