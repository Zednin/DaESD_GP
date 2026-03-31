import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiGrid, FiList } from "react-icons/fi";
import { LuLeaf } from "react-icons/lu";
import QuickAddModal from "../components/QuickAddModal/QuickAddModal";
import FilterPanel from "../components/FilterPanel/FilterPanel";
import { fadeRight, fadeUp } from "../animations/heroAnimations";
import styles from "./Products.module.css";
import { addToCart, getCartSubtotal, readCart } from "../utils/cartStorage";
import { getAllergenInfo } from "../utils/allergenIcons";
import apiClient from "../utils/apiClient";
import { useNavigate } from "react-router-dom";

// Hardcoded recommendations — replace with API call later
const HARDCODED_RECOMMENDATIONS = [
  { id: 901, name: "Organic Carrots", price: "2.50", unit: "kg", organic_certified: true, category_name: "Vegetables", producer_name: "Green Acres" },
  { id: 902, name: "Free Range Eggs", price: "3.80", unit: "dozen", organic_certified: false, category_name: "Dairy & Eggs", producer_name: "Sunrise Farm" },
  { id: 903, name: "Sourdough Loaf", price: "4.20", unit: "loaf", organic_certified: false, category_name: "Bakery", producer_name: "Village Bakery" },
  { id: 904, name: "Raw Honey", price: "6.50", unit: "jar", organic_certified: true, category_name: "Pantry", producer_name: "Meadow Apiaries" },
  { id: 905, name: "Fresh Strawberries", price: "3.00", unit: "punnet", organic_certified: true, category_name: "Fruit", producer_name: "Berry Fields" },
];

