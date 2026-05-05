import { useState } from "react";
import styles from "./MyAccount.module.css";

import { useAuth } from "../../auth/AuthContext";
import OrderHistory from "../../components/Customer/OrderHistory";
import RecurringOrders from "../../components/Customer/RecurringOrders";
import Reviews from "../../components/Customer/Reviews";
import Settings from "../../components/Customer/Settings";

export default function MyAccount() {
  const { canUseRecurringOrders } = useAuth();
  const [activeSection, setActiveSection] = useState("orderHistory");
  const visibleSection = !canUseRecurringOrders && activeSection === "recurringOrders"
    ? "orderHistory"
    : activeSection;

  function renderSection() {
    switch (visibleSection) {
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
              visibleSection === "orderHistory" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("orderHistory")}
          >
            Orders
          </button>

          {canUseRecurringOrders && (
            <button
              className={`${styles.navBtn} ${
                visibleSection === "recurringOrders" ? styles.active : ""
              }`}
              onClick={() => setActiveSection("recurringOrders")}
            >
              Recurring Orders
            </button>
          )}

          <button
            className={`${styles.navBtn} ${
              visibleSection === "reviews" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("reviews")}
          >
            Reviews
          </button>

          <button
            className={`${styles.navBtn} ${
              visibleSection === "settings" ? styles.active : ""
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