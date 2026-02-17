export default function Navbar() {
  return (
    <header style={{ padding: "16px 24px", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <strong>BRFN</strong>
        <nav style={{ display: "flex", gap: 12 }}>
          <a href="/" style={{ textDecoration: "none" }}>Home</a>
          <a href="/about" style={{ textDecoration: "none" }}>About</a>
          <a href="/contact" style={{ textDecoration: "none" }}>Contact</a>
        </nav>
      </div>
    </header>
  );
}