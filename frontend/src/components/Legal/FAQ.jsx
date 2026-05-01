import { useState } from "react";
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

export default function FAQ() {
  const [openItem, setOpenItem] = useState("About BRFN-0");

  const toggleItem = (id) => {
    setOpenItem((current) => (current === id ? "" : id));
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Need a hand?</p>
        <h1>Frequently Asked Questions</h1>
        <p>
          Answers to the common bits: accounts, producers, food miles, privacy,
          recommendations, and how BRFN works.
        </p>
      </section>

      <section className={styles.faqWrap}>
        {faqs.map((group) => (
          <div className={styles.group} key={group.category}>
            <div className={styles.groupHeader}>
              <span className={styles.groupIcon}>{group.icon}</span>
              <h2>{group.category}</h2>
            </div>

            <div className={styles.items}>
              {group.questions.map((item, index) => {
                const id = `${group.category}-${index}`;
                const isOpen = openItem === id;

                return (
                  <article
                    className={`${styles.item} ${isOpen ? styles.open : ""}`}
                    key={id}
                  >
                    <button
                      type="button"
                      className={styles.question}
                      onClick={() => toggleItem(id)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      <FaChevronDown className={styles.chevron} />
                    </button>

                    <div className={styles.answer}>
                      <p>{item.a}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}