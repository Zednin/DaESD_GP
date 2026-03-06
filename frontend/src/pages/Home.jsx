import { useEffect, useState } from "react";
import Hero from "../components/Hero/Hero";
import FeaturedProducts from "../components/FeaturedProducts/FeaturedProducts";
import Banner from "../components/Banners/Banner";

export default function Home() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ error: String(e) }));
  }, []);

  return (
    <main>
      <Hero />
      <FeaturedProducts />
      <Banner />

      {/* keep the backend status section below if you want */}
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
    </main>
  );
}
