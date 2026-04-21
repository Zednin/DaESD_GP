import { motion } from "framer-motion";
import styles from "./AboutValues.module.css";
import aboutImage from "../../assets/farmer_cow.png";
import aboutImageTwo from "../../assets/farmer_hat.png";

const values = [
  {
    id: 1,
    title: "Local first",
    text: "Here at BRFN we prioritise local producers and shorter supply relationships to support a more resilient and transparent food system.",
  },
  {
    id: 2,
    title: "Transparency",
    text: "From lead times to producer identity, we believe people should understand where food comes from and how it moves through the network.",
  },
  {
    id: 3,
    title: "Community access",
    text: "BRFN is designed to serve households, organisations, and community groups with a system that feels open, useful, and inclusive.",
  },
  {
    id: 4,
    title: "Sustainable choices",
    text: "We support seasonal thinking, shorter supply relationships, and better visibility around the local food ecosystem.",
  },
  {
    id: 5,
    title: "Growth with purpose",
    text: "As the platform grows, the goal is to strengthen producer resilience and community value without losing the local focus.",
  },
  {
    id: 6,
    title: "Connected ecosystem",
    text: "BRFN is designed to connect producers, households, and community groups in a way that builds trust and supports a more resilient local food system.",
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
    y: 60,
    scale: 0.94,
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function AboutValues() {
  return (
    <section className={styles.section} id="about-values">
      <div className={`container ${styles.inner}`}>
        <div className={styles.layout}>
          <div className={styles.left}>
            <motion.div
              className={styles.heading}
              initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, amount: 0.25 }}
            >
              <span className={styles.kicker}>Our values</span>
              <h2 className={styles.title}>What guides BRFN as it grows</h2>
              <p className={styles.text}>
                The platform is shaped by a few core principles — supporting local
                producers, building trust through transparency, and creating a food
                system that is practical, inclusive, and rooted in community value.
              </p>
            </motion.div>

            <motion.div
              className={styles.grid}
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.14 }}
            >
              {values.map((value) => (
                <motion.article
                  key={value.id}
                  className={styles.card}
                  variants={cardVariants}
                  whileHover={{
                    y: -14,
                    rotateX: 5,
                    rotateY: value.id % 2 === 0 ? -5 : 5,
                    scale: 1.025,
                  }}
                  transition={{
                    duration: 0.28,
                    ease: "easeOut",
                  }}
                >
                  <div className={styles.cardGlow} />
                  <div className={styles.cardSheen} />

                  <motion.h3
                    className={styles.cardTitle}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {value.title}
                  </motion.h3>

                  <p className={styles.cardText}>{value.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>

          <motion.div
            className={styles.right}
            initial={{ opacity: 0, x: 40, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className={styles.imageStack}>
              <motion.div
                className={`${styles.imageFrame} ${styles.imageFramePrimary}`}
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
                  src={aboutImage}
                  alt="Local food producers and community food network"
                  loading="lazy"
                />
              </motion.div>

              <motion.div
                className={`${styles.imageFrame} ${styles.imageFrameSecondary}`}
                whileHover={{
                  scale: 1.04,
                  rotate: 3,
                  y: -4,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className={styles.imageHalo} />
                <div className={styles.imageRing} />
                <img
                  className={styles.image}
                  src={aboutImageTwo}
                  alt="Bristol food community and local produce"
                  loading="lazy"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}