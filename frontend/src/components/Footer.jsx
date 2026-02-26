import { FaFacebook, FaInstagram, FaArrowUp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import styles from "./Footer.module.css";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>

      {/* Social media icons */}
      <div className={styles.socialIcons}>
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          <FaFacebook />
        </a>
        <a href="https://www.x.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          <FaXTwitter />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          <FaInstagram />
        </a>
      </div>

      <small className={styles.copyright}>
        © {new Date().getFullYear()} Group Project
        </small>


      {/* Scroll to top button */}
      <div className={styles.backToTop}>
        <button onClick={scrollToTop} className={styles.backToTopBtn}>
          <FaArrowUp /> Back to Top
        </button>
      </div>


    </footer>
  );
}