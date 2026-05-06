import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiGrid, FiList } from "react-icons/fi";
import { LuLeaf } from "react-icons/lu";

import apiClient from "../../utils/apiClient";
import QuickAddModal from "../QuickAddModal/QuickAddModal";
import { fadeUp } from "../../animations/heroAnimations";
import { addToCart, getCartSubtotal, readCart } from "../../utils/cartStorage";
import { getAllergenInfo } from "../../utils/allergenIcons";
import { useAuth } from "../../auth/AuthContext";

import productStyles from "../../pages/Products.module.css";

function ViewToggle({ viewMode, setViewMode }) {
  return (
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
  );
}

export default function ProducerProductsDetail({ producerId }) {
  const [products, setProducts] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { canUseBulkOrders } = useAuth();
  const [cartSubtotal, setCartSubtotal] = useState(() =>
    getCartSubtotal(readCart(), { canUseBulkOrders })
  );

  const navigate = useNavigate();

  useEffect(() => {
    function syncSubtotal() {
      setCartSubtotal(getCartSubtotal(readCart(), { canUseBulkOrders }));
    }

    window.addEventListener("cart:updated", syncSubtotal);
    return () => window.removeEventListener("cart:updated", syncSubtotal);
  }, [canUseBulkOrders]);

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
    await addToCart(product, qty, { canUseBulkOrders });
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

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
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
            canUseBulkOrders={canUseBulkOrders}
          />
        )}
      </AnimatePresence>
    </>
  );
}
