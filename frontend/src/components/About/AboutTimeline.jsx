import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  FiCompass,
  FiUsers,
  FiPackage,
  FiHome,
  FiTrendingUp,
} from "react-icons/fi";
import styles from "./AboutTimeline.module.css";

const stages = [
  {
    id: 1,
    label: "Phase 01",
    title: "The idea formed",
    subtitle: "A better way to connect Bristol to local food",
    text: "BRFN began with the need to make local food easier to discover and buy, while helping producers reach beyond farm gates and local markets.",
    icon: <FiCompass />,
    node: { x: 8, y: 24 },
    card: { x: 4, y: 10 },
  },
  {
    id: 2,
    label: "Phase 02",
    title: "Producers joined the network",
    subtitle: "Built around local suppliers and community demand",
    text: "The platform was shaped around small producers, families, community groups, and local businesses with different food needs.",
    icon: <FiUsers />,
    node: { x: 47, y: 28 },
    card: { x: 56, y: 10 },
  },
  {
    id: 3,
    label: "Phase 03",
    title: "The marketplace took shape",
    subtitle: "Multi-vendor ordering with local transparency",
    text: "BRFN was designed to support multiple producers, seasonal availability, clearer lead times, and better order coordination across the network.",
    icon: <FiPackage />,
    node: { x: 79, y: 55 },
    card: { x: 64, y: 38 },
  },
  {
    id: 4,
    label: "Phase 04",
    title: "Community value expanded",
    subtitle: "Stories, education, and local connection",
    text: "The platform grew beyond transactions with recipes, producer stories, sustainability awareness, and food education.",
    icon: <FiHome />,
    node: { x: 34, y: 78 },
    card: { x: 18, y: 62 },
  },
  {
    id: 5,
    label: "Phase 05",
    title: "Built to grow further",
    subtitle: "A system designed to evolve with the network",
    text: "From recurring organisational orders to reporting and producer fulfilment, BRFN is designed to scale without losing its local focus.",
    icon: <FiTrendingUp />,
    node: { x: 12, y: 90 },
    card: { x: 4, y: 76 },
  },
];

function clamp(v, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

export default function AboutTimeline() {
  const sectionRef = useRef(null);
  const [progressValue, setProgressValue] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.45,
  });

  useMotionValueEvent(smooth, "change", (latest) => {
    setProgressValue(latest);
  });

  const pathLength = useTransform(smooth, [0, 1], [0.03, 1]);
  const sceneX = useTransform(smooth, [0, 1], [0, -70]);
  const sceneY = useTransform(smooth, [0, 1], [0, 26]);
  const bgGlowOneX = useTransform(smooth, [0, 1], [0, 80]);
  const bgGlowTwoY = useTransform(smooth, [0, 1], [0, -70]);

  const stageSize = 1 / stages.length;
  const rawIndex = clamp(progressValue / stageSize, 0, stages.length - 0.0001);
  const currentIndex = Math.floor(rawIndex);
  const localProgress = rawIndex - currentIndex;

  const activeIndex = useMemo(() => currentIndex, [currentIndex]);

  return (
    <section className={styles.section} id="about-story" ref={sectionRef}>
      <div className={styles.sticky}>
        <motion.div className={styles.bgGlowOne} style={{ x: bgGlowOneX }} />
        <motion.div className={styles.bgGlowTwo} style={{ y: bgGlowTwoY }} />

        <div className={`container ${styles.inner}`}>
          <motion.div
            className={styles.heading}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <span className={styles.kicker}>Our journey</span>
            <h2 className={styles.title}>Move through the story of BRFN</h2>
            <p className={styles.text}>
              Scroll to travel through the platform’s evolution — from the original idea,
              to producer coordination, to a marketplace designed around local food,
              transparency, and community value.
            </p>
          </motion.div>

          <div className={styles.stageViewport}>
            <motion.div className={styles.scene} style={{ x: sceneX, y: sceneY }}>
              <svg
                className={styles.svg}
                viewBox="0 0 1200 900"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <filter id="timelineGlow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <path
                  d="
                    M 80 210
                    C 260 208, 390 220, 560 255
                    S 860 340, 1020 470
                    S 1000 690, 760 735
                    S 360 835, 130 820
                  "
                  className={styles.basePath}
                />

                <motion.path
                  d="
                    M 80 210
                    C 260 208, 390 220, 560 255
                    S 860 340, 1020 470
                    S 1000 690, 760 735
                    S 360 835, 130 820
                  "
                  className={styles.progressPath}
                  style={{ pathLength }}
                  filter="url(#timelineGlow)"
                />
              </svg>

              {stages.map((stage, index) => {
                const isActive = index === activeIndex;
                const isPrev = index === activeIndex - 1;
                const isNext = index === activeIndex + 1;

                let nodeScale = 0.84;
                let nodeOpacity = 0.35;
                let glowOpacity = 0.08;

                if (isActive) {
                  nodeScale = 1.05 + localProgress * 0.12;
                  nodeOpacity = 1;
                  glowOpacity = 0.42;
                } else if (isPrev) {
                  nodeScale = 0.9;
                  nodeOpacity = 0.58;
                  glowOpacity = 0.14;
                } else if (isNext) {
                  nodeScale = 0.92;
                  nodeOpacity = 0.48;
                  glowOpacity = 0.12;
                }

                return (
                  <div key={`node-${stage.id}`}>
                    <motion.div
                      className={styles.nodeWrap}
                      animate={{
                        left: `${stage.node.x}%`,
                        top: `${stage.node.y}%`,
                        opacity: nodeOpacity,
                        scale: nodeScale,
                      }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                      <motion.div
                        className={styles.nodeGlow}
                        animate={{ opacity: glowOpacity, scale: isActive ? 1.5 : 1 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                      />
                      <motion.div
                        className={styles.node}
                        animate={{
                          scale: isActive ? [1, 1.08, 1] : 1,
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: isActive ? Infinity : 0,
                          ease: "easeInOut",
                        }}
                      >
                        {stage.icon}
                      </motion.div>
                    </motion.div>
                  </div>
                );
              })}

              {stages.map((stage, index) => {
                const isActive = index === activeIndex;
                const isPrev = index === activeIndex - 1;
                const isNext = index === activeIndex + 1;

                let opacity = 0;
                let scale = 0.94;
                let y = 30;
                let blur = 14;
                let zIndex = 1;

                if (isActive) {
                  opacity = 1;
                  scale = 1;
                  y = 0;
                  blur = 0;
                  zIndex = 4;
                } else if (isPrev) {
                  opacity = 0.22;
                  scale = 0.97;
                  y = -10;
                  blur = 4;
                  zIndex = 2;
                } else if (isNext) {
                  opacity = 0.14;
                  scale = 0.96;
                  y = 18;
                  blur = 8;
                  zIndex = 2;
                }

                return (
                  <motion.article
                    key={`card-${stage.id}`}
                    className={styles.card}
                    style={{
                      left: `${stage.card.x}%`,
                      top: `${stage.card.y}%`,
                      zIndex,
                    }}
                    animate={{
                      opacity,
                      scale,
                      y,
                      filter: `blur(${blur}px)`,
                    }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  >
                    <span className={styles.cardKicker}>{stage.label}</span>
                    <h3 className={styles.cardTitle}>{stage.title}</h3>
                    <h4 className={styles.cardSubtitle}>{stage.subtitle}</h4>
                    <p className={styles.cardText}>{stage.text}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}