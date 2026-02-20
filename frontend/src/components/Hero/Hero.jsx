import { motion } from "framer-motion";
import { IoBagHandleOutline } from "react-icons/io5";
import styles from "./Hero.module.css";

import HeroPng from "../../assets/hero.png";
import LeafPng from "../../assets/leaf.png";

import { fadeLeft, fadeRight, fadeUp } from "../../animations/heroAnimations";

export default function Hero() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.grid}`}>
        {/* Text */}
        <div className={styles.textWrap}>
          <motion.h1
            className={styles.h1}
            variants={fadeRight(0.2)}
            initial="hidden"
            animate="visible"
          >
            Bristol&apos;s Finest,
          </motion.h1>

          <motion.h1
            className={styles.h1}
            variants={fadeRight(0.4)}
            initial="hidden"
            animate="visible"
          >
            delivered <span className={styles.highlight}>to you!</span>
          </motion.h1>

          <motion.p
            className={styles.p}
            variants={fadeRight(0.6)}
            initial="hidden"
            animate="visible"
          >
            Random text lol
          </motion.p>

          <motion.p
            className={styles.p}
            variants={fadeRight(0.75)}
            initial="hidden"
            animate="visible"
          >
            More random text lol
          </motion.p>

          {/* Button */}
          <motion.div
            className={styles.btnRow}
            variants={fadeUp(0.9)}
            initial="hidden"
            animate="visible"
          >
            <button className={styles.primaryBtn}>
              <IoBagHandleOutline />
              Browse Products
            </button>
          </motion.div>
        </div>

        {/* Images */}
        <div className={styles.images}>
          {/* Main hero image */}
          <motion.img
            src={HeroPng}
            alt="Hero Image"
            className={styles.heroImg}
            initial={{ opacity: 0, x: 200, rotate: 75 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          {/* Leaf image */}
          <div className={styles.leafWrap}>
            <motion.img
              src={LeafPng}
              alt="Leaf decoration"
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