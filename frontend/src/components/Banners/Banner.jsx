import { motion } from "framer-motion";
import BannerImg from "../../assets/hero3.png";
import styles from "./Banner.module.css";

export default function Banner() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.grid}`}>

        {/* Banner Image */}
        <div className={styles.imageWrap}>
          <motion.img
            src={BannerImg}
            alt="Fresh fruit"
            className={styles.image}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 100,
              delay: 0.2
            }}
            viewport={{ once: true }}
          />
        </div>

        {/* Banner Text */}
        <div className={styles.textWrap}>

          <motion.h2
            className={styles.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            viewport={{ once: true }}
          >
            Who are we?
          </motion.h2>

          <motion.p
            className={styles.text}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Eum, culpa voluptates voluptatem cupiditate deserunt ratione
            quidem! Voluptas autem blanditiis sequi.
          </motion.p>

          <motion.p
            className={styles.text}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            viewport={{ once: true }}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Earum asperiores temporibus doloribus in, illo officia dolore
            odio doloremque repellendus quibusdam.
          </motion.p>

          <motion.div
            className={styles.btnRow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            viewport={{ once: true }}
          >
            <button className={styles.primaryBtn}>
              Learn More
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
}