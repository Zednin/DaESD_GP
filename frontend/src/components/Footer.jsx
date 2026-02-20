export default function Footer() {
  return (
    <footer style={{ padding: "16px 24px", borderTop: "1px solid #eee", marginTop: 40 }}>
      <small>© {new Date().getFullYear()} You're not meant to be reading this</small>
    </footer>
  );
}