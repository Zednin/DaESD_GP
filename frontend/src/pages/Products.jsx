import styles from "./Products.module.css";

const dummyProducts = [
  { id: 1, name: "Organic Apples", price: "£3.50" },
  { id: 2, name: "Fresh Spinach", price: "£2.20" },
  { id: 3, name: "Sourdough Bread", price: "£4.00" },
  { id: 4, name: "Local Honey", price: "£6.50" },
];

export default function Products() {
  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>Products</h1>
        <p>Browse our selection of locally sourced goods.</p>
      </header>

      <section className={styles.grid}>
        {dummyProducts.map((product) => (
          <div key={product.id} className={styles.card}>
            <div className={styles.imagePlaceholder}></div>

            <div className={styles.cardBody}>
              <h3>{product.name}</h3>
              <span className={styles.price}>{product.price}</span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}