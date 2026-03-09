import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSliders, FiChevronDown } from "react-icons/fi";
import styles from "./FilterPanel.module.css";

const SORT_OPTIONS = [
  { value: "name",   label: "Name A–Z" },
  { value: "-name",  label: "Name Z–A" },
  { value: "price",  label: "Price: Low → High" },
  { value: "-price", label: "Price: High → Low" },
];

export default function FilterPanel({
  categories,
  producers,
  allergens = [],
  selectedCategory,
  selectedProducer,
  selectedAllergens = [],
  organicOnly,
  sortBy,
  onCategoryChange,
  onProducerChange,
  onAllergenToggle,
  onOrganicChange,
  onSortChange,
  onClear,
  activeFilterCount,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className={styles.wrapper} ref={ref}>
      {/* ── Trigger button ── */}
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
      >
        <FiSliders className={styles.icon} />
        <span>Filters &amp; Sort</span>
        {activeFilterCount > 0 && (
          <span className={styles.badge}>{activeFilterCount}</span>
        )}
        <motion.span
          className={styles.chevron}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <FiChevronDown />
        </motion.span>
      </button>

      {/* ── Animated panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Sort */}
            <FilterSection label="Sort by">
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={sortBy === opt.value}
                  onClick={() => onSortChange(opt.value)}
                />
              ))}
            </FilterSection>

            {/* Category */}
            {categories.length > 0 && (
              <FilterSection label="Category">
                <Chip
                  label="All"
                  active={!selectedCategory}
                  onClick={() => onCategoryChange("")}
                />
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={selectedCategory === cat}
                    onClick={() =>
                      onCategoryChange(selectedCategory === cat ? "" : cat)
                    }
                  />
                ))}
              </FilterSection>
            )}

            {/* Producer */}
            {producers.length > 0 && (
              <FilterSection label="Producer">
                <Chip
                  label="All"
                  active={!selectedProducer}
                  onClick={() => onProducerChange("")}
                />
                {producers.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    active={selectedProducer === p}
                    onClick={() =>
                      onProducerChange(selectedProducer === p ? "" : p)
                    }
                  />
                ))}
              </FilterSection>
            )}

            {/* Organic */}
            <FilterSection label="Certifications">
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={organicOnly}
                  onChange={(e) => onOrganicChange(e.target.checked)}
                />
                <span className={`${styles.toggleTrack} ${organicOnly ? styles.toggleTrackOn : ""}`}>
                  <span className={styles.toggleThumb} />
                </span>
                <span className={styles.toggleLabel}>🌿 Organic only</span>
              </label>
            </FilterSection>

            {/* Allergens */}
            {allergens.length > 0 && (
              <AllergenDropdown
                allergens={allergens}
                selectedAllergens={selectedAllergens}
                onAllergenToggle={onAllergenToggle}
              />
            )}

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
              >
                Clear all filters ({activeFilterCount})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterSection({ label, children }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>{label}</p>
      <div className={styles.chips}>{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${active ? styles.chipActive : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function AllergenDropdown({ allergens, selectedAllergens, onAllergenToggle }) {
  const [open, setOpen] = useState(false);
  const count = selectedAllergens.length;

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.allergenTrigger}
        onClick={() => setOpen((o) => !o)}
      >
        <p className={styles.sectionLabel} style={{ margin: 0 }}>Allergens - Free From...</p>
        <span className={styles.allergenMeta}>
          {count > 0 && <span className={styles.allergenCount}>{count}</span>}
          <motion.span
            className={styles.chevron}
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            <FiChevronDown />
          </motion.span>
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.allergenList}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {allergens.map((a) => (
              <label key={a.id} className={styles.allergenItem}>
                <input
                  type="checkbox"
                  checked={selectedAllergens.includes(a.id)}
                  onChange={() => onAllergenToggle(a.id)}
                />
                <span>{a.name}</span>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
