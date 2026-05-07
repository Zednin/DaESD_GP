import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.imageWrap}>
          <img
            src="https://res.cloudinary.com/drwmcduef/image/upload/v1778148293/ChatGPT_Image_May_7_2026_at_10_58_57_AM_gvqsfc.png"
            alt="404 page not found illustration"
            className={styles.image}
          />
        </div>

        <div className={styles.actions}>
          <Link to="/" className={styles.primaryBtn}>
            Go home
          </Link>

          <Link to="/products" className={styles.secondaryBtn}>
            Browse products
          </Link>
        </div>
      </section>
    </main>
  );
}