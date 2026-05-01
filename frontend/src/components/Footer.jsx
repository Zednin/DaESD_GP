import { FaFacebook, FaInstagram, FaArrowUp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer({ onOpenTerms }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        
        {/* Left - Branding */}
        <div className={styles.brand}>
          <h3>BRFN</h3>
          <p>Connecting communities with local food producers</p>
        </div>

        {/* Middle - Links */}
        <div className={styles.links}>
          <div>
            <h4>Platform</h4>
            <Link to="/products">Browse products</Link>
            <Link to="/signup/select">Create account</Link>
            <Link to="/faq">FAQ</Link>
          </div>

          <div>
            <h4>Legal</h4>
            <button
              type="button"
              className={styles.linkButton}
              onClick={onOpenTerms}
            >
              Terms & Conditions
            </button>
          </div>
        </div>

        {/* Right - Social */}
        <div className={styles.social}>
          <h4>Follow</h4>
          <div className={styles.socialIcons}>
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
              <FaFacebook />
            </a>
            <a href="https://www.x.com" target="_blank" rel="noopener noreferrer">
              <FaXTwitter />
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
              <FaInstagram />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <small>
          © {new Date().getFullYear()} Bristol Regional Food Network (BRFN)
        </small>

        <button onClick={scrollToTop} className={styles.backToTopBtn}>
          <FaArrowUp /> Back to Top
        </button>
      </div>
    </footer>
  );
}