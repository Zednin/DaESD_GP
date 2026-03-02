import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";
import styles from "./Dropdown.module.css";

export default function Dropdown({ options, value, onChange, placeholder = "Select…" }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function onOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected ? selected.label : placeholder;

  function handleSelect(optValue) {
    onChange(optValue);
    setIsOpen(false);
  }

  // Basic keyboard navigation
  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((o) => !o);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const next = options[idx + 1];
      if (next) onChange(next.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const prev = options[idx - 1];
      if (prev) onChange(prev.value);
    }
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""}`}
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{displayLabel}</span>
        <motion.span
          className={styles.chevron}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <FiChevronDown />
        </motion.span>
      </button>

      {/* Animated menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className={styles.menu}
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {options.map((opt) => (
              <motion.li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`${styles.option} ${opt.value === value ? styles.optionActive : ""}`}
                onClick={() => handleSelect(opt.value)}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                transition={{ duration: 0.1 }}
              >
                {opt.label}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
