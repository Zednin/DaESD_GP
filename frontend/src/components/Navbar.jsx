import {MdOutlineShoppingCart} from "react-icons/md";
import styles from "./Navbar.module.css";
import SearchBar from "./SearchBar";

const NavbarMenu = [
    {
        id: 1,
        title: "Home",
        link: "/",
    },
    {
        id: 2,
        title: "Products",
        link: "#",
    },
    {
        id: 3,
        title: "About Us",
        link: "#",
    },
    {
        id: 4,
        title: "Reduced to Clear",
        link: "#",
    },
    {
        id: 5,
        title: "Link 5",
        link: "#",
    },
]

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        
        {/* LEFT SIDE */}
        <div className={styles.left}>
            {/* Logo */}
          <a href="/" className={styles.logoText}>
            BRFN
          </a>
          
          {/* Menu */}
          <ul className={styles.menu}>
            {NavbarMenu.map((menu) => (
              <li key={menu.id}>
                <a className={styles.link} href={menu.link}>
                  {menu.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <div className={styles.right}>
          <SearchBar />

          <button className={styles.cartBtn} aria-label="Cart">
            <MdOutlineShoppingCart />
          </button>
        </div>

      </div>
    </nav>
  );
}