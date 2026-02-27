import { useEffect, useRef, useState } from "react";
import {MdOutlineShoppingCart} from "react-icons/md";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./Navbar.module.css";
import SearchBar from "./SearchBar";
import { Link } from "react-router-dom";
import { readCart, getCartCount, getCartSubtotal } from "../utils/cartStorage";
import { useAuth } from "../auth/AuthContext";

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
]



const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    filter: "blur(6px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 520,
      damping: 32,
      mass: 0.7,
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.985,
    filter: "blur(6px)",
    transition: { duration: 0.16, ease: "easeInOut" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

const badgeVariants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: "spring", stiffness: 900, damping: 22 },
  },
};

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const cartWrapRef = useRef(null);

  const [cartItems, setCartItems] = useState(() => readCart());

  const itemCount = getCartCount(cartItems);
  const subtotal = getCartSubtotal(cartItems);

  // keep navbar in sync when anything updates cartStorage
  useEffect(() => {
    function syncCart() {
      setCartItems(readCart());
    }
    window.addEventListener("cart:updated", syncCart);
    return () => window.removeEventListener("cart:updated", syncCart);
  }, []);

  // Close when clicking ouside
  useEffect(() => {
    function onMouseDown(e) {
      if (!cartWrapRef.current) return;
      if (!cartWrapRef.current.contains(e.target)) setCartOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Close on ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setCartOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        {/* LEFT SIDE */}
        <div className={styles.left}>
          <Link className={styles.logoText} to="/">
            BRFN
          </Link>

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

          {/* Auth */}
          {!loading && user ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className={styles.authLink} style={{ cursor: "default"}}>
                Hi, {user.username || user.email}
              </span>
              <button type="button" className={styles.authlink} onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            !loading && <Link className={styles.link} to="/login">Sign In</Link>
          )}

          {/* Cart */}
          <div className={styles.cartWrap} ref={cartWrapRef}>
            <button
              type="button"
              className={styles.cartBtn}
              aria-label="Cart"
              aria-haspopup="menu"
              aria-expanded={cartOpen}
              onClick={() => setCartOpen((v) => !v)}
            >
              <MdOutlineShoppingCart />
              <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  className={styles.cartBadge}
                  variants={badgeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  key={itemCount} // makes it pop when the number changes
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
            </button>

            <AnimatePresence>
            {cartOpen && (
              <motion.div
                className={styles.cartDropdown}
                role="menu"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownVariants}
                style={{ transformOrigin: "top right" }}
              >
                <div className={styles.cartHeader}>
                  <span className={styles.cartTitle}>Your basket</span>
                  <span className={styles.cartMeta}>{itemCount} items</span>
                </div>

                {cartItems.length === 0 ? (
                  <div className={styles.cartEmpty}>Your basket is empty.</div>
                ) : (
                  <>
                    <motion.ul className={styles.cartList}>
                      <AnimatePresence initial={false}>
                        {cartItems.map((item) => (
                          <motion.li
                            key={item.productId}
                            className={styles.cartItem}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            whileHover={{ x: 2 }}
                            transition={{ type: "spring", stiffness: 600, damping: 35 }}
                          >
                            <div className={styles.cartItemText}>
                              <div className={styles.cartItemName}>{item.name}</div>
                              <div className={styles.cartItemSub}>
                                Qty {item.qty} • £{Number(item.price).toFixed(2)} / {item.unit}
                              </div>
                            </div>

                            <div className={styles.cartItemTotal}>
                              £{(item.qty * Number(item.price)).toFixed(2)}
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </motion.ul>

                    <div className={styles.cartFooter}>
                      <div className={styles.cartSubtotalRow}>
                        <span>Subtotal</span>
                        <strong>£{subtotal.toFixed(2)}</strong>
                      </div>

                      <div className={styles.cartActions}>
                        <Link to="/cart" className={styles.viewCartBtn} onClick={() => setCartOpen(false)}>
                          View basket
                        </Link>
                        <Link to="/checkout" className={styles.checkoutBtn} onClick={() => setCartOpen(false)}>
                          Checkout
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}