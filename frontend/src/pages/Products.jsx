import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import QuickAddModal from "../components/QuickAddModal/QuickAddModal";
import styles from "./Products.module.css";
import { addToCart, getCartSubtotal, readCart } from "../utils/cartStorage";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [cartSubtotal, setCartSubtotal] = useState(() => getCartSubtotal(readCart()));

  useEffect(() => {
    function syncSubtotal() {
      setCartSubtotal(getCartSubtotal(readCart()));
    }
    window.addEventListener("cart:updated", syncSubtotal);
    return () => window.removeEventListener("cart:updated", syncSubtotal);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      const res = await fetch("/api/products/");
      const data = await res.json();
      setProducts(data);
    }
    loadProducts();
  }, []);

  function openQuickAdd(product) {
    setSelectedProduct(product);
    setQuickAddOpen(true);
  }

  function closeQuickAdd() {
    setQuickAddOpen(false);
  }

  // later this becomes a POST to /api/cart-items/
  function handleAddToBasket(product, qty) {
    addToCart(product, qty);
    setQuickAddOpen(false);
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>Products</h1>
        <p>Browse our selection of locally sourced goods.</p>
      </header>

      <section className={styles.grid}>
        {products.map((product) => (
          <div key={product.id} className={styles.card}>
            <div className={styles.imagePlaceholder} />

            <div className={styles.cardBody}>
              <h3>{product.name}</h3>
              <span className={styles.price}>
                £{Number(product.price).toFixed(2)} / {product.unit}
              </span>
            </div>

            {/* Quick add button (appears on hover) */}
            <button
              type="button"
              className={styles.quickAddBtn}
              onClick={() => openQuickAdd(product)}
            >
              Quick add
            </button>
          </div>
        ))}
      </section>

      {/* Modal */}
      <AnimatePresence>
        {quickAddOpen && selectedProduct && (
          <QuickAddModal
            product={selectedProduct}
            onClose={closeQuickAdd}
            onAdd={handleAddToBasket}
            cartSubtotal={cartSubtotal}
            freeShippingThreshold={40}
          />
        )}
      </AnimatePresence>
    </main>
  );
}