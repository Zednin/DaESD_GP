import styles from "./TermsModal.module.css";

export default function TermsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="terms-title">Terms and Conditions</h2>

          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p>
            By creating an account with <strong>Bristol Regional Food Network
            (BRFN)</strong>, you agree to these Terms and Conditions. These terms
            explain how we collect, use, and protect your data when you use the
            platform.
          </p>

          <h3>1. Information we collect</h3>
          <p>When you use BRFN, we may collect and store:</p>
          <ul>
            <li>Account information, such as username, name, and email address.</li>
            <li>Delivery information, including addresses and location-related data.</li>
            <li>Order history and transaction data.</li>
            <li>Usage data, such as how you interact with the platform.</li>
            <li>Business information for producer accounts.</li>
          </ul>

          <p>
            We may also process location-related data to estimate food miles
            between customers and producers.
          </p>

          <h3>2. How we use your data</h3>
          <p>We use your data to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Process and fulfil orders.</li>
            <li>Enable communication between customers and producers.</li>
            <li>Calculate and display food miles between orders.</li>
            <li>Improve platform functionality and reliability.</li>
            <li>Provide personalised product recommendations.</li>
          </ul>

          <p>
            We do <strong>not</strong> send marketing emails, and your data is
            not used for advertising purposes.
          </p>

          <h3>3. Machine learning and personalisation</h3>
          <p>
            BRFN uses internal machine learning systems to improve the user
            experience. This may include analysing order history, customer
            preferences, sales data, and marketplace activity.
          </p>

          <p>
            This is used only to provide personalised recommendations and improve
            how the platform functions. Our machine learning systems do{" "}
            <strong>not</strong> make decisions about pricing, user eligibility,
            or access to the platform.
          </p>

          <h3>4. Data sharing</h3>
          <p>
            We do <strong>not</strong> sell your personal data to third parties.
          </p>

          <p>
            Some data may be shared only where necessary to operate the platform,
            including:
          </p>

          <ul>
            <li>
              Producers may see customer information required to fulfil orders,
              such as names and delivery addresses.
            </li>
            <li>
              Stripe may process payment-related information.
            </li>
            <li>
              Cloudinary may be used to store and display uploaded images.
            </li>
            <li>
              Google may be used for login and authentication.
            </li>
            <li>
              Geoapify may be used to estimate distances and food miles.
            </li>
          </ul>

          <h3>5. Cookies</h3>
          <p>
            BRFN only uses cookies and similar technologies that are essential
            for the platform to function, such as login sessions and security.
            We do not use cookies for marketing or advertising tracking.
          </p>

          <h3>6. Data storage and security</h3>
          <p>
            We take reasonable technical and organisational steps to protect user
            data. However, no online system can be guaranteed to be completely
            secure.
          </p>

          <h3>7. Your rights</h3>
          <p>
            As BRFN is based in England, users may have rights under UK data
            protection law, including the right to access, correct, or request
            deletion of their personal data.
          </p>

          <p>
            Account deletion is available upon request. Data export is not
            currently available through the platform.
          </p>

          <h3>8. Educational project notice</h3>
          <p>
            BRFN is a university project and is currently hypothetical in nature.
            These terms are provided to explain intended platform behaviour and
            responsible data handling practices.
          </p>

          <h3>9. Changes to these terms</h3>
          <p>
            These terms may be updated from time to time as the project develops.
            Continued use of the platform means you accept the latest version of
            these terms.
          </p>
        </div>

        <button type="button" className={styles.acceptBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}