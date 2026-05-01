import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiGrid, FiList } from "react-icons/fi";
import { LuLeaf } from "react-icons/lu";

import apiClient from "../utils/apiClient";
import QuickAddModal from "../components/QuickAddModal/QuickAddModal";
import { fadeUp } from "../animations/heroAnimations";
import { addToCart, getCartSubtotal, readCart } from "../utils/cartStorage";
import { getAllergenInfo } from "../utils/allergenIcons";

import productStyles from "./Products.module.css";
import styles from "./ProducerDetail.module.css";

const TABS = [
  { key: "products", label: "Products" },
  { key: "recipes", label: "Recipes" },
  { key: "stories", label: "Farm Stories" },
];

export default function ProducerDetail() {
  const { producerId } = useParams();

  const [activeTab, setActiveTab] = useState("products");
  const [producer, setProducer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducer() {
      try {
        setLoading(true);
        setError("");

        const { data } = await apiClient.get(`/producers/${producerId}/`);
        setProducer(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load producer.");
      } finally {
        setLoading(false);
      }
    }

    loadProducer();
  }, [producerId]);

  if (loading) {
    return (
      <main className="container">
        <p>Loading producer...</p>
      </main>
    );
  }

  if (error || !producer) {
    return (
      <main className="container">
        <p>{error || "Producer not found."}</p>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
        <section className={styles.hero}>
            <div>
            <p className={styles.eyebrow}>Producer profile</p>
            <h1>{producer.company_name}</h1>

            {producer.company_description && (
                <p className={styles.description}>{producer.company_description}</p>
            )}
            </div>

            <div className={styles.metaGrid}>
            {producer.company_number && (
                <div className={styles.metaCard}>
                <span>Company number</span>
                <strong>{producer.company_number}</strong>
                </div>
            )}

            {producer.lead_time_hours && (
                <div className={styles.metaCard}>
                <span>Lead time</span>
                <strong>{producer.lead_time_hours} hours</strong>
                </div>
            )}

            {producer.business_address && (
                <div className={styles.metaCard}>
                <span>Address</span>
                <strong>Business address #{producer.business_address}</strong>
                </div>
            )}
            </div>
        </section>

        <div className={styles.tabs}>
            {TABS.map((tab) => (
            <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`${styles.tab} ${
                activeTab === tab.key ? styles.tabActive : ""
                }`}
            >
                {tab.label}
            </button>
            ))}
        </div>

        {activeTab === "products" && <ProducerProductsTab producerId={producerId} />}
        {activeTab === "recipes" && <ProducerRecipesTab producerId={producerId} />}
        {activeTab === "stories" && <ProducerStoriesTab producerId={producerId} />}
    </main>
  );
}

