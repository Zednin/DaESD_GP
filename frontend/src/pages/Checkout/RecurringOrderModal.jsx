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

const MIN_DELIVERY_LEAD_DAYS = 2;
const LEAD_TIME_MESSAGE = "minimum 48 hour difference between order and delivery.";

function hasMinimumDeliveryLeadTime(orderDay, deliveryDay) {
  const daysBetween = (Number(deliveryDay) - Number(orderDay) + 7) % 7;
  return daysBetween >= MIN_DELIVERY_LEAD_DAYS;
}

export default function RecurringOrderModal({ items, initialValue, onClose, onConfirm }) {
  const [name, setName] = useState(initialValue?.name || "");
  const [frequency, setFrequency] = useState(initialValue?.frequency || "weekly");
  const [orderDay, setOrderDay] = useState(initialValue?.order_day ?? 0);
  const [deliveryDay, setDeliveryDay] = useState(initialValue?.delivery_day ?? 2);
  const hasDeliveryLeadTime = hasMinimumDeliveryLeadTime(orderDay, deliveryDay);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!hasDeliveryLeadTime) return;

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
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Set up recurring order"
      >
        <div className={styles.header}>
          <h2>Set up recurring order</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className={styles.body} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Order name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekly kitchen supplies"
              maxLength={100}
            />
          </label>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Frequency</span>
              <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Order day</span>
              <select value={orderDay} onChange={(event) => setOrderDay(event.target.value)}>
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Delivery day</span>
              <select value={deliveryDay} onChange={(event) => setDeliveryDay(event.target.value)}>
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </label>
          </div>

          {!hasDeliveryLeadTime && (
            <div className={styles.leadTimeNotice}>{LEAD_TIME_MESSAGE}</div>
          )}

          <div className={styles.itemsBox}>
            <h3>Items</h3>
            <ul>
              {items.map((item) => (
                <li key={item.productId}>
                  <span>{item.name} × {item.qty}</span>
                  <strong>£{(Number(item.price) * item.qty).toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          </div>

          <p className={styles.preview}>
            Orders will be placed every <strong>{WEEKDAYS[orderDay]}</strong>
            {frequency === "fortnightly" ? " every two weeks" : ""} and delivered on{" "}
            <strong>{WEEKDAYS[deliveryDay]}</strong>.
          </p>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={!hasDeliveryLeadTime}>
              Confirm recurring order
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}