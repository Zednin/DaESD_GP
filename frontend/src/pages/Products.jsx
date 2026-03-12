import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { AnimatePresence, motion } from "framer-motion";
import QuickAddModal from "../components/QuickAddModal/QuickAddModal";
import FilterPanel from "../components/FilterPanel/FilterPanel";
import styles from "./Products.module.css";
import { addToCart, getCartSubtotal, readCart } from "../utils/cartStorage";
import { useAuth } from "../auth/AuthContext";

// Hardcoded recommendations — replace with API call later
const HARDCODED_RECOMMENDATIONS = [
  { id: 901, name: "Organic Carrots", price: "2.50", unit: "kg", organic_certified: true, category_name: "Vegetables", producer_name: "Green Acres" },
  { id: 902, name: "Free Range Eggs", price: "3.80", unit: "dozen", organic_certified: false, category_name: "Dairy & Eggs", producer_name: "Sunrise Farm" },
  { id: 903, name: "Sourdough Loaf", price: "4.20", unit: "loaf", organic_certified: false, category_name: "Bakery", producer_name: "Village Bakery" },
  { id: 904, name: "Raw Honey", price: "6.50", unit: "jar", organic_certified: true, category_name: "Pantry", producer_name: "Meadow Apiaries" },
  { id: 905, name: "Fresh Strawberries", price: "3.00", unit: "punnet", organic_certified: true, category_name: "Fruit", producer_name: "Berry Fields" },
];

export default function Products() {
  const { user } = useAuth();
  const [rawProducts, setRawProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // --- Recommendations state ---
  const [recsOpen, setRecsOpen] = useState(true);
  const isCustomer = !user || user.account_type === "customer";

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

  // Re-fetch from backend whenever server-side filters or sort change
  // (search handled client-side by Fuse.js)
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category__name", selectedCategory);
    if (selectedProducer) params.set("producer__company_name", selectedProducer);
    if (organicOnly) params.set("organic_certified", "true");
    params.set("ordering", sortBy);
    fetch(`/api/products/?${params}`)
      .then((r) => r.json())
      .then(setRawProducts);
  }, [selectedCategory, selectedProducer, organicOnly, sortBy]);

  // Fuzzy-match the search term over the backend-filtered results
  const products = useMemo(() => {
    const term = search.trim();
    if (!term) return rawProducts;
    const fuse = new Fuse(rawProducts, {
      keys: ["name", "description"],
      threshold: 0.4,
    });
    return fuse.search(term).map((r) => r.item);
  }, [search, rawProducts]);

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
  async function handleAddToBasket(product, qty) {
    await addToCart(product, qty);
    setQuickAddOpen(false);
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>Products</h1>
        <p>Browse our selection of locally sourced goods.</p>
      </header>

      {/* ── AI Recommendations (customers only) ── */}
      {isCustomer && HARDCODED_RECOMMENDATIONS.length > 0 && (
        <section className={styles.recsSection}>
          <button
            type="button"
            className={styles.recsToggle}
            onClick={() => setRecsOpen((o) => !o)}
          >
            <span>
              Recommended for You
              <span className={styles.recsSubtext}>Based on your recent orders, we have curated a selection just for you.</span>
            </span>
            <svg
              className={`${styles.recsArrow} ${recsOpen ? styles.recsArrowOpen : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <AnimatePresence initial={false}>
            {recsOpen && (
              <motion.div
                key="recs-grid"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className={styles.recsGrid}>
                  {HARDCODED_RECOMMENDATIONS.map((product) => (
                    <div key={product.id} className={styles.recCard}>
                      <div className={styles.recImagePlaceholder}>
                        {product.organic_certified && (
                          <span className={styles.recOrganicBadge}>🌿</span>
                        )}
                      </div>
                      <div className={styles.recCardBody}>
                        <h4 className={styles.recName}>{product.name}</h4>
                        <span className={styles.recPrice}>
                          £{Number(product.price).toFixed(2)} / {product.unit}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.recQuickAddBtn}
                        onClick={() => openQuickAdd(product)}
                      >
                        Quick add
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

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