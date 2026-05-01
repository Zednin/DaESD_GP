import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "../Customer/MyAccount.module.css";

import Settings from "../../components/Producer/Settings";
import ProducerOnboarding from "../../components/Producer/ProducerOnboarding";

export default function ProducerMyAccount() {
  const [activeSection, setActiveSection] = useState("settings");

  function renderSection() {
    switch (activeSection) {
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
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}