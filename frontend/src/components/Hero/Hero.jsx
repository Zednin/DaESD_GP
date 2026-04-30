import { motion } from "framer-motion";
import { IoBagHandleOutline } from "react-icons/io5";
import styles from "./Hero.module.css";

import HeroPng from "../../assets/hero.png";
import LeafPng from "../../assets/leaf.png";

import { fadeRight, fadeUp } from "../../animations/heroAnimations";

export default function Hero() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.textWrap}>
          <motion.p
            className={styles.eyebrow}
            variants={fadeRight(0.1)}
            initial="hidden"
            animate="visible"
          >
            Bristol Regional Food Network
          </motion.p>

          <motion.h1
            className={styles.h1}
            variants={fadeRight(0.2)}
            initial="hidden"
            animate="visible"
          >
            Bristol&apos;s finest,
          </motion.h1>

          <motion.h1
            className={styles.h1}
            variants={fadeRight(0.4)}
            initial="hidden"
            animate="visible"
          >
            delivered <span className={styles.highlight}>to you.</span>
          </motion.h1>

          <motion.p
            className={styles.p}
            variants={fadeRight(0.6)}
            initial="hidden"
            animate="visible"
          >
            Shop fresh fruit, vegetables, bakery goods and local produce from
            trusted independent suppliers across Bristol.
          </motion.p>

          <motion.p
            className={styles.p}
            variants={fadeRight(0.75)}
            initial="hidden"
            animate="visible"
          >
            Discover regional food, support local producers, and order everything
            through one simple marketplace.
          </motion.p>

          <motion.div
            className={styles.btnRow}
            variants={fadeUp(0.9)}
            initial="hidden"
            animate="visible"
          >
            <a href="/products" className={styles.primaryBtn}>
              <IoBagHandleOutline />
              Browse Products
            </a>
          </motion.div>
        </div>

        <div className={styles.images}>
          <motion.img
            src={HeroPng}
            alt="Fresh local produce basket"
            className={styles.heroImg}
            initial={{ opacity: 0, x: 200, rotate: 75 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          <div className={styles.leafWrap}>
            <motion.img
              src={LeafPng}
              alt=""
              aria-hidden="true"
              className={styles.leafImg}
              initial={{ opacity: 0, y: -200, rotate: 75 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1, delay: 1.0 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}