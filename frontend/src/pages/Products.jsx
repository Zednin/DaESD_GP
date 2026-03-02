import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import QuickAddModal from "../components/QuickAddModal/QuickAddModal";
import FilterPanel from "../components/FilterPanel/FilterPanel";
import styles from "./Products.module.css";
import { addToCart, getCartSubtotal, readCart } from "../utils/cartStorage";



export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // --- Filter / sort state ---
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProducer, setSelectedProducer] = useState("");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState("name");

  const [cartSubtotal, setCartSubtotal] = useState(() => getCartSubtotal(readCart()));

  useEffect(() => {
    function syncSubtotal() {
      setCartSubtotal(getCartSubtotal(readCart()));
    }
    window.addEventListener("cart:updated", syncSubtotal);
    return () => window.removeEventListener("cart:updated", syncSubtotal);
  }, []);

  // One-time fetch of all products to populate filter options
  useEffect(() => {
    fetch("/api/products/?ordering=name")
      .then((r) => r.json())
      .then((data) => {
        const catNames = [...new Set(data.map((p) => p.category_name).filter(Boolean))].sort();
        const prodNames = [...new Set(data.map((p) => p.producer_name).filter(Boolean))].sort();
        setCategories(catNames);
        setProducers(prodNames);
      });
  }, []);

  // Re-fetch from backend whenever filters or sort change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category__name", selectedCategory);
    if (selectedProducer) params.set("producer__company_name", selectedProducer);
    if (organicOnly) params.set("organic_certified", "true");
    if (search.trim()) params.set("search", search.trim());
    params.set("ordering", sortBy);
    fetch(`/api/products/?${params}`)
      .then((r) => r.json())
      .then(setProducts);
  }, [selectedCategory, selectedProducer, organicOnly, search, sortBy]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedProducer ? 1 : 0) +
    (organicOnly ? 1 : 0) +
    (sortBy !== "name" ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setSelectedCategory("");
    setSelectedProducer("");
    setOrganicOnly(false);
    setSortBy("name");
  }

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

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l4.26 4.26a.75.75 0 11-1.06 1.06l-4.26-4.26A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FilterPanel — category, producer & sort in one expandable panel */}
        <FilterPanel
          categories={categories}
          producers={producers}
          selectedCategory={selectedCategory}
          selectedProducer={selectedProducer}
          organicOnly={organicOnly}
          sortBy={sortBy}
          onCategoryChange={setSelectedCategory}
          onProducerChange={setSelectedProducer}
          onOrganicChange={setOrganicOnly}
          onSortChange={setSortBy}
          onClear={clearFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* ── Results count ── */}
      <p className={styles.resultCount}>
        {products.length}{" "}
        {products.length === 1 ? "product" : "products"} found
      </p>

      {/* ── Product grid ── */}
      <section className={styles.grid}>
        {products.length === 0 && (
          <p className={styles.emptyMsg}>
            No products match your filters.&nbsp;
            <button type="button" className={styles.clearLink} onClick={clearFilters}>
              Clear all filters
            </button>
          </p>
        )}

        {products.map((product) => (
          <div key={product.id} className={styles.card}>
            <div className={styles.imagePlaceholder}>
              {product.organic_certified && (
                <span className={styles.organicBadge}>🌿 Organic</span>
              )}
            </div>

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