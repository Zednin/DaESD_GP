import { useEffect, useMemo, useState } from "react";
import {
  LuCalendarDays,
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuClock3,
  LuPackage,
  LuRefreshCw,
  LuShoppingBag,
  LuStar,
  LuTruck,
  LuX,
} from "react-icons/lu";
import apiClient from "../../utils/apiClient";
import {
  createReview,
  updateReview,
  deleteReview,
  getReview,
} from "../../utils/reviewsApi";
import { addToCart } from "../../utils/cartStorage";
import styles from "./OrderHistory.module.css";
import { AnimatePresence, motion } from "framer-motion";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Unknown date";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normaliseOrdersResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getStatusTone(status = "") {
  const s = status.toLowerCase();

  if (["paid", "confirmed", "accepted"].includes(s)) return "confirmed";
  if (["pending", "processing"].includes(s)) return "pending";
  if (["dispatched", "shipped", "out_for_delivery", "out for delivery"].includes(s)) return "dispatched";
  if (["delivered", "complete", "completed"].includes(s)) return "delivered";
  if (["cancelled", "canceled", "failed", "refunded"].includes(s)) return "cancelled";

  return "neutral";
}

function getStatusLabel(status = "") {
  if (!status) return "Unknown";
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildOrderItems(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }

  if (Array.isArray(order.order_items) && order.order_items.length > 0) {
    return order.order_items;
  }

  if (Array.isArray(order.producer_orders)) {
    return order.producer_orders.flatMap((producerOrder) =>
      Array.isArray(producerOrder.items)
        ? producerOrder.items.map((item) => ({
            ...item,
            producer_name:
              producerOrder.producer_name ||
              producerOrder.producer?.company_name ||
              item.producer_name ||
              "",
            producer_order_status: producerOrder.status,
            delivery_date: producerOrder.delivery_date,
          }))
        : []
    );
  }

  return [];
}

function buildProducerFulfilmentGroups(order, items) {
  if (Array.isArray(order.producer_orders) && order.producer_orders.length > 0) {
    return order.producer_orders.map((producerOrder) => {
      const groupItems = Array.isArray(producerOrder.items)
        ? producerOrder.items.map((item) => ({
            ...item,
            producer_name:
              producerOrder.producer_name ||
              producerOrder.producer?.company_name ||
              item.producer_name ||
              "Producer",
            producer_order_status: producerOrder.status,
            delivery_date: producerOrder.delivery_date,
          }))
        : [];

      return {
        id: producerOrder.id,
        producerName:
          producerOrder.producer_name ||
          producerOrder.producer?.company_name ||
          "Producer",
        status: producerOrder.status,
        deliveryDate: producerOrder.delivery_date,
        items: groupItems,
      };
    });
  }

  return [
    {
      id: "items",
      producerName: "Items",
      status: order.status,
      deliveryDate: getDeliveryDate(order),
      items,
    },
  ];
}