function ProducerProductsTab({ producerId }) {
  const [products, setProducts] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartSubtotal, setCartSubtotal] = useState(() =>
    getCartSubtotal(readCart())
  );

  const navigate = useNavigate();

  useEffect(() => {
    function syncSubtotal() {
      setCartSubtotal(getCartSubtotal(readCart()));
    }

    window.addEventListener("cart:updated", syncSubtotal);
    return () => window.removeEventListener("cart:updated", syncSubtotal);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        const { data } = await apiClient.get("/products/", {
          params: {
            producer: producerId,
            ordering: "name",
          },
        });

        setProducts(data.results ?? data);
      } catch (err) {
        console.error("Failed to load producer products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [producerId]);

  function goToProduct(productId) {
    navigate(`/products/${productId}`);
  }

  function openQuickAdd(product) {
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

  async function handleAddToBasket(product, qty) {
    await addToCart(product, qty);
    setQuickAddOpen(false);
  }

  if (loading) {
    return <p>Loading products...</p>;
  }

  return (
    <>
      <div className={productStyles.toolbar}>
        <p className={productStyles.resultCount}>
          {products.length} {products.length === 1 ? "product" : "products"} found
        </p>

        <div className={productStyles.viewToggle}>
          <button
            type="button"
            className={`${productStyles.viewBtn} ${
              viewMode === "grid" ? productStyles.viewBtnActive : ""
            }`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <FiGrid />
          </button>

          <button
            type="button"
            className={`${productStyles.viewBtn} ${
              viewMode === "list" ? productStyles.viewBtnActive : ""
            }`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <FiList />
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <p className={productStyles.emptyMsg}>
          This producer has no products listed yet.
        </p>
      ) : viewMode === "grid" ? (
        <motion.section
          className={productStyles.grid}
          variants={fadeUp(0.2)}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className={`${productStyles.card} ${
                product.surplus_active ? productStyles.surplusCard : ""
              }`}
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
              <div className={productStyles.imagePlaceholder}>
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className={productStyles.cardImage}
                  />
                )}

                {product.organic_certified && (
                  <span className={productStyles.organicBadge}>
                    <LuLeaf size={14} /> Organic
                  </span>
                )}

                {product.surplus_active && (
                  <span className={productStyles.surplusBadge}>
                    -{product.discount_percentage}% OFF
                  </span>
                )}
              </div>

              <div className={productStyles.cardBody}>
                <h3>{product.name}</h3>

                {product.surplus_active ? (
                  <span className={productStyles.price}>
                    <span className={productStyles.originalPriceStrike}>
                      £{Number(product.price).toFixed(2)}
                    </span>{" "}
                    <span className={productStyles.surplusPrice}>
                      £{Number(product.surplus_price).toFixed(2)}
                    </span>{" "}
                    / {product.unit}
                  </span>
                ) : (
                  <span className={productStyles.price}>
                    £{Number(product.price).toFixed(2)} / {product.unit}
                  </span>
                )}

                {product.allergens?.length > 0 && (
                  <div className={productStyles.allergenTags}>
                    {product.allergens.map((a) => {
                      const { Icon, label } = getAllergenInfo(a.name);

                      return (
                        <span
                          key={a.id}
                          className={productStyles.allergenTag}
                          title={label}
                        >
                          <Icon size={13} /> {label}
                        </span>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  className={productStyles.quickAddBtn}
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
          className={productStyles.list}
          variants={fadeUp(0.2)}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className={productStyles.listCard}
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
              <div className={productStyles.listImagePlaceholder}>
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className={productStyles.listImage}
                  />
                )}
              </div>

              <div className={productStyles.listBody}>
                <h3>{product.name}</h3>

                <span className={productStyles.listMeta}>
                  {product.producer_name}
                  {product.category_name ? ` · ${product.category_name}` : ""}
                  {product.organic_certified && (
                    <>
                      {" "}
                      · <LuLeaf size={14} /> Organic
                    </>
                  )}
                </span>

                {product.allergens?.length > 0 && (
                  <div className={productStyles.allergenTags}>
                    {product.allergens.map((a) => {
                      const { Icon, label } = getAllergenInfo(a.name);

                      return (
                        <span
                          key={a.id}
                          className={productStyles.allergenTag}
                          title={label}
                        >
                          <Icon size={12} /> {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {product.surplus_active ? (
                <span className={productStyles.listPrice}>
                  <span className={productStyles.originalPriceStrike}>
                    £{Number(product.price).toFixed(2)}
                  </span>{" "}
                  <span className={productStyles.surplusPrice}>
                    £{Number(product.surplus_price).toFixed(2)}
                  </span>{" "}
                  / {product.unit}
                </span>
              ) : (
                <span className={productStyles.listPrice}>
                  £{Number(product.price).toFixed(2)} / {product.unit}
                </span>
              )}

              <button
                type="button"
                className={productStyles.listQuickAddBtn}
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
    </>
  );
}

function ProducerRecipesTab({ producerId }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecipes() {
      try {
        setLoading(true);

        const { data } = await apiClient.get("/recipes/", {
          params: {
            producer: producerId,
            is_published: true,
          },
        });

        setRecipes(data.results ?? data);
      } catch (err) {
        console.error("Failed to load recipes:", err);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecipes();
  }, [producerId]);

  if (loading) return <p>Loading recipes...</p>;

  return (
    <section>
      <h2>Recipes</h2>

      {recipes.length ? (
        <div className={productStyles.grid}>
          {recipes.map((recipe) => (
            <article key={recipe.id} className={productStyles.card}>
              <div className={productStyles.imagePlaceholder}>
                {recipe.image && (
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className={productStyles.cardImage}
                  />
                )}
              </div>

              <div className={productStyles.cardBody}>
                <h3>{recipe.title}</h3>
                {recipe.description && <p>{recipe.description}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p>No recipes shared yet.</p>
      )}
    </section>
  );
}

function ProducerStoriesTab({ producerId }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      try {
        setLoading(true);

        const { data } = await apiClient.get("/farm-stories/", {
          params: {
            producer: producerId,
            is_published: true,
          },
        });

        setStories(data.results ?? data);
      } catch (err) {
        console.error("Failed to load farm stories:", err);
        setStories([]);
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, [producerId]);

  if (loading) return <p>Loading farm stories...</p>;

  return (
    <section>
      <h2>Farm Stories</h2>

      {stories.length ? (
        <div className={productStyles.grid}>
          {stories.map((story) => (
            <article key={story.id} className={productStyles.card}>
              <div className={productStyles.imagePlaceholder}>
                {story.image && (
                  <img
                    src={story.image}
                    alt={story.title}
                    className={productStyles.cardImage}
                  />
                )}
              </div>

              <div className={productStyles.cardBody}>
                <h3>{story.title}</h3>
                {story.content && <p>{story.content}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p>No farm stories shared yet.</p>
      )}
    </section>
  );
}