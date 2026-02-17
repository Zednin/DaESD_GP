import { useState } from "react";

const CATEGORIES = ["All", "Fruits", "Vegetables", "Dairy", "Meat", "Bakery", "Pantry"];

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  return (
    <main style={{ width: "100%", padding: "32px 24px", textAlign: "left", boxSizing: "border-box" }}>
      {/* Header */}
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Browse Products</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Fresh produce from local farms</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24, width: "100%" }}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 6, flex: 1, minWidth: 200 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 6, minWidth: 120 }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </main>
  );
}
