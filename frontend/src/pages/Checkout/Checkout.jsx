import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FiCalendar, FiEdit3, FiFileText, FiRepeat, FiTag, FiTruck, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  getBulkDiscountPercent,
  getBulkThreshold,
  getCartDiscountTotal,
  getCartLinePricing,
  getCartOriginalSubtotal,
  getCartSubtotal,
  isBulkQuantity,
  MIN_CHECKOUT_AMOUNT,
  MIN_CHECKOUT_MESSAGE,
  readCart,
} from "../../utils/cartStorage";
import apiClient from "../../utils/apiClient";
import { useAuth } from "../../auth/AuthContext";
import RecurringOrderModal from "./RecurringOrderModal";
import ProducerLeadTimeTags from "./ProducerLeadTimeTags";
import { getMaxLeadTimeHours, getProducerLeadTimeGroups } from "./producerLeadTimes";
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

const DELIVERY_FEE_PER_PRODUCER = 3.99;
const FREE_DELIVERY_THRESHOLD = 40;

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

export default function Checkout() {
  const { canUseRecurringOrders, canUseBulkOrders } = useAuth();
  const navigate = useNavigate();
  const [items] = useState(() => readCart());
  const [productDetails, setProductDetails] = useState({});
  const [allergenAcknowledged, setAllergenAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // stores the extra checkout options
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringPrefs, setRecurringPrefs] = useState(null);
  const [bulkInstructions, setBulkInstructions] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [fulfilmentMethod, setFulfilmentMethod] = useState("delivery");
  const [requestedDeliveryDates, setRequestedDeliveryDates] = useState({});

  const canCreateRecurring = canUseRecurringOrders;
  const canCreateBulk = canUseBulkOrders;

  const checkoutItems = useMemo(() => {
    return items.map((item) => {
      const product = productDetails[item.productId] ?? {};
      const bulkSource = {
        bulk_stock_threshold: product.bulk_stock_threshold ?? item.bulk_stock_threshold,
        bulk_stock_discount: product.bulk_stock_discount ?? item.bulk_stock_discount,
      };

      return {
        ...item,
        pre_bulk_price: item.pre_bulk_price ?? item.price,
        producer_id: product.producer ?? product.producer_profile_id ?? item.producer_id,
        producer_name: product.producer_name ?? item.producer_name,
        leadTimeHours: product.lead_time_hours ?? item.leadTimeHours ?? item.lead_time_hours,
        bulk_stock_threshold: getBulkThreshold(bulkSource),
        bulk_stock_discount: getBulkDiscountPercent(bulkSource),
      };
    });
  }, [items, productDetails]);

  const subtotal = useMemo(
    () => getCartSubtotal(checkoutItems, { canUseBulkOrders: canCreateBulk }),
    [canCreateBulk, checkoutItems]
  );
  const total = useMemo(
    () => getCartOriginalSubtotal(checkoutItems, { canUseBulkOrders: canCreateBulk }),
    [canCreateBulk, checkoutItems]
  );
  const bulkDiscount = useMemo(
    () => getCartDiscountTotal(checkoutItems, { canUseBulkOrders: canCreateBulk }),
    [canCreateBulk, checkoutItems]
  );

  const isBulkCheckout = useMemo(
    () => checkoutItems.some((item) => isBulkQuantity(item, Number(item.qty || 0))),
    [checkoutItems]
  );
  const eligibleBulkCheckout = isBulkCheckout && canCreateBulk;
  const bulkOrderBlocked = isBulkCheckout && !canCreateBulk;

  const producerCount = useMemo(() => {
    return new Set(
      checkoutItems.map((item) => item.producer_id).filter(Boolean)
    ).size;
  }, [checkoutItems]);

  const deliveryFee = useMemo(() => {
    if (fulfilmentMethod !== "delivery") return 0;
    if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
    return producerCount * DELIVERY_FEE_PER_PRODUCER;
  }, [fulfilmentMethod, producerCount, subtotal]);

  const checkoutTotal = subtotal + deliveryFee;

  const producerLeadTimeGroups = useMemo(
    () => getProducerLeadTimeGroups(checkoutItems),
    [checkoutItems]
  );

  const producerDateRows = useMemo(() => {
  const rows = {};

  for (const item of checkoutItems) {
    const producerId = String(item.producer_id || "");
    if (!producerId) continue;

    const leadTimeHours = Number(item.leadTimeHours || 48);

    if (!rows[producerId]) {
      rows[producerId] = {
        producerId,
        producerName: item.producer_name || "Producer",
        leadTimeHours,
        itemCount: 0,
      };
    }

    rows[producerId].itemCount += Number(item.qty || 0);
    rows[producerId].leadTimeHours = Math.max(
      rows[producerId].leadTimeHours,
      leadTimeHours
    );
  }

  return Object.values(rows).map((row) => ({
    ...row,
    minDate: getMinDateFromLeadTime(row.leadTimeHours),
  }));
}, [checkoutItems]);

  const checkoutLeadTimeHours = useMemo(
    () => getMaxLeadTimeHours(checkoutItems),
    [checkoutItems]
  );

  const minRequestedDeliveryDate = useMemo(
    () => getMinDateFromLeadTime(checkoutLeadTimeHours),
    [checkoutLeadTimeHours]
  );

  const bulkLeadTimeHours = useMemo(
    () => getMaxLeadTimeHours(checkoutItems),
    [checkoutItems]
  );
  const minBulkDeliveryDate = useMemo(
    () => getMinDateFromLeadTime(bulkLeadTimeHours),
    [bulkLeadTimeHours]
  );
  const recurringBulkDeliveryDate = useMemo(
    () => getRecurringDeliveryDate(recurringPrefs),
    [recurringPrefs]
  );
  const belowMinimumCheckoutAmount = checkoutItems.length > 0 && subtotal < MIN_CHECKOUT_AMOUNT;
  const itemCount = items.reduce((total, item) => total + Number(item.qty || 0), 0);
  const recurringFrequency = recurringPrefs?.frequency === "fortnightly" ? "Fortnightly" : "Weekly";

  useEffect(() => {
    setRequestedDeliveryDates((current) => {
      const next = { ...current };
      let changed = false;

      for (const producer of producerDateRows) {
        const selectedDate = next[producer.producerId];

        if (selectedDate && selectedDate < producer.minDate) {
          delete next[producer.producerId];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [producerDateRows]);

  useEffect(() => {
    if (belowMinimumCheckoutAmount) {
      navigate("/cart", { replace: true });
    }
  }, [belowMinimumCheckoutAmount, navigate]);

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

      if (isBulkCheckout && !canCreateBulk) {
        throw new Error("Bulk orders are only available for organisation and producer accounts.");
      }

      if (belowMinimumCheckoutAmount) {
        throw new Error(MIN_CHECKOUT_MESSAGE);
      } 

      for (const producer of producerDateRows) {
        const selectedDate = requestedDeliveryDates[producer.producerId];

        if (!selectedDate) {
          throw new Error(`Choose a ${fulfilmentMethod === "pickup" ? "pickup" : "delivery"} date for ${producer.producerName}.`);
        }

        if (selectedDate < producer.minDate) {
          throw new Error(`${producer.producerName} must be on or after ${new Date(`${producer.minDate}T00:00:00`).toLocaleDateString("en-GB")}.`);
        }
      }

      const payload = {
        allergen_acknowledged: requiresAllergenAcknowledgement
          ? allergenAcknowledged
          : true,
        fulfilment_method: fulfilmentMethod,
        requested_delivery_dates: requestedDeliveryDates,
        special_instructions: specialInstructions.trim(),
      };
      if (recurringPrefs) {
        payload.recurring = recurringPrefs;
      }
      if (eligibleBulkCheckout) {
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
      <header className={styles.header}>
        <span className={styles.eyebrow}>Checkout</span>
        <h1>Checkout</h1>
        <p>Confirm your delivery details and review your order before payment.</p>
      </header>

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

            {requiresAllergenAcknowledgement && (
              <label className={styles.acknowledgement}>
                <input
                  type="checkbox"
                  checked={allergenAcknowledged}
                  onChange={(e) => setAllergenAcknowledged(e.target.checked)}
                />
                <span>I have reviewed the allergen information for my basket.</span>
              </label>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {bulkOrderBlocked && (
            <p className={styles.error}>Bulk orders are only available for organisation and producer accounts.</p>
          )}
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
          {eligibleBulkCheckout && (
            <section className={styles.bulkSnapshot} aria-label="Bulk order details">
              <div className={styles.bulkHeader}>
                <span className={styles.bulkIcon} aria-hidden="true">
                  <FiTag />
                </span>
                <div>
                  <span className={styles.bulkEyebrow}>Bulk order</span>
                  <h3>Bulk pricing applied</h3>
                </div>
              </div>

              <div className={styles.bulkFields}>
                {recurringPrefs && (
                  <>
                    <div className={styles.bulkScheduleNote}>
                      <span><FiCalendar aria-hidden="true" /> Recurring delivery</span>
                      <strong>
                        {new Date(`${recurringBulkDeliveryDate}T00:00:00`).toLocaleDateString("en-GB")}
                      </strong>
                    </div>
                    <ProducerLeadTimeTags groups={producerLeadTimeGroups} />
                  </>
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

          <section className={styles.checkoutOptions}>
            <h3>Fulfilment</h3>

            <div className={styles.fulfilmentChoices}>
              <label className={styles.fulfilmentChoice}>
                <input
                  type="radio"
                  name="fulfilment"
                  value="delivery"
                  checked={fulfilmentMethod === "delivery"}
                  onChange={() => setFulfilmentMethod("delivery")}
                />
                <span>
                  <strong>Delivery</strong>
                  <small>
                    Free over £40, otherwise £3.99 per producer.
                  </small>
                </span>
              </label>

              <label className={styles.fulfilmentChoice}>
                <input
                  type="radio"
                  name="fulfilment"
                  value="pickup"
                  checked={fulfilmentMethod === "pickup"}
                  onChange={() => setFulfilmentMethod("pickup")}
                />
                <span>
                  <strong>Pickup</strong>
                  <small>Collect directly from each producer.</small>
                </span>
              </label>
            </div>

            <div className={styles.instructionsField}>
              <span>
                {fulfilmentMethod === "pickup" ? "Pickup dates" : "Delivery dates"}
              </span>

              {producerDateRows.map((producer) => (
                <label key={producer.producerId} className={styles.producerDateRow}>
                  <span>{producer.producerName}</span>
                  <input
                    type="date"
                    min={producer.minDate}
                    value={requestedDeliveryDates[producer.producerId] || ""}
                    onChange={(event) =>
                      setRequestedDeliveryDates((current) => ({
                        ...current,
                        [producer.producerId]: event.target.value,
                      }))
                    }
                    required
                  />
                  <small>
                    Earliest: {new Date(`${producer.minDate}T00:00:00`).toLocaleDateString("en-GB")}
                    {` based on ${producer.leadTimeHours} hours lead time`}
                  </small>
                </label>
              ))}
            </div>

            <label className={styles.instructionsField}>
              <span>Special instructions</span>
              <textarea
                rows={4}
                maxLength={450}
                placeholder="Delivery notes, pickup notes, allergies, access details, preferred timing..."
                value={specialInstructions}
                onChange={(event) => setSpecialInstructions(event.target.value)}
              />
              <small>{specialInstructions.length}/450</small>
            </label>
          </section>

          <button
            onClick={handleSubmit}
            className={styles.payBtn}
            disabled={
              loading ||
              bulkOrderBlocked ||
              belowMinimumCheckoutAmount ||
              (requiresAllergenAcknowledgement && !allergenAcknowledged)
            }
          >
            {loading ? "Redirecting..." : "Continue to payment"}
          </button>
        </section>

        <aside className={styles.summaryCard}>
          <h2>Order summary</h2>

          <ul className={styles.summaryList}>
            {checkoutItems.map((item) => {
              const pricing = getCartLinePricing(item, { canUseBulkOrders: canCreateBulk });

              return (
                <li key={item.productId} className={styles.summaryRow}>
                  <span>
                    {item.name} × {item.qty}
                    {pricing.discountAmount > 0 && (
                      <span className={styles.bulkItemTag}>Bulk</span>
                    )}
                  </span>
                  <span>
                    {formatCurrency(pricing.lineTotal)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <div className={`${styles.totalRow} ${bulkDiscount > 0 ? styles.discountRow : ""}`}>
            <span>Discount</span>
            <span>{bulkDiscount > 0 ? `-${formatCurrency(bulkDiscount)}` : formatCurrency(0)}</span>
          </div>

          <div className={styles.totalRow}>
            <span>Delivery</span>
            <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : "Free"}</span>
          </div>

          <div className={`${styles.totalRow} ${styles.summaryTotal}`}>
            <span>Subtotal</span>
            <strong>{formatCurrency(checkoutTotal)}</strong>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showRecurring && (
          <RecurringOrderModal
            items={checkoutItems}
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
