import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuBookOpen, LuX } from "react-icons/lu";
import { getRecipesForProduct } from "../../utils/recipesApi";
import styles from "./ProductRecipes.module.css";

const CLOSE_ANIMATION_MS = 200;

const SEASONAL_LABELS = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
  autumn_winter: "Autumn / Winter",
  spring_summer: "Spring / Summer",
  all_year: "All year round",
};

function splitLines(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function RecipeCard({ recipe, onOpen }) {
  const seasonLabel = SEASONAL_LABELS[recipe.seasonal_tag] || null;

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.cardButton}
        onClick={() => onOpen(recipe)}
        aria-label={`View recipe: ${recipe.title}`}
      >
        <div className={styles.cardImageWrap}>
          {recipe.image ? (
            <img src={recipe.image} alt={recipe.title} className={styles.cardImage} />
          ) : (
            <div className={styles.cardImageFallback}>
              <LuBookOpen size={28} />
            </div>
          )}
          {seasonLabel && <span className={styles.seasonPill}>{seasonLabel}</span>}
        </div>

        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{recipe.title}</h3>
          {recipe.description && (
            <p className={styles.cardDescription}>{recipe.description}</p>
          )}
          <span className={styles.viewLink}>View recipe →</span>
        </div>
      </button>
    </article>
  );
}

function RecipeModal({ recipe, onClose }) {
  const { productId: currentProductId } = useParams();
  const [closing, setClosing] = useState(false);
  const [prevRecipe, setPrevRecipe] = useState(recipe);

  if (recipe !== prevRecipe) {
    setPrevRecipe(recipe);
    if (recipe) setClosing(false);
  }

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  }, [onClose]);

  function handleLinkedProductClick(event, linkedProductId) {
    if (String(linkedProductId) === String(currentProductId)) {
      event.preventDefault();
      const opts = { top: 0, behavior: "smooth" };
      window.scrollTo(opts);
      document.documentElement.scrollTo(opts);
      document.body.scrollTo(opts);
    }
    handleClose();
  }

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  if (!recipe) return null;

  const ingredients = splitLines(recipe.ingredients);
  const instructions = splitLines(recipe.instructions);
  const seasonLabel = SEASONAL_LABELS[recipe.seasonal_tag] || null;
  const linkedProducts = recipe.linked_products || [];

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={recipe.title}>
        <button
          type="button"
          className={styles.modalClose}
          onClick={handleClose}
          aria-label="Close recipe"
        >
          <LuX size={20} />
        </button>

        {recipe.image && (
          <div className={styles.modalImageWrap}>
            <img src={recipe.image} alt={recipe.title} className={styles.modalImage} />
          </div>
        )}

        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <h3>{recipe.title}</h3>
            {seasonLabel && <span className={styles.seasonPill}>{seasonLabel}</span>}
          </div>

          {recipe.description && (
            <p className={styles.modalDescription}>{recipe.description}</p>
          )}

          {ingredients.length > 0 && (
            <section className={styles.modalSection}>
              <h4>Ingredients</h4>
              <ul className={styles.ingredientsList}>
                {ingredients.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          {instructions.length > 0 && (
            <section className={styles.modalSection}>
              <h4>Instructions</h4>
              <ol className={styles.instructionsList}>
                {instructions.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ol>
            </section>
          )}

          {linkedProducts.length > 0 && (
            <section className={styles.modalSection}>
              <h4>Products linked to this recipe:</h4>
              <ul className={styles.linkedProductsList}>
                {linkedProducts.map((product) => (
                  <li key={product.id}>
                    <Link
                      to={`/products/${product.id}`}
                      className={styles.linkedProductLink}
                      onClick={(event) => handleLinkedProductClick(event, product.id)}
                    >
                      {product.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductRecipes({ productId }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!productId) return;
      try {
        setLoading(true);
        setError("");
        const data = await getRecipesForProduct(productId);
        if (!cancelled) setRecipes(data);
      } catch (err) {
        if (!cancelled) setError("Failed to load recipes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) return null;
  if (error) return null;
  if (!recipes.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Recipes from the producer</h2>
          <p className={styles.sectionNote}>
            Producer-made ideas for cooking with this product.
          </p>
        </div>
        <span className={styles.countChip}>
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onOpen={setSelectedRecipe} />
        ))}
      </div>

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </section>
  );
}
