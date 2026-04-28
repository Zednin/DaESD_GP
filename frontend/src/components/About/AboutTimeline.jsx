import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
  },
  {
    id: 2,
    label: "Phase 02",
    title: "Producers joined the network",
    subtitle: "Built around local suppliers and community demand",
    text: "The platform was shaped around small producers, families, community groups, and local businesses with different food needs.",
    icon: <FiUsers />,
    node: { x: 47, y: 28 },
  },
  {
    id: 3,
    label: "Phase 03",
    title: "The marketplace took shape",
    subtitle: "Multi-vendor ordering with local transparency",
    text: "BRFN was designed to support multiple producers, seasonal availability, clearer lead times, and better order coordination across the network.",
    icon: <FiPackage />,
    node: { x: 79, y: 55 },
  },
  {
    id: 4,
    label: "Phase 04",
    title: "Community value expanded",
    subtitle: "Stories, education, and local connection",
    text: "The platform grew beyond transactions with recipes, producer stories, sustainability awareness, and food education.",
    icon: <FiHome />,
    node: { x: 34, y: 78 },
  },
  {
    id: 5,
    label: "Phase 05",
    title: "Built to grow further",
    subtitle: "A system designed to evolve with the network",
    text: "From recurring organisational orders to reporting and producer fulfilment, BRFN is designed to scale without losing its local focus.",
    icon: <FiTrendingUp />,
    node: { x: 12, y: 90 },
  },
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getScrollParent(node) {
  if (!node) return window;

  let parent = node.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      /(auto|scroll|overlay)/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight;

    if (canScroll) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
}

export default function AboutTimeline() {
  const sectionRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const scroller = getScrollParent(sectionEl);
    let rafId = 0;

    const updateProgress = () => {
      const el = sectionRef.current;
      if (!el) return;

      let nextProgress = 0;

      if (scroller === window) {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const scrollable = Math.max(rect.height - viewportH, 1);
        nextProgress = clamp(-rect.top / scrollable, 0, 1);
      } else {
        const sectionRect = el.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        const viewportH = scroller.clientHeight;

        const topWithinScroller = sectionRect.top - scrollerRect.top;
        const scrollable = Math.max(el.offsetHeight - viewportH, 1);

        nextProgress = clamp(-topWithinScroller / scrollable, 0, 1);
      }

      setProgress(nextProgress);

      const nextIndex = Math.min(
        stages.length - 1,
        Math.floor(nextProgress * stages.length)
      );

      setActiveIndex((prev) => {
        if (prev !== nextIndex) {
          setDirection(nextIndex > prev ? 1 : -1);
          return nextIndex;
        }
        return prev;
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateProgress);
    };

    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateProgress);
    };

    updateProgress();

    const scrollTarget = scroller === window ? window : scroller;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const currentStage = stages[activeIndex];

  const sceneTranslateX = -56 * progress;
  const sceneTranslateY = 24 * progress;
  const glowOneX = 70 * progress;
  const glowTwoY = -60 * progress;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      style={{ "--timeline-stages": stages.length }}
      id="about-story"
    >
      <div className={styles.sticky}>
        <motion.div
          className={styles.bgGlowOne}
          animate={{ x: glowOneX }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
        <motion.div
          className={styles.bgGlowTwo}
          animate={{ y: glowTwoY }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />

        <div className={`container ${styles.inner}`}>
          <div className={styles.heading}>
            <span className={styles.kicker}>Our journey</span>
            <h2 className={styles.title}>Move through the story of BRFN</h2>
            <p className={styles.text}>
              Scroll to travel through the platform’s evolution.
            </p>
          </div>

          <div className={styles.stageViewport}>
            <motion.div
              className={styles.scene}
              animate={{ x: sceneTranslateX, y: sceneTranslateY }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <svg
                className={styles.svg}
                viewBox="0 0 1200 900"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
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
              </svg>

              {stages.map((stage, index) => {
                const isActive = index === activeIndex;

                return (
                  <motion.div
                    key={stage.id}
                    className={styles.nodeWrap}
                    style={{
                      left: `${stage.node.x}%`,
                      top: `${stage.node.y}%`,
                    }}
                    animate={{
                      opacity: isActive ? 1 : 0.35,
                      scale: isActive ? 1.18 : 0.9,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <motion.div
                      className={styles.nodeGlow}
                      animate={{
                        opacity: isActive ? 0.4 : 0.1,
                        scale: isActive ? 1.35 : 1,
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                    <motion.div
                      className={styles.node}
                      animate={{
                        scale: isActive ? [1, 1.08, 1] : 1,
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: isActive ? Infinity : 0,
                        ease: "easeInOut",
                      }}
                    >
                      {stage.icon}
                    </motion.div>
                  </motion.div>
                );
              })}

              <div className={styles.cardStage}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.article
                    key={currentStage.id}
                    className={styles.card}
                    initial={{
                      opacity: 0,
                      x: direction > 0 ? 140 : -140,
                      y: 20,
                      scale: 0.96,
                      rotate: direction > 0 ? 3 : -3,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      y: 0,
                      scale: 1,
                      rotate: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: direction > 0 ? -110 : 110,
                      y: -10,
                      scale: 0.96,
                      rotate: direction > 0 ? -2 : 2,
                    }}
                    transition={{
                      duration: 0.42,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className={styles.cardKicker}>{currentStage.label}</span>
                    <h3 className={styles.cardTitle}>{currentStage.title}</h3>
                    <h4 className={styles.cardSubtitle}>{currentStage.subtitle}</h4>
                    <p className={styles.cardText}>{currentStage.text}</p>
                  </motion.article>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}