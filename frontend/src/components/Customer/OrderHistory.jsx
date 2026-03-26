import styles from "../../pages/Producer/ProducerDashboard.module.css";

export default function OrderHistory() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Order History</h2>
          <p className={styles.subtitle}>View your past orders</p>
        </div>
      </div>

      <div className={styles.empty}>
        <p>You haven’t placed any orders yet.</p>
      </div>
    </div>
  );
}