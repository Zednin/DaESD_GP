import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { addToCart } from "../utils/cartStorage";
import styles from "./ProductDetail.module.css";
import ProductHero from "../components/ProductDetail/ProductHero";
import ProductFoodMiles from "../components/ProductDetail/ProductFoodMiles";
import ProductRecipes from "../components/ProductDetail/ProductRecipes";
import ProductReviews from "../components/ProductDetail/ProductReviews";
import { useAuth } from "../auth/AuthContext";

export default function ProductDetail() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [foodMilesData, setFoodMilesData] = useState(null);
  const [reviewSummary, setReviewSummary] = useState({
    average: 0,
    count: 0,
  });
  const { canUseBulkOrders } = useAuth();

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        const { data } = await apiClient.get(`/products/${productId}/`);
        setProduct(data);
      } catch {
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
      } catch {
        setFoodMilesData(null);
      }
    }

    loadFoodMiles();
  }, [productId]);

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
        reviewCount={reviewSummary.count}
        foodMiles={foodMilesData}
        canUseBulkOrders={canUseBulkOrders}
        onAddToBasket={async (product, qty) => {
          const cartProduct = product.surplus_active
            ? {
                ...product,
                original_price: product.price,
                price: product.surplus_price,
              }
            : product;

          await addToCart(cartProduct, qty, { canUseBulkOrders });
        }}
      />

      <ProductFoodMiles product={product} />

      <ProductRecipes productId={productId} />

      <ProductReviews
        productId={productId}
        onSummaryChange={({ average, count }) => {
          setReviewSummary({ average, count });
        }}
      />
    </main>
  );
}