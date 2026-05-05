import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuLeaf,
  LuMapPinned,
  LuCalendarDays,
  LuShieldAlert,
  LuStar,
  LuClock3,
  LuMinus,
  LuPlus,
  LuBadgeCheck,
  LuTruck,
} from "react-icons/lu";
import { motion } from "framer-motion";
import { getAllergenInfo, formatAllergenList } from "../../utils/allergenIcons";
import { getCartQtyForProduct, readCart } from "../../utils/cartStorage";
import styles from "./ProductHero.module.css";

function formatAvailability(product) {
  const months = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (product.availability_mode === "seasonal") {
    const start = months[product.season_start_month] || "?";
    const end = months[product.season_end_month] || "?";
    return `${start} – ${end}`;
  }

  return "Available year-round";
}

function formatHarvestDate(value) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFoodMilesText(foodMiles) {
  if (typeof foodMiles?.distance_miles !== "number") {
    return "Calculating route...";
  }

  return `${foodMiles.distance_miles.toFixed(1)} miles`;
}

function formatFoodMilesStatus(foodMiles) {
  if (typeof foodMiles?.distance_miles !== "number") {
    return "Route pending";
  }

  return foodMiles.within_local_radius ? "Local radius" : "Longer route";
}

function formatFoodMilesDetail(foodMiles) {
  if (typeof foodMiles?.distance_miles !== "number") {
    return "Calculating from producer to delivery postcode";
  }

  return foodMiles.within_local_radius
    ? `within BRFN ${foodMiles.local_radius_miles}-mile target`
    : `outside BRFN ${foodMiles.local_radius_miles}-mile target`;
}

function RatingStars({ rating = 0, size = 16 }) {
  return (
    <div className={styles.ratingStars} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <LuStar
          key={n}
          size={size}
          className={n <= Math.round(rating) ? styles.starFilled : styles.starEmpty}
        />
      ))}
    </div>
  );
}

