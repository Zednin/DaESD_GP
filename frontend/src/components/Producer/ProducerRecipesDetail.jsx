import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiGrid, FiList } from "react-icons/fi";

import apiClient from "../../utils/apiClient";
import { fadeUp } from "../../animations/heroAnimations";

import productStyles from "../../pages/Products.module.css";
import styles from "../../pages/ProducerDetail.module.css";

function getPreview(content, wordLimit = 25) {
  if (!content) return "";

  const words = content.split(/\s+/);

  if (words.length <= wordLimit) return content;

  return words.slice(0, wordLimit).join(" ") + "...";
}

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

export default function ProducerRecipesDetail({ producerId }) {
  const [recipes, setRecipes] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

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

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setSelectedRecipe(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loading) return <p>Loading recipes...</p>;

  return (
    <section>
      <div className={productStyles.toolbar}>
        <p className={productStyles.resultCount}>
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} found
        </p>

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {recipes.length ? (
        viewMode === "grid" ? (
          <motion.div
            className={productStyles.grid}
            variants={fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className={productStyles.card}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRecipe(recipe)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRecipe(recipe);
                  }
                }}
                aria-label={`Read recipe ${recipe.title}`}
              >
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
                  {recipe.description && <p>{getPreview(recipe.description)}</p>}
                  <button type="button" className={styles.readMoreBtn}>
                    View recipe
                  </button>
                </div>
              </article>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className={productStyles.list}
            variants={fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className={productStyles.listCard}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRecipe(recipe)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRecipe(recipe);
                  }
                }}
                aria-label={`Read recipe ${recipe.title}`}
              >
                <div className={productStyles.listImagePlaceholder}>
                  {recipe.image && (
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className={productStyles.listImage}
                    />
                  )}
                </div>

                <div className={productStyles.listBody}>
                  <h3>{recipe.title}</h3>
                  {recipe.description && <p>{getPreview(recipe.description)}</p>}
                </div>

                <button type="button" className={productStyles.listQuickAddBtn}>
                  View recipe
                </button>
              </article>
            ))}
          </motion.div>
        )
      ) : (
        <p>No recipes shared yet.</p>
      )}

      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setSelectedRecipe(null)}
          >
            <motion.div
              className={styles.contentModal}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={selectedRecipe.title}
            >
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedRecipe(null)}
                aria-label="Close recipe"
              >
                ×
              </button>

              {selectedRecipe.image && (
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className={styles.modalImage}
                />
              )}

              <div className={styles.modalContent}>
                <p className={styles.modalEyebrow}>Recipe</p>
                <h2>{selectedRecipe.title}</h2>

                {selectedRecipe.description && <p>{selectedRecipe.description}</p>}

                {selectedRecipe.ingredients && (
                  <>
                    <h3>Ingredients</h3>
                    <p>{selectedRecipe.ingredients}</p>
                  </>
                )}

                {selectedRecipe.instructions && (
                  <>
                    <h3>Instructions</h3>
                    <p>{selectedRecipe.instructions}</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}