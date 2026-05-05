import Hero from "../components/Hero/Hero";
import FeaturedProducts from "../components/FeaturedProducts/FeaturedProducts";
import Banner from "../components/Banners/Banner";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <Hero />

      <section className={styles.intro}>
        <p className={styles.eyebrow}>Local food, made simple</p>
        <h1>Shop fresh produce from trusted local suppliers.</h1>
        <p className={styles.subtext}>
          BRFN connects customers with independent producers, making it easier
          to discover fresh, seasonal, and sustainable food in one place.
        </p>
      </section>

      <FeaturedProducts />

      <section className={styles.benefits}>
        <div className={styles.card}>
          <h3>Fresh & seasonal</h3>
          <p>Locally sourced produce, updated regularly.</p>
        </div>

        <div className={styles.card}>
          <h3>Support local producers</h3>
          <p>Buy directly from regional suppliers.</p>
        </div>

        <div className={styles.card}>
          <h3>Simple ordering</h3>
          <p>Browse, add to basket, and checkout easily.</p>
        </div>
      </section>

      <Banner />
    </main>
  );
}