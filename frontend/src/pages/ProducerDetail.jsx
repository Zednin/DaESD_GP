import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

  if (loading) {
    return (
      <main className="container">
        <p>Loading producer...</p>
      </main>
    );
  }

  if (error || !producer) {
    return (
      <main className="container">
        <p>{error || "Producer not found."}</p>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
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