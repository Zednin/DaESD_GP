import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LuLeaf, LuMapPinned, LuCalendarDays, LuShieldAlert, LuStar } from "react-icons/lu";
import apiClient from "../utils/apiClient";
import { addToCart } from "../utils/cartStorage";
import styles from "./ProductDetail.module.css";
import ProductHero from "../components/ProductDetail/ProductHero";
import ProductFoodMiles from "../components/ProductDetail/ProductFoodMiles";

const MOCK_REVIEWS = [
  {
    id: 1,
    rating: 5,
    title: "Excellent quality and flavour",
    body: "These were incredibly fresh and full of flavour. Perfect for salads and roasting.",
    author: "Josh O.",
    anonymous: false,
    verifiedPurchase: true,
    createdAt: "2026-03-18",
  },
  {
    id: 2,
    rating: 4,
    title: "Really fresh",
    body: "Delivered in great condition and lasted well. Would buy again.",
    author: "Anonymous",
    anonymous: true,
    verifiedPurchase: true,
    createdAt: "2026-03-12",
  },
  {
    id: 3,
    rating: 5,
    title: "Lovely local produce",
    body: "Exactly the sort of thing I want from BRFN. Fresh, local, and clearly better than supermarket alternatives.",
    author: "Amelia R.",
    anonymous: false,
    verifiedPurchase: true,
    createdAt: "2026-03-05",
  },
];


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

export default function ProductDetail() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [foodMilesData, setFoodMilesData] = useState(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        const { data } = await apiClient.get(`/products/${productId}/`);
        setProduct(data);
      } catch (err) {
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  useEffect(() => {
    async function loadFoodMiles() {
      if (!productId) return;

      try {
        const { data } = await apiClient.get(`/food-miles/products/${productId}/`);
        setFoodMilesData(data);
      } catch (err) {
        setFoodMilesData(null);
      }
    }

    loadFoodMiles();
  }, [productId]);

  const reviewSummary = useMemo(() => {
    const total = MOCK_REVIEWS.length;
    const average = total
      ? MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

    const distribution = [5, 4, 3, 2, 1].map((score) => ({
      score,
      count: MOCK_REVIEWS.filter((r) => r.rating === score).length,
    }));

    return { total, average, distribution };
  }, []);

  async function handleAddToBasket() {
    if (!product) return;
    await addToCart(product, qty);
  }

  if (loading) {
    return <main className={`container ${styles.page}`}><p>Loading product…</p></main>;
  }

  if (error || !product) {
    return <main className={`container ${styles.page}`}><p>{error || "Product not found."}</p></main>;
  }

  return (
    <main className={`container ${styles.page}`}>
        <ProductHero
        product={product}
        reviewAverage={reviewSummary.average}
        reviewCount={reviewSummary.total}
        foodMiles={foodMilesData}
        onAddToBasket={async (product, qty) => {
            const cartProduct = product.surplus_active
            ? {
                ...product,
                original_price: product.price,
                price: product.surplus_price,
                }
            : product;

            await addToCart(cartProduct, qty);
        }}
        />

      <ProductFoodMiles product={product} />

      <section className={styles.storySection}>
        <h2>About this product</h2>
        <div className={styles.storyCard}>
          <p>
            This product page is designed to surface the details that matter in local food systems:
            provenance, availability, sustainability, and transparency around what you are buying.
          </p>
          <p>
            In the final version, this section can also link through to seasonal recipes, storage guidance,
            and producer stories.
          </p>
        </div>
      </section>

      <section className={styles.reviewsSection}>
        <div className={styles.sectionHeader}>
          <h2>Reviews</h2>
          <p className={styles.reviewNote}>
            Reviews are submitted from delivered orders in order history.
          </p>
        </div>

        <div className={styles.reviewSummaryGrid}>
          <div className={styles.reviewScoreCard}>
            <div className={styles.averageScore}>{reviewSummary.average.toFixed(1)}</div>
            <RatingStars rating={Math.round(reviewSummary.average)} size={18} />
            <span>{reviewSummary.total} reviews</span>
          </div>

          <div className={styles.reviewDistributionCard}>
            {reviewSummary.distribution.map((row) => {
              const percentage = reviewSummary.total
                ? (row.count / reviewSummary.total) * 100
                : 0;

              return (
                <div key={row.score} className={styles.distRow}>
                  <span>{row.score}★</span>
                  <div className={styles.distBar}>
                    <div className={styles.distFill} style={{ width: `${percentage}%` }} />
                  </div>
                  <strong>{row.count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.reviewCards}>
          {MOCK_REVIEWS.map((review) => (
            <article key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewTop}>
                <div>
                  <h3>{review.title}</h3>
                  <RatingStars rating={review.rating} />
                </div>
                <span className={styles.reviewDate}>{review.createdAt}</span>
              </div>

              <p className={styles.reviewBody}>{review.body}</p>

              <div className={styles.reviewMeta}>
                <span>{review.anonymous ? "Anonymous" : review.author}</span>
                {review.verifiedPurchase && (
                  <span className={styles.verifiedBadge}>Verified purchase</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}