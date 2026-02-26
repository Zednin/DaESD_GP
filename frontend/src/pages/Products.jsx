import { useEffect, useState } from "react";
import styles from "./Products.module.css";



export default function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function loadProducts() {
      const res = await fetch("/api/products/");
      const data = await res.json();
      setProducts(data);
    }

    loadProducts();
  }, []);

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>Products</h1>
        <p>Browse our selection of locally sourced goods.</p>
      </header>

      <section className={styles.grid}>
        {products.map((product) => (
          <div key={product.id} className={styles.card}>
            <div className={styles.imagePlaceholder}></div>

            <div className={styles.cardBody}>
              <h3>{product.name}</h3>
              <span className={styles.price}>
                £{Number(product.price).toFixed(2)} / {product.unit}
              </span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}