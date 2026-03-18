import { useEffect, useState } from "react";
import styles from "../../pages/Producer/ProducerDashboard.module.css";

export default function ProducerProfile() {
  const [producer, setProducer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducerProfile() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/producers/", {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load producer profile.");
        }

        const data = await res.json();
        const producerList = data.results ?? data;
        const currentProducer = producerList[0];

        if (!currentProducer) {
          throw new Error("No producer profile found for this account.");
        }

        setProducer(currentProducer);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadProducerProfile();
  }, []);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.centred}>
          <span className={styles.spinner} />
          Loading producer profile…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.section}>
        <div className={styles.centred}>
          <p className={styles.errorText}>Error: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>My Producer Profile</h2>
          <p className={styles.subtitle}>
            View your business profile information
          </p>
        </div>

        <button className={styles.editBtn} type="button">
          Edit Profile
        </button>
      </div>

      {!producer ? (
        <div className={styles.empty}>
          <p>No producer profile found.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>Company Name</th>
                <td>{producer.company_name || <span className={styles.muted}>—</span>}</td>
              </tr>
              <tr>
                <th>Company Number</th>
                <td>{producer.company_number || <span className={styles.muted}>—</span>}</td>
              </tr>
              <tr>
                <th>Lead Time</th>
                <td>
                  {producer.lead_time_hours
                    ? `${producer.lead_time_hours} hours`
                    : <span className={styles.muted}>—</span>}
                </td>
              </tr>
              <tr>
                <th>Description</th>
                <td>
                  {producer.company_description || (
                    <span className={styles.muted}>No description added yet.</span>
                  )}
                </td>
              </tr>
              <tr>
                <th>Account</th>
                <td>
                  {producer.account_email ||
                    producer.email ||
                    producer.account_username ||
                    <span className={styles.muted}>—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}