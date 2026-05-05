import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "../Customer/MyAccount.module.css";

// order history
import OrderHistory from "../../components/Customer/OrderHistory";

import Settings from "../../components/Producer/Settings";
import ProducerOnboarding from "../../components/Producer/ProducerOnboarding";

const MotionDiv = motion.div;

export default function ProducerMyAccount() {
  const [activeSection, setActiveSection] = useState("settings");

  function renderSection() {
    switch (activeSection) {
      // added order history button
      case "orderHistory":
        return <OrderHistory />;
      case "settings":
        return <Settings />;
      case "onboarding":
        return <ProducerOnboarding />;
      default:
        return <Settings />;
    }
  }

  return (
    <div className={styles.dashboardWrapper}>
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
              activeSection === "settings" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("settings")}
          >
            Settings
          </button>

          <button
            className={`${styles.navBtn} ${
              activeSection === "onboarding" ? styles.active : ""
            }`}
            onClick={() => setActiveSection("onboarding")}
          >
            Site Onboarding
          </button>
        </nav>
      </aside>

      <section className={styles.content}>
        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {renderSection()}
          </MotionDiv>
        </AnimatePresence>
      </section>
    </div>
  );
}