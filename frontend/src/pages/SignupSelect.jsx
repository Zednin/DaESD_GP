import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SignupSelect.module.css";
import {
  FaStore,
  FaUser,
  FaUtensils,
  FaUsers,
  FaHeart,
  FaGraduationCap,
  FaArrowRight,
} from "react-icons/fa";

const customerOptions = [
  {
    value: "",
    title: "Individual Customer",
    description: "Browse and order fresh food for yourself.",
    icon: <FaUser />,
  },
  {
    value: "restaurant",
    title: "Restaurant",
    description: "Source ingredients and place recurring orders.",
    icon: <FaUtensils />,
  },
  {
    value: "community_group",
    title: "Community Group",
    description: "Place larger orders for groups and local initiatives.",
    icon: <FaUsers />,
  },
  {
    value: "charity",
    title: "Charity",
    description: "Access food ordering for charitable operations.",
    icon: <FaHeart />,
  },
  {
    value: "education",
    title: "Education",
    description: "Order for schools, colleges, and learning spaces.",
    icon: <FaGraduationCap />,
  },
];

export default function SignupSelect() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("");
  const [organisationType, setOrganisationType] = useState("");

  function handleContinue() {
    if (accountType === "producer") {
      navigate("/signup/producer");
      return;
    }

    if (accountType === "customer") {
      const query = organisationType ? `?org=${organisationType}` : "";
      navigate(`/signup/customer${query}`);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlowOne} />
      <div className={styles.bgGlowTwo} />

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className={styles.eyebrow}>Create your account</p>
        <h1 className={styles.title}>Choose how you’ll use the marketplace</h1>
        <p className={styles.subtitle}>
          Select the type of account that fits you best. You can tailor the
          signup experience based on your role.
        </p>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>I am joining as</label>

          <div className={styles.accountGrid}>
            <button
              type="button"
              className={`${styles.optionCard} ${
                accountType === "customer" ? styles.optionCardActive : ""
              }`}
              onClick={() => {
                setAccountType("customer");
                setOrganisationType("");
              }}
            >
              <div className={styles.optionIcon}>
                <FaUser />
              </div>
              <div>
                <h3>Customer</h3>
                <p>Buy food for yourself or your organisation.</p>
              </div>
            </button>

            <button
              type="button"
              className={`${styles.optionCard} ${
                accountType === "producer" ? styles.optionCardActive : ""
              }`}
              onClick={() => {
                setAccountType("producer");
                setOrganisationType("");
              }}
            >
              <div className={styles.optionIcon}>
                <FaStore />
              </div>
              <div>
                <h3>Producer</h3>
                <p>Sell your food products through the marketplace.</p>
              </div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {accountType === "customer" && (
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <label className={styles.sectionLabel}>
                What kind of customer are you?
              </label>

              <div className={styles.customerGrid}>
                {customerOptions.map((option) => (
                  <button
                    key={option.value || "individual"}
                    type="button"
                    className={`${styles.customerCard} ${
                      organisationType === option.value
                        ? styles.customerCardActive
                        : ""
                    }`}
                    onClick={() => setOrganisationType(option.value)}
                  >
                    <div className={styles.optionIcon}>{option.icon}</div>
                    <div>
                      <h4>{option.title}</h4>
                      <p>{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/login")}
          >
            Back to login
          </button>

          <button
            type="button"
            className={styles.continueBtn}
            disabled={!accountType || (accountType === "customer" && organisationType === null)}
            onClick={handleContinue}
          >
            Continue
            <FaArrowRight />
          </button>
        </div>
      </motion.div>
    </div>
  );
}