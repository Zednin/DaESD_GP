import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { AnimatePresence } from "framer-motion";
import { FiGrid, FiList } from "react-icons/fi";
import QuickAddModal from "../components/QuickAddModal/QuickAddModal";
import FilterPanel from "../components/FilterPanel/FilterPanel";
import styles from "./Products.module.css";
import { addToCart, getCartSubtotal, readCart } from "../utils/cartStorage";



export default function Products() {
  const [rawProducts, setRawProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  // --- Filter / sort state ---
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProducer, setSelectedProducer] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState([]);
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
    fetch("/api/allergens/")
      .then((r) => r.json())
      .then((data) => setAllergens(data.results ?? data));
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
  // then filter by selected allergens (client-side)
  const products = useMemo(() => {
    let filtered = rawProducts;

    // Allergen filter: keep products FREE FROM all selected allergens
    if (selectedAllergens.length > 0) {
      filtered = filtered.filter((p) =>
        selectedAllergens.every((id) => !(p.allergens ?? []).includes(id))
      );
    }

    const term = search.trim();
    if (!term) return filtered;
    const fuse = new Fuse(filtered, {
      keys: ["name", "description"],
      threshold: 0.4,
    });
    return fuse.search(term).map((r) => r.item);
  }, [search, rawProducts, selectedAllergens]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedProducer ? 1 : 0) +
    (organicOnly ? 1 : 0) +
    (selectedAllergens.length > 0 ? 1 : 0) +
    (sortBy !== "name" ? 1 : 0);

  function handleAllergenToggle(id) {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory("");
    setSelectedProducer("");
    setSelectedAllergens([]);
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

        {/* FilterPanel — category, producer, allergens & sort in one expandable panel */}
        <FilterPanel
          categories={categories}
          producers={producers}
          allergens={allergens}
          selectedCategory={selectedCategory}
          selectedProducer={selectedProducer}
          selectedAllergens={selectedAllergens}
          organicOnly={organicOnly}
          sortBy={sortBy}
          onCategoryChange={setSelectedCategory}
          onProducerChange={setSelectedProducer}
          onAllergenToggle={handleAllergenToggle}
          onOrganicChange={setOrganicOnly}
          onSortChange={setSortBy}
          onClear={clearFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* View mode toggle */}
        <div className={styles.viewToggle}>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <FiGrid />
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* ── Results count ── */}
      <p className={styles.resultCount}>
        {products.length}{" "}
        {products.length === 1 ? "product" : "products"} found
      </p>

      {/* ── Product grid / list ── */}
      {products.length === 0 ? (
        <p className={styles.emptyMsg}>
          No products match your filters.&nbsp;
          <button type="button" className={styles.clearLink} onClick={clearFilters}>
            Clear all filters
          </button>
        </p>
      ) : viewMode === "grid" ? (
        <section className={styles.grid}>
          {products.map((product) => (
            <div key={product.id} className={styles.card}>
              <div className={styles.imagePlaceholder}>
                {product.image && (
                  <img src={product.image} alt={product.name} className={styles.cardImage} />
                )}
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
      ) : (
        <section className={styles.list}>
          {products.map((product) => (
            <div key={product.id} className={styles.listCard}>
              <div className={styles.listImagePlaceholder}>
                {product.image && (
                  <img src={product.image} alt={product.name} className={styles.listImage} />
                )}
              </div>
              <div className={styles.listBody}>
                <h3>{product.name}</h3>
                <span className={styles.listMeta}>
                  {product.producer_name}{product.category_name ? ` · ${product.category_name}` : ""}
                  {product.organic_certified ? " · 🌿 Organic" : ""}
                </span>
              </div>
              <span className={styles.listPrice}>
                £{Number(product.price).toFixed(2)} / {product.unit}
              </span>
              <button
                type="button"
                className={styles.listQuickAddBtn}
                onClick={() => openQuickAdd(product)}
              >
                Quick add
              </button>
            </div>
          ))}
        </section>
      )}

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