export default function Products() {
  const [rawProducts, setRawProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recsOpen, setRecsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();

  // --- Filter / sort state ---
  const [searchInput, setSearchInput] = useState("");
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

  // Debounce search input doesnt request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // One-time fetch of all products to populate filter options
  useEffect(() => {
    apiClient.get("/products/", { params: { ordering: "name" } })
      .then(({ data }) => {
        const catNames = [...new Set(data.map((p) => p.category_name).filter(Boolean))].sort();
        const prodNames = [...new Set(data.map((p) => p.producer_name).filter(Boolean))].sort();
        setCategories(catNames);
        setProducers(prodNames);
      });
    apiClient.get("/allergens/")
      .then(({ data }) => setAllergens(data.results ?? data));
  }, []);

  // All filtering now handled by the backend
  useEffect(() => {
    const params = {};
    if (selectedCategory) params.category__name = selectedCategory;
    if (selectedProducer) params.producer__company_name = selectedProducer;
    if (organicOnly) params.organic_certified = "true";
    if (search.trim()) params.search = search.trim();
    if (selectedAllergens.length > 0) params.exclude_allergens = selectedAllergens.join(",");
    params.ordering = sortBy;
    apiClient.get("/products/", { params })
      .then(({ data }) => setRawProducts(data));
  }, [selectedCategory, selectedProducer, organicOnly, sortBy, search, selectedAllergens]);

  const products = rawProducts;

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
    setSearchInput("");
    setSelectedCategory("");
    setSelectedProducer("");
    setSelectedAllergens([]);
    setOrganicOnly(false);
    setSortBy("name");
  }

  function goToProduct(productId) {
    navigate(`/products/${productId}`);
  }

  function openQuickAdd(product) {
    // If surplus is active, pass the discounted price
    if (product.surplus_active) {
      setSelectedProduct({
        ...product,
        original_price: product.price,
        price: product.surplus_price,
      });
    } else {
      setSelectedProduct(product);
    }
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
        <motion.h1
          variants={fadeRight(0.1)}
          initial="hidden"
          animate="visible"
        >
          Products
        </motion.h1>
        <motion.p
          variants={fadeRight(0.2)}
          initial="hidden"
          animate="visible"
        >
          Browse our selection of locally sourced goods.
        </motion.p>
      </header>

      {/* ── AI Recommendations (customers only) ── */}
      {HARDCODED_RECOMMENDATIONS.length > 0 && (
        <motion.section
          className={styles.recsSection}
          variants={fadeUp(0.25)}
          initial="hidden"
          animate="visible"
        >
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
                          <span className={styles.recOrganicBadge}><LuLeaf size={14} /></span>
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
        </motion.section>
      )}

      {/* ── Toolbar ── */}
      <motion.div
        className={styles.toolbar}
        variants={fadeUp(0.3)}
        initial="hidden"
        animate="visible"
      >
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
      </motion.div>

      {/* ── Results count ── */}
      <motion.p
        className={styles.resultCount}
        variants={fadeUp(0.35)}
        initial="hidden"
        animate="visible"
      >
        {products.length}{" "}
        {products.length === 1 ? "product" : "products"} found
      </motion.p>

      {/* ── Product grid / list ── */}
      {products.length === 0 ? (
        <p className={styles.emptyMsg}>
          No products match your filters.&nbsp;
          <button type="button" className={styles.clearLink} onClick={clearFilters}>
            Clear all filters
          </button>
        </p>
      ) : viewMode === "grid" ? (
        <motion.section
          className={styles.grid}
          variants={fadeUp(0.4)}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => (
              <div
                key={product.id}
                className={`${styles.card} ${product.surplus_active ? styles.surplusCard : ""}`}
                onClick={() => goToProduct(product.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToProduct(product.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${product.name}`}
              >
              <div className={styles.imagePlaceholder}>
                {product.image && (
                  <img src={product.image} alt={product.name} className={styles.cardImage} />
                )}
                {product.organic_certified && (
                  <span className={styles.organicBadge}><LuLeaf size={14} /> Organic</span>
                )}
                {product.surplus_active && (
                  <span className={styles.surplusBadge}>-{product.discount_percentage}% OFF</span>
                )}
              </div>

              <div className={styles.cardBody}>
                <h3>{product.name}</h3>
                {product.surplus_active ? (
                  <span className={styles.price}>
                    <span className={styles.originalPriceStrike}>£{Number(product.price).toFixed(2)}</span>
                    {' '}
                    <span className={styles.surplusPrice}>£{Number(product.surplus_price).toFixed(2)}</span>
                    {' '}/ {product.unit}
                  </span>
                ) : (
                  <span className={styles.price}>
                    £{Number(product.price).toFixed(2)} / {product.unit}
                  </span>
                )}
                {product.allergens && product.allergens.length > 0 && (
                  <div className={styles.allergenTags}>
                    {product.allergens.map((a) => {
                      const { Icon, label } = getAllergenInfo(a.name);
                      return (
                        <span key={a.id} className={styles.allergenTag} title={label}>
                          <Icon size={13} /> {label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  className={styles.quickAddBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickAdd(product);
                  }}
                >
                  Quick add
                </button>
              </div>
            </div>
          ))}
        </motion.section>
      ) : (
        <motion.section
          className={styles.list}
          variants={fadeUp(0.4)}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className={styles.listCard}
              onClick={() => goToProduct(product.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToProduct(product.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${product.name}`}
            >
              <div className={styles.listImagePlaceholder}>
                {product.image && (
                  <img src={product.image} alt={product.name} className={styles.listImage} />
                )}
              </div>
              <div className={styles.listBody}>
                <h3>{product.name}</h3>
                <span className={styles.listMeta}>
                  {product.producer_name}{product.category_name ? ` · ${product.category_name}` : ""}
                  {product.organic_certified && <> · <LuLeaf size={14} /> Organic</>}
                </span>
                {product.allergens && product.allergens.length > 0 && (
                  <div className={styles.allergenTags}>
                    {product.allergens.map((a) => {
                      const { Icon, label } = getAllergenInfo(a.name);
                      return (
                        <span key={a.id} className={styles.allergenTag} title={label}>
                          <Icon size={12} /> {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {product.surplus_active ? (
                <span className={styles.listPrice}>
                  <span className={styles.originalPriceStrike}>£{Number(product.price).toFixed(2)}</span>
                  {' '}
                  <span className={styles.surplusPrice}>£{Number(product.surplus_price).toFixed(2)}</span>
                  {' '}/ {product.unit}
                </span>
              ) : (
                <span className={styles.listPrice}>
                  £{Number(product.price).toFixed(2)} / {product.unit}
                </span>
              )}
              <button
                type="button"
                className={styles.listQuickAddBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickAdd(product);
                }}
              >
                Quick add
              </button>
            </div>
          ))}
        </motion.section>
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