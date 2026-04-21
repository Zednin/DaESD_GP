import { motion } from "framer-motion";
import styles from "./AboutImpact.module.css";
import impactImage from "../../assets/cow.jpg";

const impactStats = [
  {
    id: 1,
    value: "Stronger",
    label: "local supply links",
    text: "Helping producers, households, and organisations connect through shorter and more visible food relationships.",
  },
  {
    id: 2,
    value: "Better",
    label: "community access",
    text: "Making local food systems feel more open, usable, and reachable for more people across Bristol.",
  },
  {
    id: 3,
    value: "More",
    label: "informed choices",
    text: "Giving clearer visibility into where food comes from, who grows it, and how it moves through the network.",
  },
  {
    id: 4,
    value: "Long-term",
    label: "local resilience",
    text: "Supporting a food ecosystem that can grow with purpose without losing its regional identity.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 56,
    scale: 0.96,
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function AboutImpact() {
  return (
    <section className={styles.section} id="about-impact">
      <div className={`container ${styles.inner}`}>
        <div className={styles.layout}>
          <motion.div
            className={styles.left}
            initial={{ opacity: 0, x: -40, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className={styles.imageWrap}>
              <motion.div
                className={styles.imageFrame}
                whileHover={{
                  scale: 1.03,
                  rotate: -2,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className={styles.imageHalo} />
                <div className={styles.imageRing} />
                <img
                  className={styles.image}
                  src={impactImage}
                  alt="People and producers contributing to a stronger local food system"
                  loading="lazy"
                />
              </motion.div>

              <motion.div
                className={styles.floatingBadge}
                initial={{ opacity: 0, scale: 0.9, y: 24 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
                viewport={{ once: true, amount: 0.25 }}
                whileHover={{ y: -6, scale: 1.03 }}
              >
                <span className={styles.badgeLabel}>Impact focus</span>
                <strong className={styles.badgeValue}>
                  Local, visible, connected
                </strong>
              </motion.div>
            </div>
          </motion.div>

          <div className={styles.right}>
            <motion.div
              className={styles.heading}
              initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, amount: 0.25 }}
            >
              <span className={styles.kicker}>Our impact</span>
              <h2 className={styles.title}>
                Why this work matters beyond the platform
              </h2>
              <p className={styles.text}>
                BRFN is not just about making local food easier to find. It is
                about strengthening trust, improving access, and supporting a
                more connected food network that works better for producers and
                communities alike.
              </p>
            </motion.div>

            <motion.div
              className={styles.featureCard}
              initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.8,
                delay: 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{
                y: -8,
                rotateX: 3,
                rotateY: -3,
              }}
            >
              <div className={styles.featureGlow} />
              <div className={styles.featureSheen} />
              <span className={styles.featureEyebrow}>
                Built for local resilience
              </span>
              <p className={styles.featureQuote}>
                “A better food system is not only more efficient — it is more
                transparent, more local, and more useful to the people who rely
                on it every day.”
              </p>
              <p className={styles.featureText}>
                The aim is to create practical impact: stronger visibility for
                producers, clearer choices for buyers, and a more grounded local
                network that can keep growing in a meaningful way.
              </p>
            </motion.div>

            <motion.div
              className={styles.grid}
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.14 }}
            >
              {impactStats.map((item) => (
                <motion.article
                  key={item.id}
                  className={styles.card}
                  variants={cardVariants}
                  whileHover={{
                    y: -12,
                    rotateX: 5,
                    rotateY: item.id % 2 === 0 ? -5 : 5,
                    scale: 1.02,
                  }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className={styles.cardGlow} />
                  <div className={styles.cardSheen} />

                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{item.value}</span>
                    <span className={styles.metricLabel}>{item.label}</span>
                  </div>

                  <p className={styles.cardText}>{item.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}