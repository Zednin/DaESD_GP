import { useState, useEffect, useCallback } from "react";
import styles from "./ProducerDashboard.module.css";
import ProducerOverview from "../../components/Producer/ProducerOverview";
import ProducerProducts from "../../components/Producer/ProducerProducts";
import ProducerOrders from "../../components/Producer/ProducerOrders";
import ProducerPayments from "../../components/Producer/ProducerPayments";
import ProducerSurplus from "../../components/Producer/ProducerSurplus";
import ProducerProfile from "../../components/Producer/ProducerProfile";
import ProducerBrfnAi from "../../components/Producer/ProducerBrfnAi";
import apiClient from "../../utils/apiClient";
import { useAuth } from "../../auth/AuthContext";

const navItems = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "surplus", label: "Surplus" },
  { key: "brfn-ai", label: "BRFN AI" },
  { key: "profile", label: "Content" },
];

const SPLASH_LETTERS = ["B", "R", "F", "N"];
const SPLASH_SESSION_KEY_PREFIX = "producer-dashboard-splash-seen";

function hasSeenDashboardSplash(key) {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export default function ProducerDashboard() {
  const { user } = useAuth();
  const splashSessionKey = user?.id
    ? `${SPLASH_SESSION_KEY_PREFIX}:${user.id}`
    : SPLASH_SESSION_KEY_PREFIX;

  const [dismissedSplashKey, setDismissedSplashKey] = useState("");
  const [splashFading, setSplashFading] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [allProducers, setAllProducers] = useState([]);
  const [selectedProducerId, setSelectedProducerId] = useState("");
  // keeps the orders badge updated in the side nav
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  const isAdmin = user?.account_type === "admin";
  const showSplash = splashFading || (
    dismissedSplashKey !== splashSessionKey && !hasSeenDashboardSplash(splashSessionKey)
  );

  const endSplash = useCallback(() => {
    try {
      sessionStorage.setItem(splashSessionKey, "true");
    } catch {
      // Ignore storage errors so the dashboard still opens normally.
    }

    setSplashFading(true);
    setTimeout(() => {
      setDismissedSplashKey(splashSessionKey);
      setSplashFading(false);
    }, 600);
  }, [splashSessionKey]);

  useEffect(() => {
    if (!showSplash) return;

    const timer = setTimeout(endSplash, 2000);
    return () => clearTimeout(timer);
  }, [showSplash, endSplash]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducers() {
      try {
        const { data } = await apiClient.get("/producers/");
        if (cancelled) return;

        const producers = data.results ?? data;
        setAllProducers(producers);

        if (selectedProducerId) return;

        if (isAdmin) return;

        const ownProducer = producers.find((p) => p.account === user?.id);
        const fallbackProducer = ownProducer ?? producers[0];

        if (fallbackProducer?.id) {
          setSelectedProducerId(String(fallbackProducer.id));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[producer dashboard] failed to fetch producers:", error);
          setAllProducers([]);
        }
      }
    }

    if (user) {
      fetchProducers();
    }

    return () => {
      cancelled = true;
    };
  }, [user, user?.id, isAdmin, selectedProducerId]);

  const producerId = selectedProducerId ? Number.parseInt(selectedProducerId, 10) : null;

  const producerName =
    allProducers.find((p) => p.id === producerId)?.company_name ?? "";

  useEffect(() => {
    if (!producerId) {
      return;
    }

    let cancelled = false;

    // load pending count even before opening orders
    async function fetchPendingOrders() {
      try {
        const { data } = await apiClient.get("/producer-orders/", {
          params: { producer: producerId },
        });
        if (cancelled) return;

        const rows = data.results ?? data;
        setPendingOrderCount(rows.filter((order) => order.status === "pending").length);
      } catch (error) {
        if (!cancelled) {
          console.error("[producer dashboard] failed to fetch pending orders:", error);
          setPendingOrderCount(0);
        }
      }
    }

    fetchPendingOrders();

    return () => {
      cancelled = true;
    };
  }, [producerId]);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <ProducerOverview producerId={producerId} producerName={producerName} />;
      case "products":
        return <ProducerProducts producerId={producerId} producerName={producerName} />;
      case "orders":
        // orders page can push a fresh pending count back here
        return <ProducerOrders producerId={producerId} producerName={producerName} onPendingCountChange={setPendingOrderCount} />;
      case "payments":
        return <ProducerPayments producerId={producerId} producerName={producerName} />;
      case "surplus":
        return <ProducerSurplus producerId={producerId} producerName={producerName} />;
      case "brfn-ai":
        return <ProducerBrfnAi producerId={producerId} producerName={producerName} />;
      case "profile":
        return <ProducerProfile producerId={producerId} producerName={producerName} />;
      default:
        return <ProducerOverview producerId={producerId} producerName={producerName} />;
    }
  };

  if (showSplash) {
    return (
      <div className={`${styles.splash} ${splashFading ? styles.splashFading : ""}`}>
        <div className={styles.splashLetters}>
          {SPLASH_LETTERS.map((letter, i) => (
            <span
              key={letter}
              className={styles.splashLetter}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {letter}
            </span>
          ))}
          <span className={styles.splashSubtitle}>Producer Dashboard</span>
          <span className={styles.splashUnderline} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dashboardWrapper} ${styles.dashboardEnter}`}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Dashboard</h2>

        <nav className={styles.nav}>
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.navBtn} ${activeSection === key ? styles.active : ""}`}
              onClick={() => setActiveSection(key)}
            >
              <span className={styles.navLabel}>{label}</span>
              {key === "orders" && producerId && pendingOrderCount > 0 && (
                <span className={styles.navPendingDot} aria-label={`${pendingOrderCount} pending orders`}>
                  {pendingOrderCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        {isAdmin && (
          <div className={styles.adminBanner}>
            <span className={styles.adminLabel}>Producer:</span>

            <select
              className={styles.adminSelect}
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
            >
              <option value="">— Choose a producer —</option>
              {allProducers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.company_name}
                </option>
              ))}
            </select>

            {allProducers.length === 0 && (
              <span className={styles.adminHint}>
                No producers in the database yet.
              </span>
            )}
          </div>
        )}

        <div key={activeSection} className={styles.fadeIn}>
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
