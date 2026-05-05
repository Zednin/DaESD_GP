import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";

import apiClient from "../utils/apiClient";

import ProducerProductsDetail from "../components/Producer/ProducerProductsDetail";
import ProducerRecipesDetail from "../components/Producer/ProducerRecipesDetail";
import ProducerStoriesDetail from "../components/Producer/ProducerStoriesDetail";

import styles from "./ProducerDetail.module.css";

const TABS = [
  { key: "products", label: "Products" },
  { key: "recipes", label: "Recipes" },
  { key: "stories", label: "Farm Stories" },
];

export default function ProducerDetail() {
  const { producerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const backTarget = location.state?.from;
  const backLabel = location.state?.fromLabel
    ? `Back to ${location.state.fromLabel}`
    : "Back";

  const [activeTab, setActiveTab] = useState("products");
  const [producer, setProducer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducer() {
      try {
        setLoading(true);
        setError("");

        const { data } = await apiClient.get(`/producers/${producerId}/`);
        setProducer(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load producer.");
      } finally {
        setLoading(false);
      }
    }

    loadProducer();
  }, [producerId]);

  function handleBack() {
    if (backTarget?.pathname) {
      navigate(
        `${backTarget.pathname}${backTarget.search ?? ""}${backTarget.hash ?? ""}`
      );
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/explore");
  }

  if (loading) {
    return (
      <main className={`container ${styles.page}`}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <LuArrowLeft size={18} />
          <span>{backLabel}</span>
        </button>
        <p>Loading producer...</p>
      </main>
    );
  }

  if (error || !producer) {
    return (
      <main className={`container ${styles.page}`}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <LuArrowLeft size={18} />
          <span>{backLabel}</span>
        </button>
        <p>{error || "Producer not found."}</p>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
      <button type="button" className={styles.backButton} onClick={handleBack}>
        <LuArrowLeft size={18} />
        <span>{backLabel}</span>
      </button>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Producer profile</p>
          <h1>{producer.company_name}</h1>

          {producer.company_description && (
            <p className={styles.description}>{producer.company_description}</p>
          )}
        </div>

        <div className={styles.metaGrid}>
          {producer.company_number && (
            <div className={styles.metaCard}>
              <span>Company number</span>
              <strong>{producer.company_number}</strong>
            </div>
          )}

          {producer.lead_time_hours && (
            <div className={styles.metaCard}>
              <span>Lead time</span>
              <strong>{producer.lead_time_hours} hours</strong>
            </div>
          )}

          {producer.business_address && (
            <div className={styles.metaCard}>
              <span>Address</span>
              <strong>Business address #{producer.business_address}</strong>
            </div>
          )}
        </div>
      </section>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`${styles.tab} ${
              activeTab === tab.key ? styles.tabActive : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "products" && (
        <ProducerProductsDetail producerId={producerId} />
      )}

      {activeTab === "recipes" && (
        <ProducerRecipesDetail producerId={producerId} />
      )}

      {activeTab === "stories" && (
        <ProducerStoriesDetail producerId={producerId} />
      )}
    </main>
  );
}
