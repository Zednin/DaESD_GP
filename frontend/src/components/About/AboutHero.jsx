import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useMemo, useRef } from "react";
import { FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import styles from "./AboutHero.module.css";

function splitWords(text) {
  return text.split(" ");
}

export default function AboutHero() {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 20,
    mass: 0.45,
  });

  const copyY = useTransform(smoothProgress, [0, 1], [0, 80]);
  const visualY = useTransform(smoothProgress, [0, 1], [0, -50]);
  const glowOneY = useTransform(smoothProgress, [0, 1], [0, 120]);
  const glowTwoY = useTransform(smoothProgress, [0, 1], [0, -80]);
  const badgeY = useTransform(smoothProgress, [0, 1], [0, 30]);

  const titleWords = useMemo(
    () => [
      ...splitWords("Rooted in Bristol."),
      "__break__",
      ...splitWords("Built for local food."),
    ],
    []
  );

  return (
    <section className={styles.hero} ref={sectionRef}>
      <motion.div className={styles.glowOne} style={{ y: glowOneY }} />
      <motion.div className={styles.glowTwo} style={{ y: glowTwoY }} />

      <div className={`container ${styles.inner}`}>
        <motion.div className={styles.copy} style={{ y: copyY }}>
          <motion.div
            className={styles.kickerWrap}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ y: badgeY }}
          >
            <span className={styles.kicker}>About BRFN</span>
          </motion.div>

          <h1 className={styles.title} aria-label="Rooted in Bristol. Built for local food.">
            {titleWords.map((word, index) => {
              if (word === "__break__") {
                return <span key={`break-${index}`} className={styles.lineBreak} />;
              }

              return (
                <motion.span
                  key={`${word}-${index}`}
                  className={styles.word}
                  initial={{ opacity: 0, y: 38 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.08 + index * 0.06,
                  }}
                >
                  {word}&nbsp;
                </motion.span>
              );
            })}
          </h1>

          <motion.p
            className={styles.text}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42, ease: "easeOut" }}
          >
            BRFN is a digital marketplace designed to make local food feel easier to
            access, more transparent to buy, and more connected to the people and
            producers behind it.
          </motion.p>

          <motion.p
            className={styles.subtext}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.54, ease: "easeOut" }}
          >
            Built around Bristol’s local food network, it brings producers,
            communities, and customers into one place without losing the seasonal,
            human side of how food actually moves.
          </motion.p>

          <motion.div
            className={styles.actions}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.68, ease: "easeOut" }}
          >
            <Link to="/products" className={styles.primaryBtn}>
              Browse products
            </Link>

            <a href="#about-story" className={styles.secondaryBtn}>
              Our story
              <FiArrowRight />
            </a>
          </motion.div>
        </motion.div>

        <motion.div className={styles.visualCol} style={{ y: visualY }}>
          <div className={styles.visualStage}>
            <motion.div
              className={`${styles.floatCard} ${styles.cardOne}`}
              initial={{ opacity: 0, scale: 0.92, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -6 }}
              transition={{ duration: 0.65, delay: 0.25, ease: "easeOut" }}
            >
              <span className={styles.cardLabel}>Local producers</span>
              <strong>Fresh, seasonal supply</strong>
            </motion.div>

            <motion.div
              className={`${styles.floatCard} ${styles.cardTwo}`}
              initial={{ opacity: 0, scale: 0.92, rotate: 8 }}
              animate={{ opacity: 1, scale: 1, rotate: 5 }}
              transition={{ duration: 0.65, delay: 0.35, ease: "easeOut" }}
            >
              <span className={styles.cardLabel}>Community value</span>
              <strong>Food with a local story</strong>
            </motion.div>

            <motion.div
              className={styles.mainPanel}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className={styles.orbOne}
                animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className={styles.orbTwo}
                animate={{ y: [0, 10, 0], x: [0, -8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className={styles.panelContent}>
                <div className={styles.metricRow}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricValue}>20-mile</span>
                    <span className={styles.metricLabel}>local radius</span>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricValue}>Seasonal</span>
                    <span className={styles.metricLabel}>by design</span>
                  </div>
                </div>

                <div className={styles.panelText}>
                  <span className={styles.panelEyebrow}>Bristol Regional Food Network</span>
                  <h2 className={styles.panelTitle}>Local food, coordinated better.</h2>
                  <p className={styles.panelBody}>
                    One platform for producer visibility, community access, and clearer
                    multi-vendor ordering.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}