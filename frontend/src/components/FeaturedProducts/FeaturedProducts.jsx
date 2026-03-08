import { motion } from "framer-motion";
import { FiHeart, FiArrowRight } from "react-icons/fi";
import styles from "./FeaturedProducts.module.css";
import apple from "../../assets/apple.png";
import orange from "../../assets/orange.png";
import crack from "../../assets/crack.png";

const featuredProducts = [
  {
    id: 1,
    name: "Juicy pum pum apple",
    tagline: "Sweet, crisp and locally loved.",
    price: "£4.48",
    likes: 128,
    image: apple,
    featured: false,
  },
  {
    id: 2,
    name: "Golden farm oranges",
    tagline: "Bright citrus with peak freshness.",
    price: "£3.95",
    likes: 214,
    image: orange,
    featured: true,
  },
  {
    id: 3,
    name: "Crack cocaine",
    tagline: "Ready to enjoy.",
    price: "£5.20",
    likes: 420,
    image: crack, 
    featured: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: "easeOut",
    },
  },
};

export default function FeaturedProducts() {
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
          <span className={styles.kicker}>Trending now</span>
          <h2 className={styles.title}>Most loved this week</h2>
          <p className={styles.subtitle}>
            A few favourites our community keeps coming back for.
          </p>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          {featuredProducts.map((product, index) => (
            <motion.article
              key={product.id}
              className={`${styles.card} ${
                product.featured ? styles.cardFeatured : ""
              }`}
              variants={cardVariants}
              whileHover={{
                y: -10,
                rotateX: product.featured ? 2 : 0,
                rotateY: product.featured ? -2 : 0,
                transition: { duration: 0.22, ease: "easeOut" },
              }}
              animate={
                product.featured
                  ? {
                      y: [0, -8, 0],
                    }
                  : undefined
              }
              transition={
                product.featured
                  ? {
                      duration: 4.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : undefined
              }
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className={`${styles.glow} ${
                  product.accent === "secondary"
                    ? styles.glowSecondary
                    : styles.glowPrimary
                }`}
              />

              <div className={styles.cardTop}>
                <span className={styles.badge}>
                  <FiHeart />
                  {product.likes}
                </span>
                {product.featured && (
                  <span className={styles.featuredPill}>Top pick</span>
                )}
              </div>

              <div className={styles.visualWrap}>
              <motion.div
                  className={styles.visual}
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.25 }}
              >
                  <img
                  src={product.image}
                  alt={product.name}
                  className={styles.productImg}
                  />
              </motion.div>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{product.name}</h3>
                <p className={styles.cardText}>{product.tagline}</p>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.price}>{product.price}</span>
                <button className={styles.cardBtn}>
                  View
                  <FiArrowRight />
                </button>
              </div>
            </motion.article>
          ))}
        </motion.div>

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