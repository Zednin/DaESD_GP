import { useEffect, useMemo, useState } from "react";
import { LuStar, LuX } from "react-icons/lu";
import { fetchMe } from "../../utils/auth";
import {
  createReview,
  deleteReview,
  getProductReviews,
  getProductReviewSummary,
  updateReview,
} from "../../utils/reviewsApi";
import styles from "../../pages/ProductDetail.module.css";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RatingStars({ rating, size = 16 }) {
  return (
    <div className={styles.ratingStars} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <LuStar
          key={n}
          size={size}
          className={n <= rating ? styles.starFilled : styles.starEmpty}
        />
      ))}
    </div>
  );
}

function ReviewModal({
  open,
  onClose,
  onSubmit,
  initialValues,
  submitting,
}) {
  const [form, setForm] = useState({
    rating: 5,
    review_title: "",
    review_text: "",
    is_anonymous: false,
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        rating: initialValues.rating,
        review_title: initialValues.review_title,
        review_text: initialValues.review_text,
        is_anonymous: initialValues.is_anonymous,
      });
    } else {
      setForm({
        rating: 5,
        review_title: "",
        review_text: "",
        is_anonymous: false,
      });
    }
  }, [initialValues]);

  if (!open) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <div className={styles.reviewModalBackdrop}>
      <div className={styles.reviewModal}>
        <div className={styles.reviewModalHeader}>
          <h3>{initialValues ? "Edit your review" : "Write a review"}</h3>
          <button
            type="button"
            className={styles.reviewModalClose}
            onClick={onClose}
            aria-label="Close review form"
          >
            <LuX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.reviewForm}>
          <label className={styles.reviewField}>
            <span>Rating</span>
            <select
              value={form.rating}
              onChange={(e) => handleChange("rating", Number(e.target.value))}
              className={styles.reviewInput}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.reviewField}>
            <span>Title</span>
            <input
              type="text"
              value={form.review_title}
              onChange={(e) => handleChange("review_title", e.target.value)}
              className={styles.reviewInput}
              maxLength={255}
              required
            />
          </label>

          <label className={styles.reviewField}>
            <span>Your review</span>
            <textarea
              value={form.review_text}
              onChange={(e) => handleChange("review_text", e.target.value)}
              className={styles.reviewTextarea}
              rows={6}
              required
            />
          </label>

          <label className={styles.reviewCheckbox}>
            <input
              type="checkbox"
              checked={form.is_anonymous}
              onChange={(e) => handleChange("is_anonymous", e.target.checked)}
            />
            <span>Post anonymously</span>
          </label>

          <div className={styles.reviewFormActions}>
            <button
              type="button"
              className={styles.compareBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.addBtn}
              disabled={submitting}
            >
              {submitting ? "Saving..." : initialValues ? "Save changes" : "Submit review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductReviews({ productId, onSummaryChange }) {
  const [summary, setSummary] = useState({
    average_rating: 0,
    review_count: 0,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    can_review: false,
    existing_review_id: null,
  });
  const [reviews, setReviews] = useState([]);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadData(selectedSort = sort) {
    try {
      setLoading(true);
      setError("");

      const [me, summaryData, reviewsData] = await Promise.all([
        fetchMe(),
        getProductReviewSummary(productId),
        getProductReviews(productId, { sort: selectedSort }),
      ]);

      setCurrentUser(me);
      setSummary(summaryData);
      setReviews(reviewsData);

      if (typeof onSummaryChange === "function") {
        onSummaryChange({
          average: summaryData.average_rating || 0,
          count: summaryData.review_count || 0,
        });
      }
    } catch (err) {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [productId]);

  useEffect(() => {
    loadData(sort);
  }, [sort]);

  const myReview = useMemo(() => {
    if (!currentUser) return null;
    return reviews.find((review) => review.customer_id === currentUser.id) || null;
  }, [reviews, currentUser]);

  async function handleCreateOrUpdate(formValues) {
    try {
      setSubmitting(true);

      if (editingReview) {
        await updateReview(editingReview.id, {
          product_id: productId,
          ...formValues,
        });
      } else {
        await createReview({
          product_id: productId,
          ...formValues,
        });
      }

      setModalOpen(false);
      setEditingReview(null);
      await loadData(sort);
    } catch (err) {
      alert(err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewId) {
    const confirmed = window.confirm("Delete this review?");
    if (!confirmed) return;

    try {
      await deleteReview(reviewId);
      await loadData(sort);
    } catch (err) {
      alert("Failed to delete review.");
    }
  }

  function openCreate() {
    setEditingReview(null);
    setModalOpen(true);
  }

  function openEdit(review) {
    setEditingReview(review);
    setModalOpen(true);
  }

  return (
    <section className={styles.reviewsSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Reviews</h2>
          <p className={styles.reviewNote}>
            Only verified purchasers can leave reviews after delivery.
          </p>
        </div>

        <div className={styles.reviewToolbar}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={styles.reviewSort}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>

          {myReview ? (
            <button type="button" className={styles.compareBtn} onClick={() => openEdit(myReview)}>
              Edit review
            </button>
          ) : summary.can_review ? (
            <button type="button" className={styles.addBtn} onClick={openCreate}>
              Write review
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.reviewSummaryGrid}>
        <div className={styles.reviewScoreCard}>
          <div className={styles.averageScore}>{Number(summary.average_rating || 0).toFixed(1)}</div>
          <RatingStars rating={Math.round(summary.average_rating || 0)} size={18} />
          <span>{summary.review_count} review{summary.review_count !== 1 ? "s" : ""}</span>
        </div>

        <div className={styles.reviewDistributionCard}>
          {[5, 4, 3, 2, 1].map((score) => {
            const count = summary.distribution?.[String(score)] || 0;
            const percentage = summary.review_count
              ? (count / summary.review_count) * 100
              : 0;

            return (
              <div key={score} className={styles.distRow}>
                <span>{score}★</span>
                <div className={styles.distBar}>
                  <div className={styles.distFill} style={{ width: `${percentage}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className={styles.reviewCards}>
          <article className={styles.reviewCard}>
            <p>Loading reviews...</p>
          </article>
        </div>
      ) : error ? (
        <div className={styles.reviewCards}>
          <article className={styles.reviewCard}>
            <p>{error}</p>
          </article>
        </div>
      ) : reviews.length === 0 ? (
        <div className={styles.reviewCards}>
          <article className={styles.reviewCard}>
            <p>No reviews yet. Once customers receive this product, their feedback will appear here.</p>
          </article>
        </div>
      ) : (
        <div className={styles.reviewCards}>
          {reviews.map((review) => {
            const isOwner = currentUser?.id === review.customer_id;

            return (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewTop}>
                  <div>
                    <h3>{review.review_title}</h3>
                    <RatingStars rating={review.rating} />
                  </div>
                  <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                </div>

                <p className={styles.reviewBody}>{review.review_text}</p>

                <div className={styles.reviewMeta}>
                  <span>{review.customer_display_name}</span>
                  {review.verified_purchase && (
                    <span className={styles.verifiedBadge}>Verified purchase</span>
                  )}
                  {review.updated && (
                    <span className={styles.reviewEdited}>Edited</span>
                  )}
                </div>

                {review.producer_response && (
                  <div className={styles.producerResponseBox}>
                    <strong>Producer response</strong>
                    <p>{review.producer_response}</p>
                  </div>
                )}

                {isOwner && (
                  <div className={styles.reviewOwnerActions}>
                    <button
                      type="button"
                      className={styles.compareBtn}
                      onClick={() => openEdit(review)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.reviewDeleteBtn}
                      onClick={() => handleDelete(review.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ReviewModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingReview(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialValues={editingReview}
        submitting={submitting}
      />
    </section>
  );
}