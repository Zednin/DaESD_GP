import { useState } from "react";
import styles from "../../pages/Producer/ProducerDashboard.module.css";

import OrderHistory from "../../components/Customer/OrderHistory";
import RecurringOrders from "../../components/Customer/RecurringOrders";
import Reviews from "../../components/Customer/Reviews";
import Settings from "../../components/Customer/Settings";

export default function MyAccount() {
  const [activeSection, setActiveSection] = useState("orderHistory");

  function renderSection() {
    switch (activeSection) {
      case "orderHistory":
        return <OrderHistory />;
      case "recurringOrders":
        return <RecurringOrders />;
      case "reviews":
        return <Reviews />;
      case "settings":
        return <Settings />;
      default:
        return <OrderHistory />;
    }
  }

  return (
    <div className={styles.dashboardWrapper}>
      
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>My Account</h2>

        <nav className={styles.nav}>
          <button
            className={`${styles.navBtn} ${
              activeSection === "orderHistory" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("orderHistory")}
          >
            Orders
          </button>

          <button
            className={`${styles.navBtn} ${
              activeSection === "recurringOrders" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("recurringOrders")}
          >
            Recurring Orders
          </button>

          <button
            className={`${styles.navBtn} ${
              activeSection === "reviews" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("reviews")}
          >
            Reviews
          </button>

          <button
            className={`${styles.navBtn} ${
              activeSection === "settings" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("settings")}
          >
            Settings
          </button>
        </nav>
      </aside>

      {/* Content */}
      <section className={styles.content}>
        {renderSection()}
      </section>
    </div>
  );
}