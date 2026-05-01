import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronDown,
  FaLeaf,
  FaTruck,
  FaLock,
  FaStore,
  FaRecycle,
} from "react-icons/fa";
import styles from "./FAQ.module.css";

const faqs = [
  {
    category: "About BRFN",
    icon: <FaLeaf />,
    questions: [
      {
        q: "What is BRFN?",
        a: "Bristol Regional Food Network is a platform designed to connect local food producers with customers, organisations, restaurants, charities, and education settings.",
      },
      {
        q: "Is this a real commercial platform?",
        a: "BRFN is currently a university project and is hypothetical in nature. It demonstrates how a local food marketplace could operate.",
      },
    ],
  },
  {
    category: "Orders & producers",
    icon: <FaStore />,
    questions: [
      {
        q: "Who can buy from producers?",
        a: "Customers, restaurants, community groups, charities, and education organisations can create accounts and order from producers.",
      },
      {
        q: "Can producers see my information?",
        a: "Yes. Producers can see information required to fulfil an order, such as your name, order details, and delivery address.",
      },
    ],
  },
  {
    category: "Food miles",
    icon: <FaTruck />,
    questions: [
      {
        q: "How are food miles calculated?",
        a: "Food miles are estimated using location data to calculate the distance between the producer and the customer or delivery address.",
      },
      {
        q: "Are food mile calculations exact?",
        a: "No. They are estimates intended to help users understand the approximate distance food has travelled.",
      },
    ],
  },
  {
    category: "Data & privacy",
    icon: <FaLock />,
    questions: [
      {
        q: "Do you sell my data?",
        a: "No. BRFN does not sell personal data to third parties.",
      },
      {
        q: "How is machine learning used?",
        a: "Machine learning is used internally to provide personalised product recommendations based on sales data, customer data, and order history.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Account deletion is intended to be available so users can request removal of their account and associated personal data.",
      },
    ],
  },
  {
    category: "Sustainability",
    icon: <FaRecycle />,
    questions: [
      {
        q: "How does BRFN support sustainability?",
        a: "BRFN encourages local ordering, food mile awareness, and access to surplus food deals where available.",
      },
      {
        q: "What are surplus deals?",
        a: "Surplus deals are products that producers may offer at reduced prices to help reduce food waste.",
      },
    ],
  },
];

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const floatUp = {
  hidden: {
    opacity: 0,
    y: 26,
    filter: "blur(6px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: "easeOut",
    },
  },
};

const groupVariants = {
  hidden: {
    opacity: 0,
    y: 34,
    scale: 0.985,
    filter: "blur(8px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 420,
      damping: 34,
      mass: 0.8,
    },
  },
};

export default function FAQ() {
  const [openItem, setOpenItem] = useState("About BRFN-0");

  const toggleItem = (id) => {
    setOpenItem((current) => (current === id ? "" : id));
  };

  return (
    <motion.main
      className={styles.page}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.section className={styles.hero} variants={floatUp}>
        <motion.p className={styles.eyebrow} variants={floatUp}>
          Need a hand?
        </motion.p>

        <motion.h1 variants={floatUp}>Frequently Asked Questions</motion.h1>

        <motion.p variants={floatUp}>
          Answers to the common bits: accounts, producers, food miles, privacy,
          recommendations, and how BRFN works.
        </motion.p>
      </motion.section>

      <motion.section className={styles.faqWrap} variants={pageVariants}>
        {faqs.map((group) => (
          <motion.div
            className={styles.group}
            key={group.category}
            variants={groupVariants}
            whileHover={{ y: -3 }}
          >
            <div className={styles.groupHeader}>
              <motion.span
                className={styles.groupIcon}
                whileHover={{ rotate: -8, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
              >
                {group.icon}
              </motion.span>

              <h2>{group.category}</h2>
            </div>

            <div className={styles.items}>
              {group.questions.map((item, index) => {
                const id = `${group.category}-${index}`;
                const isOpen = openItem === id;

                return (
                  <motion.article
                    className={`${styles.item} ${isOpen ? styles.open : ""}`}
                    key={id}
                    layout
                  >
                    <button
                      type="button"
                      className={styles.question}
                      onClick={() => toggleItem(id)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>

                      <motion.span
                        className={styles.chevronWrap}
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      >
                        <FaChevronDown />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className={styles.answerMotion}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                        >
                          <p>{item.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        ))}
      </motion.section>
    </motion.main>
  );
}