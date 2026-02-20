import {MdOutlineShoppingCart} from "react-icons/md";
import styles from "./Navbar.module.css";
import SearchBar from "./SearchBar";
import { Link } from "react-router-dom";

const NavbarMenu = [
    {
        id: 1,
        title: "Home",
        link: "/",
    },
    {
        id: 2,
        title: "Products",
        link: "/products",
    },
    {
        id: 3,
        title: "About Us",
        link: "/about",
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
          <Link className={styles.logoText} to="/">
            BRFN
          </Link>
          
          {/* Menu */}
          <ul className={styles.menu}>
            {NavbarMenu.map((menu) => (
              <li key={menu.id}>
                <Link className={styles.link} to={menu.link}>
                  {menu.title}
                </Link>
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