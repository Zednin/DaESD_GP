import { useEffect, useState } from "react";

export default function Home() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/health/")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ error: String(e) }));
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>Welcome</h1>
      <p style={{ fontSize: 18, marginTop: 12, lineHeight: 1.5 }}>
        Welcome to BRFN iytdfi
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Backend Status</h2>
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <span>
            {health === null
              ? "Checking…"
              : health.error
              ? "Backend error"
              : "Backend connected"}
          </span>

          <pre style={{ margin: 0, fontSize: 12, overflowX: "auto" }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      </section>

      <section
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <Card title="Browse" text="Explore the marketplace and filter products." />
        <Card title="Order" text="Add items to cart and place orders." />
        <Card title="Track" text="View order status and traceability info." />
      </section>
    </main>
  );
}

function Card({ title, text }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginBottom: 0, color: "#444" }}>{text}</p>
    </div>
  );
}