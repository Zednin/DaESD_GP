import { motion } from "framer-motion";
import BannerImg from "../../assets/hero3.png";
import styles from "./Banner.module.css";

export default function Banner() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.imageWrap}>
          <motion.img
            src={BannerImg}
            alt="Fresh fruit and vegetables from local producers"
            className={styles.image}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 90,
              damping: 16,
              delay: 0.15,
            }}
            viewport={{ once: true }}
          />
        </div>

        <div className={styles.textWrap}>
          <motion.p
            className={styles.kicker}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            viewport={{ once: true }}
          >
            About BRFN
          </motion.p>

          <motion.h2
            className={styles.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            viewport={{ once: true }}
          >
            Connecting Bristol with better local food.
          </motion.h2>

          <motion.p
            className={styles.text}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            viewport={{ once: true }}
          >
            BRFN helps customers discover fresh produce from independent local
            suppliers, making regional food easier to find, buy and enjoy.
          </motion.p>

          <motion.p
            className={styles.text}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            viewport={{ once: true }}
          >
            Our marketplace supports small producers while giving customers a
            simple way to shop for seasonal, sustainable and high-quality food.
          </motion.p>

          <motion.div
            className={styles.btnRow}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            viewport={{ once: true }}
          >
            <a href="/about" className={styles.primaryBtn}>
              Learn more
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}