function getFulfilmentSummary(groups) {
  if (!groups.length) return "No producer fulfilment details";

  const counts = groups.reduce((acc, group) => {
    const label = getStatusLabel(group.status || "pending").toLowerCase();
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const statusText = Object.entries(counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(" · ");

  return `${groups.length} producer${groups.length === 1 ? "" : "s"} · ${statusText}`;
}

function getDisplayOrderStatus(order) {
  const producerOrders = Array.isArray(order.producer_orders) ? order.producer_orders : [];

  if (!producerOrders.length) {
    return order.status;
  }

  const statuses = producerOrders.map((po) => (po.status || "").toLowerCase());

  if (statuses.every((status) => status === "delivered")) {
    return "delivered";
  }

  if (statuses.some((status) => status === "preparing" || status === "ready")) {
    return "processing";
  }

  if (statuses.some((status) => status === "accepted")) {
    return "confirmed";
  }

  if (statuses.every((status) => status === "cancelled")) {
    return "cancelled";
  }

  if (statuses.some((status) => status === "pending")) {
    return "pending";
  }

  return order.status;
}

function getOrderPlacedDate(order) {
  return order.created_at || order.createdAt || order.date_created || null;
}

function getOrderTotal(order) {
  return order.total_amount ?? order.total ?? order.order_total ?? 0;
}

function getDeliveryDate(order) {
  return order.delivery_date || order.estimated_delivery || null;
}

function getOrderItemName(item) {
  return item.product_name || item.name || item.product?.name || "Product";
}

function getOrderItemQuantity(item) {
  return item.quantity ?? item.qty ?? 1;
}

function getOrderItemTotal(item) {
  return item.line_total ?? item.total ?? item.subtotal ?? 0;
}

function getRatingLabel(rating) {
  switch (rating) {
    case 1:
      return "Very poor";
    case 2:
      return "Poor";
    case 3:
      return "Okay";
    case 4:
      return "Good";
    case 5:
      return "Excellent";
    default:
      return "";
  }
}

function getOrderItemProductId(item) {
  return item.product_id || item.product || item.product?.id || item.id;
}

function getOrderItemUnit(item) {
  return item.unit || item.product?.unit || "unit";
}

function getOrderItemPrice(item) {
  const quantity = Number(getOrderItemQuantity(item) || 1);
  const lineTotal = Number(getOrderItemTotal(item) || 0);

  return (
    item.price ||
    item.price_snapshot ||
    item.unit_price ||
    item.product?.price ||
    (quantity > 0 && lineTotal > 0 ? lineTotal / quantity : 0)
  );
}

function InteractiveStarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const activeValue = hovered ?? value;

  return (
    <div
      className={styles.starPicker}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= activeValue;

        return (
          <motion.button
            key={star}
            type="button"
            className={styles.starPickerBtn}
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
          >
            <LuStar
              size={26}
              className={active ? styles.starPickerFilled : styles.starPickerEmpty}
              fill={active ? "currentColor" : "none"}
              strokeWidth={1.9}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = getStatusTone(status);

  return (
    <span className={`${styles.statusBadge} ${styles[`statusBadge--${tone}`]}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function OrderSkeleton() {
  return (
    <div className={styles.skeletonList}>
      {[1, 2, 3].map((n) => (
        <div key={n} className={styles.skeletonCard}>
          <div className={styles.skeletonLineLg} />
          <div className={styles.skeletonLineMd} />
          <div className={styles.skeletonLineSm} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIconWrap}>
        <LuShoppingBag size={28} />
      </div>
      <h3>No orders yet</h3>
      <p>
        Once you place your first order, it will appear here with item details,
        totals, and delivery progress.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorIconWrap}>
        <LuCircleAlert size={24} />
      </div>
      <h3>We couldn’t load your orders</h3>
      <p>{message}</p>
      <button type="button" className={styles.retryBtn} onClick={onRetry}>
        <LuRefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}

function ReviewModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  item,
  existingReview,
  loadingExisting,
  submitting,
}) {
  const [form, setForm] = useState({
    rating: 5,
    review_title: "",
    review_text: "",
    is_anonymous: false,
  });

  const isEditing = Boolean(existingReview?.id);

  useEffect(() => {
    if (!open) return;

    if (existingReview) {
      setForm({
        rating: existingReview.rating || 5,
        review_title: existingReview.review_title || "",
        review_text: existingReview.review_text || "",
        is_anonymous: Boolean(existingReview.is_anonymous),
      });
    } else {
      setForm({
        rating: 5,
        review_title: "",
        review_text: "",
        is_anonymous: false,
      });
    }
  }, [open, existingReview]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          className={styles.reviewModalBackdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.reviewComposer}
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className={styles.reviewComposerHeader}>
              <div>
                <p className={styles.reviewComposerEyebrow}>
                  {isEditing ? "Edit review" : "Leave a review"}
                </p>
                <h3 className={styles.reviewComposerTitle}>{getOrderItemName(item)}</h3>
                <div className={styles.reviewComposerMeta}>
                  {item.producer_name && (
                    <span className={styles.reviewMetaChip}>{item.producer_name}</span>
                  )}
                  <span className={styles.reviewMetaChip}>Delivered purchase</span>
                </div>
              </div>

              <button
                type="button"
                className={styles.reviewModalClose}
                onClick={onClose}
                aria-label="Close"
              >
                <LuX size={18} />
              </button>
            </div>

            {loadingExisting ? (
              <div className={styles.reviewComposerLoading}>Loading review...</div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.reviewComposerForm}>
                <div className={styles.reviewComposerScroll}>
                  <div className={styles.reviewRatingBlock}>
                    <div>
                      <span className={styles.reviewSectionLabel}>Your rating</span>
                      <p className={styles.reviewSectionHint}>
                        Share how this product was for you.
                      </p>
                    </div>

                    <InteractiveStarRating
                      value={form.rating}
                      onChange={(rating) =>
                        setForm((prev) => ({ ...prev, rating }))
                      }
                    />

                    <motion.div
                      key={form.rating}
                      className={styles.ratingFeedback}
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18 }}
                    >
                      {getRatingLabel(form.rating)}
                    </motion.div>
                  </div>

                  <label className={styles.reviewField}>
                    <span>Review title</span>
                    <input
                      className={styles.reviewInput}
                      value={form.review_title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          review_title: e.target.value,
                        }))
                      }
                      maxLength={255}
                      placeholder="Summarise your experience"
                      required
                    />
                  </label>

                  <label className={styles.reviewField}>
                    <span>Your review</span>
                    <textarea
                      className={styles.reviewTextarea}
                      rows={5}
                      value={form.review_text}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          review_text: e.target.value,
                        }))
                      }
                      placeholder="What stood out? Freshness, flavour, quality, packaging, value..."
                      required
                    />
                    <small className={styles.reviewFieldHint}>
                      Reviews help other customers make better choices.
                    </small>
                  </label>

                  <label className={styles.reviewToggleRow}>
                    <div>
                      <strong>Post anonymously</strong>
                      <p>Your review will appear without your name.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.is_anonymous}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          is_anonymous: e.target.checked,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className={styles.reviewComposerActions}>
                  {isEditing ? (
                    <button
                      type="button"
                      className={styles.reviewDangerBtn}
                      onClick={() => onDelete(existingReview.id)}
                    >
                      Delete review
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className={styles.reviewComposerActionsRight}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryReviewBtn}
                      disabled={submitting}
                    >
                      {submitting
                        ? "Saving..."
                        : isEditing
                        ? "Save changes"
                        : "Submit review"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ItemReviewAction({ item, onOpenReview }) {
  const reviewStatus = item.review_status;

  if (!reviewStatus) return null;

  if (!reviewStatus.can_review) {
    return (
      <span className={styles.itemReviewMuted}>
        {reviewStatus.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={styles.itemReviewBtn}
      onClick={() => onOpenReview(item)}
    >
      <LuStar size={14} />
      {reviewStatus.label}
    </button>
  );
}

function OrderCard({ order, onOpenReview, onReorder, reorderState }) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => buildOrderItems(order), [order]);
  const producerGroups = useMemo(
    () => buildProducerFulfilmentGroups(order, items),
    [order, items]
  );
  const total = getOrderTotal(order);
  const placedDate = getOrderPlacedDate(order);
  const deliveryDate = getDeliveryDate(order);
  const itemCount = items.reduce((sum, item) => sum + Number(getOrderItemQuantity(item)), 0);
  const fulfilmentSummary = getFulfilmentSummary(producerGroups);

  return (
    <article className={styles.orderCard}>
      <div className={styles.orderTop}>
        <div className={styles.orderIdentity}>
          <div className={styles.orderRefRow}>
            <h3>Order #{order.id}</h3>
            <StatusBadge status={getDisplayOrderStatus(order)} />
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaChip}>
              <LuCalendarDays size={14} />
              Placed {formatDate(placedDate)}
            </span>

            <span className={styles.metaChip}>
              <LuPackage size={14} />
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>

            <span className={styles.metaChip}>
              <LuTruck size={14} />
              {fulfilmentSummary}
            </span>

            {deliveryDate && (
              <span className={styles.metaChip}>
                <LuTruck size={14} />
                Delivery {formatDate(deliveryDate)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.orderSummary}>
          <span className={styles.summaryLabel}>Total</span>
          <strong className={styles.orderTotal}>{formatCurrency(total)}</strong>
        </div>
      </div>

      <div className={styles.previewRow}>
        {items.slice(0, 3).map((item, index) => (
          <div key={`${order.id}-${index}-${getOrderItemName(item)}`} className={styles.previewPill}>
            {getOrderItemName(item)}
          </div>
        ))}
        {items.length > 3 && (
          <div className={styles.previewPillMuted}>+{items.length - 3} more</div>
        )}
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <>
              <LuChevronUp size={16} />
              Hide details
            </>
          ) : (
            <>
              <LuChevronDown size={16} />
              View details
            </>
          )}
        </button>

        <div className={styles.secondaryActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => onReorder(order)}
            disabled={reorderState?.loading}
          >
            <LuRefreshCw size={15} className={reorderState?.loading ? styles.spinIcon : ""} />
            {reorderState?.loading ? "Adding..." : "Reorder"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {reorderState?.message && (
          <motion.div
            className={`${styles.reorderNotice} ${
              reorderState.type === "error" ? styles.reorderNoticeError : ""
            }`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {reorderState.message}
          </motion.div>
        )}
      </AnimatePresence>

      {expanded && (
        <div className={styles.expandedPanel}>
          <div className={styles.itemsBlock}>
            <h4>Items in this order</h4>
            <p className={styles.fulfilmentIntro}>
              Track each producer's part of this order separately.
            </p>

            <div className={styles.itemsList}>
              {items.length === 0 ? (
                <p className={styles.noItemsText}>No item breakdown is available for this order yet.</p>
              ) : (
                producerGroups.map((group) => (
                  <section key={group.id} className={styles.producerFulfilment}>
                    <div className={styles.producerFulfilmentHeader}>
                      <div>
                        <span className={styles.detailLabel}>Producer</span>
                        <h5>{group.producerName}</h5>
                      </div>

                      <div className={styles.producerFulfilmentMeta}>
                        <StatusBadge status={group.status || "pending"} />
                        <span>
                          {group.deliveryDate
                            ? `Delivery ${formatDate(group.deliveryDate)}`
                            : "Delivery not provided"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.producerItemsList}>
                      {group.items.map((item, index) => (
                        <div
                          key={`${order.id}-${group.id}-item-${index}-${getOrderItemName(item)}`}
                          className={styles.itemRow}
                        >
                          <div className={styles.itemMain}>
                            <div className={styles.itemNameRow}>
                              <strong>{getOrderItemName(item)}</strong>
                            </div>

                            <span className={styles.itemMeta}>
                              Quantity: {getOrderItemQuantity(item)}
                            </span>

                            <div className={styles.itemReviewRow}>
                              <ItemReviewAction item={item} onOpenReview={onOpenReview} />
                            </div>
                          </div>

                          <div className={styles.itemPrice}>
                            {formatCurrency(getOrderItemTotal(item))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <span className={styles.detailLabel}>Order status</span>
              <strong>{getStatusLabel(getDisplayOrderStatus(order))}</strong>
            </div>

            <div className={styles.detailCard}>
              <span className={styles.detailLabel}>Placed on</span>
              <strong>{formatDate(placedDate)}</strong>
            </div>

            <div className={styles.detailCard}>
              <span className={styles.detailLabel}>Estimated delivery</span>
              <strong>{deliveryDate ? formatDate(deliveryDate) : "Not provided"}</strong>
            </div>

            <div className={styles.detailCard}>
              <span className={styles.detailLabel}>Order total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewItem, setReviewItem] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [loadingExistingReview, setLoadingExistingReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reorderStates, setReorderStates] = useState({});

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const { data } = await apiClient.get("/orders/");
      setOrders(normaliseOrdersResponse(data));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Something went wrong while loading your order history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleSubmitReview(formValues) {
    if (!reviewItem) return;

    try {
      setSubmittingReview(true);

      if (existingReview?.id) {
        await updateReview(existingReview.id, {
          product_id: reviewItem.product,
          rating: formValues.rating,
          review_title: formValues.review_title,
          review_text: formValues.review_text,
          is_anonymous: formValues.is_anonymous,
        });
      } else {
        await createReview({
          product_id: reviewItem.product,
          order_item_id: reviewItem.id,
          rating: formValues.rating,
          review_title: formValues.review_title,
          review_text: formValues.review_text,
          is_anonymous: formValues.is_anonymous,
        });
      }

      setReviewItem(null);
      setExistingReview(null);
      await loadOrders();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.product_id?.[0] ||
        "Failed to save review.";
      alert(message);
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleOpenReview(item) {
    setReviewItem(item);
    setExistingReview(null);

    if (item.review_status?.existing_review_id) {
      try {
        setLoadingExistingReview(true);
        const review = await getReview(item.review_status.existing_review_id);
        setExistingReview(review);
      } catch (err) {
        alert("Failed to load existing review.");
        setReviewItem(null);
      } finally {
        setLoadingExistingReview(false);
      }
    }
  }

  async function handleDeleteReview(reviewId) {
    const confirmed = window.confirm("Delete this review?");
    if (!confirmed) return;

    try {
      await deleteReview(reviewId);
      setReviewItem(null);
      setExistingReview(null);
      await loadOrders();
    } catch (err) {
      alert("Failed to delete review.");
    }
  }

async function handleReorder(order) {
  const items = buildOrderItems(order);

  setReorderStates((prev) => ({
    ...prev,
    [order.id]: { loading: true, message: "", type: "success" },
  }));

  try {
    if (!items.length) {
      throw new Error("No items are available to reorder.");
    }

    let addedCount = 0;

    for (const item of items) {
      const productId = getOrderItemProductId(item);
      if (!productId) continue;

      await addToCart(
        {
          id: productId,
          name: getOrderItemName(item),
          unit: getOrderItemUnit(item),
          price: getOrderItemPrice(item),
          image: item.image || item.product?.image || null,
          producer_id: item.producer_id || item.product?.producer_id || null,
          producer_name: item.producer_name || item.product?.producer_name || null,
        },
        Number(getOrderItemQuantity(item))
      );

      addedCount += Number(getOrderItemQuantity(item));
    }

    setReorderStates((prev) => ({
      ...prev,
      [order.id]: {
        loading: false,
        type: "success",
        message: `${addedCount} item${addedCount === 1 ? "" : "s"} added to basket.`,
      },
    }));

    setTimeout(() => {
      setReorderStates((prev) => ({
        ...prev,
        [order.id]: { loading: false, message: "", type: "success" },
      }));
    }, 3200);
  } catch (err) {
    setReorderStates((prev) => ({
      ...prev,
      [order.id]: {
        loading: false,
        type: "error",
        message: err.message || "Could not add this order to your basket.",
      },
    }));
  }
}

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h2 className={styles.title}>Order history</h2>
          <p className={styles.subtitle}>
            Review your previous purchases, check statuses, and revisit product details.
          </p>
        </div>
      </div>

      {loading ? (
        <OrderSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onOpenReview={handleOpenReview}
              onReorder={handleReorder}
              reorderState={reorderStates[order.id]}
            />
          ))}
        </div>
      )}

      <ReviewModal
        open={Boolean(reviewItem)}
        onClose={() => {
          setReviewItem(null);
          setExistingReview(null);
        }}
        onSubmit={handleSubmitReview}
        onDelete={handleDeleteReview}
        item={reviewItem}
        existingReview={existingReview}
        loadingExisting={loadingExistingReview}
        submitting={submittingReview}
      />
    </section>
  );
}
