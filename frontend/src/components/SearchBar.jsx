import { IoMdSearch } from "react-icons/io";
import styles from "./SearchBar.module.css";

export default function SearchBar() {
  return (
    <div className={styles.wrap}>
      <input
        className={styles.input}
        type="text"
        placeholder="Search"
        aria-label="Search"
      />
      <IoMdSearch className={styles.icon} />
    </div>
  );
}