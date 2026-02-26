import styles from "./About.module.css";

export default function About() {
  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.hero}>
        <h1>About BRFN</h1>
        <p>
          Bristol’s Finest is a modern marketplace focused on quality, 
          transparency, and local sourcing.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Our Mission</h2>
        <p>
          We aim to connect customers with high-quality local produce,
          delivering freshness directly to your door.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Why We Exist</h2>
        <ul>
          <li>Support local producers</li>
          <li>Provide transparent sourcing</li>
          <li>Deliver exceptional quality</li>
        </ul>
      </section>
    </main>
  );
}