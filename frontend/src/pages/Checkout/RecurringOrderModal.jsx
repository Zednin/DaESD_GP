import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import styles from "./RecurringOrderModal.module.css";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function RecurringOrderModal({ items, onClose, onConfirm }) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [orderDay, setOrderDay] = useState(0);
  const [deliveryDay, setDeliveryDay] = useState(2);

  // ESC to close
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({
      name: name.trim() || "My recurring order",
      frequency,
      order_day: Number(orderDay),
      delivery_day: Number(deliveryDay),
    });
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
        aria-label="Set up recurring order"
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Set Up Recurring Order</h2>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form className={styles.body} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Order Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Weekly Kitchen Supplies"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Frequency</label>
              <select
                className={styles.select}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Order Day</label>
              <select
                className={styles.select}
                value={orderDay}
                onChange={(e) => setOrderDay(e.target.value)}
              >
                {WEEKDAYS.map((day, i) => (
                  <option key={i} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Delivery Day</label>
              <select
                className={styles.select}
                value={deliveryDay}
                onChange={(e) => setDeliveryDay(e.target.value)}
              >
                {WEEKDAYS.map((day, i) => (
                  <option key={i} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items summary */}
          <div className={styles.itemsSummary}>
            <h4 className={styles.itemsHeading}>Items in this order</h4>
            <ul className={styles.itemsList}>
              {items.map((item) => (
                <li key={item.productId} className={styles.itemRow}>
                  <span>{item.name} × {item.qty}</span>
                  <span>
                    £{(Number(item.price) * item.qty).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Schedule preview */}
          <div className={styles.scheduleNote}>
            Orders placed every <strong>{WEEKDAYS[orderDay]}</strong>
            {frequency === "fortnightly" && " (fortnightly)"}
            , delivered on <strong>{WEEKDAYS[deliveryDay]}</strong>.
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.confirmBtn}
            >
              Confirm Recurring Order
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
