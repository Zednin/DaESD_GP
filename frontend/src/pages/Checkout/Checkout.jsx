import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FiCalendar, FiEdit3, FiFileText, FiRepeat, FiTag, FiTruck, FiX } from "react-icons/fi";
import { readCart, getCartSubtotal } from "../../utils/cartStorage";
import apiClient from "../../utils/apiClient";
import { useAuth } from "../../auth/AuthContext";
import RecurringOrderModal from "./RecurringOrderModal";
import styles from "./Checkout.module.css";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// formats date for date input
function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// works out earliest bulk delivery date
function getMinDateFromLeadTime(hours) {
  const date = new Date();
  date.setHours(date.getHours() + Number(hours || 48));
  return formatDateInput(date);
}

function getNextDateForWeekday(weekday) {
  const date = new Date();
  const today = (date.getDay() + 6) % 7;
  let daysUntilNext = (Number(weekday) - today + 7) % 7;
  if (daysUntilNext === 0) daysUntilNext = 7;
  date.setDate(date.getDate() + daysUntilNext);
  return date;
}

function getRecurringDeliveryDate(prefs) {
  if (!prefs) return "";

  const orderDate = getNextDateForWeekday(prefs.order_day);
  let daysUntilDelivery = (Number(prefs.delivery_day) - Number(prefs.order_day) + 7) % 7;
  if (daysUntilDelivery === 0) daysUntilDelivery = 7;
  orderDate.setDate(orderDate.getDate() + daysUntilDelivery);
  return formatDateInput(orderDate);
}

