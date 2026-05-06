import { getProducerLeadTimeGroups } from "./producerLeadTimes";
import styles from "./ProducerLeadTimeTags.module.css";

function formatHours(hours) {
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function formatItems(quantity) {
  return `${quantity} item${quantity === 1 ? "" : "s"}`;
}

export default function ProducerLeadTimeTags({ groups, items, className = "" }) {
  const producerGroups = groups || getProducerLeadTimeGroups(items);

  if (producerGroups.length === 0) return null;

  return (
    <div className={[styles.tags, className].filter(Boolean).join(" ")} aria-label="Producer lead times">
      {producerGroups.map((group) => (
        <span key={group.producerId} className={styles.tag}>
          <strong>{group.producerName}: {formatHours(group.leadTimeHours)}</strong>
          <span>{formatItems(group.quantity)}</span>
        </span>
      ))}
    </div>
  );
}