export default function ProductHero({
  product,
  reviewAverage = 4.7,
  reviewCount = 3,
  foodMiles = null,
  onAddToBasket,
}) {
  const [qty, setQty] = useState(1);
  const [addStatus, setAddStatus] = useState("idle");
  const [addError, setAddError] = useState("");
  const [cartQty, setCartQty] = useState(() => getCartQtyForProduct(product?.id, readCart()));
  const resetTimerRef = useRef(null);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    return Number(product.surplus_active ? product.surplus_price : product.price);
  }, [product]);

  const originalPrice = useMemo(() => {
    if (!product?.surplus_active) return null;
    return Number(product.price);
  }, [product]);

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

  const total = useMemo(() => (currentPrice * qty).toFixed(2), [currentPrice, qty]);

  function handleQtyChange(next) {
    if (isUnavailable) {
      setQty(1);
      return;
    }

    setAddError("");
    setQty(Math.min(Math.max(1, next), stockLimit));
  }

  useEffect(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setAddStatus("idle");
    setAddError("");
  }, [product]);

  useEffect(() => {
    function syncCartQty() {
      setCartQty(getCartQtyForProduct(product?.id, readCart()));
    }

    syncCartQty();
    window.addEventListener("cart:updated", syncCartQty);
    return () => window.removeEventListener("cart:updated", syncCartQty);
  }, [product]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleAdd() {
    if (addDisabled || addStatus !== "idle") return;

    try {
      await onAddToBasket?.(product, qty);
      setAddStatus("added");
      setAddError("");
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => setAddStatus("idle"), 1400);
    } catch (err) {
      setAddStatus("idle");
      setAddError(err?.message || "This quantity could not be added to your basket.");
    }
  }

  return (
    <section className={styles.hero}>
      <div className={styles.bgOrbA} />
      <div className={styles.bgOrbB} />

      <motion.div
        className={styles.mediaColumn}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className={styles.mediaFrame}>
          <div className={styles.imageWrap}>
            {product.image ? (
              <img src={product.image} alt={product.name} className={styles.image} />
            ) : (
              <div className={styles.imageFallback}>No image available</div>
            )}

            <div className={styles.imageFade} />

            <div className={styles.imageTopBar}>
              <div className={styles.imageBadges}>
                {product.category_name && (
                  <span className={styles.categoryBadge}>{product.category_name}</span>
                )}
                {product.organic_certified && (
                  <span className={styles.organicBadge}>
                    <LuLeaf size={14} />
                    Organic
                  </span>
                )}
                {product.surplus_active && (
                  <span className={styles.discountBadge}>
                    -{product.discount_percentage}% off
                  </span>
                )}
              </div>
            </div>

            <div className={styles.imageBottomPanel}>
              <Link to={`/producers/${product.producer_id || product.producer_profile_id || product.producer}`} className={styles.originPill}>
                <LuMapPinned size={14} />
                From {product.producer_name}
              </Link>

              <div className={styles.heroMiniStat}>
                <span>{formatFoodMilesText(foodMiles)}</span>
                <small>{formatFoodMilesStatus(foodMiles)}</small>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className={styles.infoColumn}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
      >
        <div className={styles.infoShell}>
          <div className={styles.metaRow}>
            <Link to={`/producers/${product.producer_id || product.producer_profile_id || product.producer}`} className={styles.producerChip}>
              <LuBadgeCheck size={14} />
              {product.producer_name}
            </Link>

            <div className={styles.reviewChip}>
              <RatingStars rating={reviewAverage} size={14} />
              <span>
                {reviewAverage.toFixed(1)} · {reviewCount} review{reviewCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.priceRow}>
            {originalPrice !== null && (
              <span className={styles.originalPrice}>£{originalPrice.toFixed(2)}</span>
            )}
            <span className={styles.price}>£{currentPrice.toFixed(2)}</span>
            <span className={styles.unit}>/ {product.unit}</span>
          </div>

          <p className={styles.description}>
            {product.description ||
              "Fresh, locally sourced produce from the Bristol Regional Food Network."}
          </p>

          <div className={styles.featureStrip}>
            <div className={styles.featureItem}>
              <LuClock3 size={18} />
              <div>
                <strong>Availability</strong>
                <span>{formatAvailability(product)}</span>
              </div>
            </div>

            <div className={styles.featureItem}>
              <LuCalendarDays size={18} />
              <div>
                <strong>Harvest date</strong>
                <span>{formatHarvestDate(product.harvest_date)}</span>
              </div>
            </div>

            <div className={styles.featureItem}>
              <LuTruck size={18} />
              <div>
                <strong>Food miles</strong>
                <span>{formatFoodMilesDetail(foodMiles)}</span>
              </div>
            </div>
          </div>

          <div className={styles.allergenCard}>
            <div className={styles.allergenHeader}>
              <LuShieldAlert size={18} />
              <h2>Allergen information</h2>
            </div>

            {product.allergens?.length ? (
              <>
                <p className={styles.allergenContains}>
                  {formatAllergenList(product.allergens)}
                </p>

                <div className={styles.allergenTags}>
                  {product.allergens.map((a) => {
                    const { Icon, label } = getAllergenInfo(a.name);
                    return (
                      <span key={a.id} className={styles.allergenTag}>
                        <Icon size={14} />
                        {label}
                      </span>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className={styles.noAllergens}>No common allergens</p>
            )}
          </div>

          <div className={styles.buyPanel}>
            {isUnavailable && (
              <div className={styles.outOfStockBanner}>
                This product is currently out of stock
              </div>
            )}
            <div className={styles.qtyArea}>
              <label className={styles.qtyLabel}>
                Quantity
                {Number.isFinite(stockLimit) && stockLimit > 0 && (
                  <span> · {stockLimit} in stock</span>
                )}
              </label>

              <div className={styles.qtyControl}>
                <button
                  type="button"
                  onClick={() => handleQtyChange(qty - 1)}
                  disabled={isUnavailable || qty <= 1}
                >
                  <LuMinus size={15} />
                </button>

                <input
                  type="number"
                  min={1}
                  max={Number.isFinite(stockLimit) ? stockLimit : undefined}
                  disabled={isUnavailable}
                  value={qty}
                  onChange={(e) => handleQtyChange(Number(e.target.value) || 1)}
                />

                <button
                  type="button"
                  onClick={() => handleQtyChange(qty + 1)}
                  disabled={isUnavailable || qty >= stockLimit}
                >
                  <LuPlus size={15} />
                </button>
              </div>
            </div>

            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={addDisabled}
            >
              {isUnavailable && "Out of stock"}
              {!isUnavailable && addStatus === "added" && "Added ✓"}
              {!isUnavailable && addStatus === "idle" && `Add to basket — £${total}`}
            </button>
            {stockMessage && <p className={styles.stockMessage}>{stockMessage}</p>}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
