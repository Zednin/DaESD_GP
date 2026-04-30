import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import styles from "./FeaturedProducts.module.css";

const API_URL = "http://localhost:8000/api/products/";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
    },
  },
};

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data = await response.json();

        // Handles both normal arrays and paginated DRF responses
        const productList = Array.isArray(data) ? data : data.results || [];

        setProducts(productList.slice(0, 3));
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }

    fetchProducts();
  }, []);

  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <span className={styles.kicker}>Featured products</span>
          <h2 className={styles.title}>Fresh from local producers</h2>
          <p className={styles.subtitle}>
            Browse a selection of products currently available through BRFN.
          </p>
        </motion.div>

        {status === "loading" && (
          <p className={styles.message}>Loading products...</p>
        )}

        {status === "error" && (
          <p className={styles.message}>
            Products could not be loaded right now.
          </p>
        )}

        {status === "success" && products.length === 0 && (
          <p className={styles.message}>No products available yet.</p>
        )}

        {status === "success" && products.length > 0 && (
          <motion.div
            className={styles.grid}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            {products.map((product) => (
              <motion.article
                key={product.id}
                className={styles.card}
                variants={cardVariants}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.2, ease: "easeOut" },
                }}
              >
                <div className={styles.visualWrap}>
                  <div className={styles.visual}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className={styles.productImg}
                      />
                    ) : (
                      <div className={styles.placeholderImg}>
                        No image
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{product.name}</h3>

                  <p className={styles.cardText}>
                    {product.description ||
                      product.tagline ||
                      "Fresh local produce available now."}
                  </p>

                  {product.producer_name && (
                    <p className={styles.producer}>
                      By {product.producer_name}
                    </p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.price}>
                    £{Number(product.price).toFixed(2)}
                  </span>

                  <a
                    href={`/products/${product.id}`}
                    className={styles.cardBtn}
                  >
                    View
                    <FiArrowRight />
                  </a>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        <motion.div
          className={styles.ctaRow}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          viewport={{ once: true }}
        >
          <a href="/products" className={styles.primaryBtn}>
            Browse all products
          </a>
        </motion.div>
      </div>
    </section>
  );
}