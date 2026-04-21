import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuPencil,
  LuRefreshCw,
  LuStar,
  LuTrash2,
} from "react-icons/lu";
import {
  deleteReview,
  getMyReviews,
  getReview,
  updateReview,
} from "../../utils/reviewsApi";
import styles from "./Reviews.module.css";

function formatDate(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function RatingStars({ rating, size = 18 }) {
  return (
    <div className={styles.ratingStars} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rating;
        return (
          <LuStar
            key={n}
            size={size}
            className={filled ? styles.starFilled : styles.starEmpty}
            fill={filled ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        );
      })}
    </div>
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
              size={24}
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

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <h3>No reviews yet</h3>
      <p>
        Once you review delivered purchases, they’ll appear here and you’ll be
        able to edit them later.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorIconWrap}>
        <LuCircleAlert size={22} />
      </div>
      <h3>We couldn’t load your reviews</h3>
      <p>{message}</p>
      <button type="button" className={styles.retryBtn} onClick={onRetry}>
        <LuRefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

function ReviewEditor({
  review,
  submitting,
  onSubmit,
  onDelete,
}) {
  const [form, setForm] = useState({
    rating: review.rating || 5,
    review_title: review.review_title || "",
    review_text: review.review_text || "",
    is_anonymous: Boolean(review.is_anonymous),
  });

  useEffect(() => {
    setForm({
      rating: review.rating || 5,
      review_title: review.review_title || "",
      review_text: review.review_text || "",
      is_anonymous: Boolean(review.is_anonymous),
    });
  }, [review]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <motion.div
      className={styles.editorShell}
      initial={{ height: 0, opacity: 0, y: -6 }}
      animate={{ height: "auto", opacity: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className={styles.editorInner}>
        <div className={styles.editorHeader}>
          <div>
            <p className={styles.editorEyebrow}>Edit review</p>
            <h4 className={styles.editorTitle}>{review.product_name || "Product"}</h4>
            <div className={styles.editorMeta}>
              {review.verified_purchase && (
                <span className={styles.metaChip}>Verified purchase</span>
              )}
              <span className={styles.metaChip}>Created {formatDate(review.created_at)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.editorForm}>
          <div className={styles.ratingBlock}>
            <div>
              <span className={styles.sectionLabel}>Your rating</span>
              <p className={styles.sectionHint}>
                You can fine-tune this later if your view changes.
              </p>
            </div>

            <InteractiveStarRating
              value={form.rating}
              onChange={(rating) => setForm((prev) => ({ ...prev, rating }))}
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

          <label className={styles.field}>
            <span>Review title</span>
            <input
              className={styles.input}
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

          <label className={styles.field}>
            <span>Your review</span>
            <textarea
              className={styles.textarea}
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
            <small className={styles.fieldHint}>
              Aim for something that would actually help the next buyer.
            </small>
          </label>

          <label className={styles.toggleRow}>
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

          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => onDelete(review.id)}
            >
              <LuTrash2 size={14} />
              Delete review
            </button>

            <div className={styles.editorActionsRight}>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [expandedReview, setExpandedReview] = useState(null);
  const [loadingExpandedReview, setLoadingExpandedReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadReviews() {
    try {
      setLoading(true);
      setError("");
      const data = await getMyReviews();
      setReviews(data);
    } catch (err) {
      setError("Failed to load your reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleToggleEdit(reviewId) {
    if (expandedReviewId === reviewId) {
      setExpandedReviewId(null);
      setExpandedReview(null);
      return;
    }

    try {
      setExpandedReviewId(reviewId);
      setLoadingExpandedReview(true);
      const review = await getReview(reviewId);
      setExpandedReview(review);
    } catch (err) {
      alert("Failed to load review.");
      setExpandedReviewId(null);
      setExpandedReview(null);
    } finally {
      setLoadingExpandedReview(false);
    }
  }

  async function handleSubmit(formValues) {
    if (!expandedReview?.id) return;

    try {
      setSubmitting(true);
      await updateReview(expandedReview.id, {
        product_id: expandedReview.product_id,
        rating: formValues.rating,
        review_title: formValues.review_title,
        review_text: formValues.review_text,
        is_anonymous: formValues.is_anonymous,
      });

      // Refresh the list so the summary card reflects the update straight away
      await loadReviews();
      const refreshed = await getReview(expandedReview.id);
      setExpandedReview(refreshed);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Failed to update review.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewId) {
    const confirmed = window.confirm("Delete this review?");
    if (!confirmed) return;

    try {
      await deleteReview(reviewId);
      if (expandedReviewId === reviewId) {
        setExpandedReviewId(null);
        setExpandedReview(null);
      }
      await loadReviews();
    } catch (err) {
      alert("Failed to delete review.");
    }
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h2 className={styles.title}>My reviews</h2>
          <p className={styles.subtitle}>
            Manage your product feedback, update ratings, and keep your reviews
            helpful for other customers.
          </p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading reviews...</div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadReviews} />
      ) : reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((review) => {
            const isExpanded = expandedReviewId === review.id;
            const liveReview =
              isExpanded && expandedReview ? expandedReview : review;

            return (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewTop}>
                  <div>
                    <p className={styles.reviewProductName}>
                      {liveReview.product_name || "Product"}
                    </p>
                    <h3>{liveReview.review_title}</h3>
                    <RatingStars rating={liveReview.rating} />
                  </div>

                  <span className={styles.reviewDate}>
                    {formatDate(liveReview.created_at)}
                  </span>
                </div>

                <p className={styles.reviewText}>{liveReview.review_text}</p>

                <div className={styles.reviewMeta}>
                  {liveReview.verified_purchase && (
                    <span className={styles.verifiedBadge}>Verified purchase</span>
                  )}
                  {liveReview.updated && (
                    <span className={styles.editedBadge}>Edited</span>
                  )}
                  {liveReview.is_anonymous && (
                    <span className={styles.editedBadge}>Anonymous</span>
                  )}
                </div>

                {liveReview.producer_response && (
                  <div className={styles.responseBox}>
                    <strong>Producer response</strong>
                    <p>{liveReview.producer_response}</p>
                  </div>
                )}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => handleToggleEdit(review.id)}
                  >
                    <LuPencil size={14} />
                    {isExpanded ? "Close editor" : "Edit review"}
                    {isExpanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                  </button>

                  {!isExpanded && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(review.id)}
                    >
                      <LuTrash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    loadingExpandedReview ? (
                      <motion.div
                        className={styles.inlineLoading}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        Loading review editor...
                      </motion.div>
                    ) : expandedReview ? (
                      <ReviewEditor
                        review={expandedReview}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        onDelete={handleDelete}
                      />
                    ) : null
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}