function isRestaurantCustomer(user) {
  return (
    user?.account_type === "restaurant" ||
    user?.organisation?.organisation_type === "restaurant"
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const [items] = useState(() => readCart());
  const [productDetails, setProductDetails] = useState({});
  const [allergenAcknowledged, setAllergenAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // stores the extra checkout options
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringPrefs, setRecurringPrefs] = useState(null);
  const [bulkInstructions, setBulkInstructions] = useState("");
  const [bulkDeliveryDate, setBulkDeliveryDate] = useState("");

  const canCreateRecurring = isRestaurantCustomer(user);

  const subtotal = useMemo(
    () => getCartSubtotal(items),
    [items]
  );

  // bulk starts when any item quantity is over 20
  const isBulkCheckout = useMemo(
    () => items.some((item) => Number(item.qty || 0) > 20),
    [items]
  );

  // bulk uses the longest producer lead time
  const bulkLeadTimeHours = useMemo(
    () => Math.max(
      48,
      ...items.map((item) => Number(item.leadTimeHours || item.lead_time_hours || 48))
    ),
    [items]
  );
  const minBulkDeliveryDate = useMemo(
    () => getMinDateFromLeadTime(bulkLeadTimeHours),
    [bulkLeadTimeHours]
  );
  const recurringBulkDeliveryDate = useMemo(
    () => getRecurringDeliveryDate(recurringPrefs),
    [recurringPrefs]
  );
  const bulkDiscount = isBulkCheckout ? subtotal * 0.05 : 0;
  const discountedSubtotal = Math.max(0, subtotal - bulkDiscount);
  const commission = discountedSubtotal * 0.05;
  const itemCount = items.reduce((total, item) => total + Number(item.qty || 0), 0);
  const recurringFrequency = recurringPrefs?.frequency === "fortnightly" ? "Fortnightly" : "Weekly";

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
      if (recurringPrefs && !canCreateRecurring) {
        throw new Error("Recurring orders are only available for restaurant customers.");
      }

      // normal bulk needs a requested delivery date
      if (isBulkCheckout && !recurringPrefs && !bulkDeliveryDate) {
        throw new Error("Choose a delivery date for this bulk order.");
      }

      // stop normal bulk dates before the lead time
      if (isBulkCheckout && !recurringPrefs && bulkDeliveryDate < minBulkDeliveryDate) {
        throw new Error("Choose a delivery date that respects producer lead time.");
      }

      const payload = {
        allergen_acknowledged: allergenAcknowledged,
      };
      if (recurringPrefs) {
        payload.recurring = recurringPrefs;
      }
      if (isBulkCheckout) {
        // send bulk notes, and date only for normal bulk
        if (!recurringPrefs) {
          payload.requested_delivery_date = bulkDeliveryDate;
        }
        payload.special_instructions = bulkInstructions.trim();
      }

      const { data } = await apiClient.post("/checkout/create-session/", payload);

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

          {/* lets restaurants save this basket as recurring */}
          {canCreateRecurring && (
            recurringPrefs ? (
              <section className={styles.recurringSnapshot} aria-label="Recurring order schedule">
                <div className={styles.recurringSnapshotHeader}>
                  <div className={styles.recurringSnapshotTitle}>
                    <span className={styles.recurringIcon} aria-hidden="true">
                      <FiRepeat />
                    </span>
                    <div>
                      <span className={styles.recurringEyebrow}>Recurring order</span>
                      <h3>{recurringPrefs.name || "Kitchen order"}</h3>
                    </div>
                  </div>
                  <div className={styles.recurringActions}>
                    <button
                      type="button"
                      className={styles.recurringActionBtn}
                      onClick={() => setShowRecurring(true)}
                      aria-label="Edit recurring order"
                    >
                      <FiEdit3 aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.recurringActionBtn} ${styles.recurringCancelBtn}`}
                      onClick={() => setRecurringPrefs(null)}
                      aria-label="Cancel recurring order"
                    >
                      <FiX aria-hidden="true" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>

                <div className={styles.recurringSnapshotGrid}>
                  <div className={styles.recurringSnapshotItem}>
                    <span>Frequency</span>
                    <strong>{recurringFrequency}</strong>
                  </div>
                  <div className={styles.recurringSnapshotItem}>
                    <span>Order day</span>
                    <strong>{WEEKDAYS[recurringPrefs.order_day]}</strong>
                  </div>
                  <div className={styles.recurringSnapshotItem}>
                    <span>Delivery day</span>
                    <strong>{WEEKDAYS[recurringPrefs.delivery_day]}</strong>
                  </div>
                </div>

                <div className={styles.recurringSnapshotFooter}>
                  <FiCalendar aria-hidden="true" />
                  <span>{itemCount} item{itemCount === 1 ? "" : "s"} scheduled from this basket</span>
                </div>
              </section>
            ) : (
              <section className={styles.recurringSetup} aria-label="Recurring order option">
                <div className={styles.recurringSetupText}>
                  <span className={styles.recurringIcon} aria-hidden="true">
                    <FiRepeat />
                  </span>
                  <div>
                    <h3>Recurring order</h3>
                    <p>Arrange items for recurring orders from producers</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.recurringSetupBtn}
                  onClick={() => setShowRecurring(true)}
                >
                  Set up
                </button>
              </section>
            )
          )}

          {/* recurring bulk uses the recurring delivery date */}
          {isBulkCheckout && (
            <section className={styles.bulkSnapshot} aria-label="Bulk order details">
              <div className={styles.bulkHeader}>
                <span className={styles.bulkIcon} aria-hidden="true">
                  <FiTag />
                </span>
                <div>
                  <span className={styles.bulkEyebrow}>Bulk order</span>
                  <h3>5% discount applied</h3>
                </div>
              </div>

              <div className={styles.bulkFields}>
                {recurringPrefs ? (
                  <div className={styles.bulkScheduleNote}>
                    <span><FiCalendar aria-hidden="true" /> Recurring delivery</span>
                    <strong>{new Date(`${recurringBulkDeliveryDate}T00:00:00`).toLocaleDateString("en-GB")}</strong>
                  </div>
                ) : (
                  <label className={styles.bulkField}>
                    <span><FiTruck aria-hidden="true" /> Delivery date</span>
                    <input
                      type="date"
                      min={minBulkDeliveryDate}
                      value={bulkDeliveryDate}
                      onChange={(event) => setBulkDeliveryDate(event.target.value)}
                      required
                    />
                    <small>Earliest date: {new Date(`${minBulkDeliveryDate}T00:00:00`).toLocaleDateString("en-GB")}</small>
                  </label>
                )}

                <label className={styles.bulkField}>
                  <span><FiFileText aria-hidden="true" /> Additional notes</span>
                  <textarea
                    rows={4}
                    maxLength={450}
                    placeholder="Access notes, unloading details, delivery contact, or timing preferences"
                    value={bulkInstructions}
                    onChange={(event) => setBulkInstructions(event.target.value)}
                  />
                  <small>{bulkInstructions.length}/450</small>
                </label>
              </div>
            </section>
          )}

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
                  {Number(item.qty || 0) > 20 && (
                    <span className={styles.bulkItemTag}>Bulk</span>
                  )}
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

          {/* show discount before payment redirect */}
          {isBulkCheckout && (
            <>
              <div className={`${styles.totalRow} ${styles.discountRow}`}>
                <span>Bulk discount (5%)</span>
                <span>-{formatCurrency(bulkDiscount)}</span>
              </div>

              <div className={styles.totalRow}>
                <span>Discounted subtotal</span>
                <strong>{formatCurrency(discountedSubtotal)}</strong>
              </div>
            </>
          )}

          <div className={styles.totalRow}>
            <span>Platform fee (5%)</span>
            <span>{formatCurrency(commission)}</span>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showRecurring && (
          <RecurringOrderModal
            items={items}
            initialValue={recurringPrefs}
            onClose={() => setShowRecurring(false)}
            onConfirm={(prefs) => {
              setRecurringPrefs(prefs);
              setShowRecurring(false);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
