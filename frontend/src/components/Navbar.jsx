import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {MdOutlineShoppingCart} from "react-icons/md";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./Navbar.module.css";
import AccountMenu from "./AccountMenu/AccountMenu";
import NotificationMenu from "./NotificationMenu/NotificationMenu";
import { Link } from "react-router-dom";
import {readCart, getCartCount, getCartSubtotal, updateCartQty,removeFromCart} from "../utils/cartStorage";
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
        link: "/surplus-deals",
    },
    {
        id: 5,
        title: "Farm Stories",
        link: "/farm-stories",
    }
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

function AnimatedValue({ value, className, prefix = "", suffix = "" }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        className={className}
        initial={{ y: 8, opacity: 0, filter: "blur(3px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: -8, opacity: 0, filter: "blur(3px)" }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {prefix}{value}{suffix}
      </motion.span>
    </AnimatePresence>
  );
}

export default function Navbar({ onOpenTerms }) {
  const { user, loading, logout } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const cartWrapRef = useRef(null);

  const [cartItems, setCartItems] = useState(() => readCart());

  const itemCount = getCartCount(cartItems);
  const subtotal = getCartSubtotal(cartItems);

  const navigate = useNavigate();
  const isProducer = user?.account_type === "producer";
  const isAdmin = user?.account_type === "admin";

  const previewItems = cartItems.slice(0, 4);
  const hiddenItemCount = Math.max(0, cartItems.length - previewItems.length);
  const freeDeliveryTarget = 40;
  const freeDeliveryRemaining = Math.max(0, freeDeliveryTarget - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / freeDeliveryTarget) * 100);

  async function increaseQty(item) {
    await updateCartQty(item.productId, Number(item.qty || 1) + 1);
  }

  async function decreaseQty(item) {
    if (Number(item.qty) <= 1) return;
    await updateCartQty(item.productId, Number(item.qty || 1) - 1);
  }

  async function removeItem(item) {
    await removeFromCart(item.productId);
  }

  function handleCheckoutClick(e) {
    if (!user) {
      e.preventDefault(); // stop Link navigating
      setCartOpen(false);
      navigate("/login?next=/checkout");
    } else {
      setCartOpen(false);
    }
  }

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
            {isProducer && (
              <li>
                <Link className={styles.link} to="/producer/dashboard">
                Dashboard
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link className={styles.link} to="/admin/dashboard">
                Dashboard
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <div className={styles.right}>
          {/* Notifications (logged-in only) */}
          {!loading && user && <NotificationMenu notifications={[]} />}

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
                  <div>
                    <span className={styles.cartTitle}>Basket</span>
                    <p className={styles.cartSubtitle}>
                      {itemCount > 0
                        ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready`
                        : "No items added yet"}
                    </p>
                  </div>

                  {itemCount > 0 && (
                    <div className={styles.cartMiniTotal}>
                      <AnimatedValue value={subtotal.toFixed(2)} prefix="£" />
                    </div>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className={styles.cartEmpty}>
                    <div className={styles.cartEmptyIcon}>
                      <MdOutlineShoppingCart />
                    </div>
                    <h3>Your basket is empty</h3>
                    <p>Add local produce and your items will appear here.</p>
                    <Link
                      to="/products"
                      className={styles.emptyCartBtn}
                      onClick={() => setCartOpen(false)}
                    >
                      Browse products
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className={styles.deliveryProgress}>
                      <div className={styles.deliveryText}>
                        {freeDeliveryRemaining > 0 ? (
                          <span>
                            £{freeDeliveryRemaining.toFixed(2)} away from free delivery
                          </span>
                        ) : (
                          <span>Free delivery reached</span>
                        )}
                      </div>

                      <div className={styles.deliveryTrack}>
                        <motion.div
                          className={styles.deliveryFill}
                          initial={{ width: 0 }}
                          animate={{ width: `${freeDeliveryProgress}%` }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <motion.ul className={styles.cartList}>
                      <AnimatePresence initial={false}>
                        {previewItems.map((item) => {
                          const lineTotal = Number(item.qty || 0) * Number(item.price || 0);

                          return (
                            <motion.li
                              key={item.productId}
                              className={styles.cartItem}
                              layout="position"
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              transition={{ type: "spring", stiffness: 520, damping: 36 }}
                            >
                              <div className={styles.cartItemMain}>
                                <div className={styles.cartItemName}>{item.name}</div>

                                <div className={styles.cartItemSub}>
                                  £{Number(item.price).toFixed(2)} / {item.unit || "item"}
                                </div>

                                <div className={styles.cartItemControls}>
                                  <button
                                    type="button"
                                    className={styles.qtyMiniBtn}
                                    onClick={() => decreaseQty(item)}
                                    disabled={Number(item.qty) <= 1}
                                    aria-label={`Decrease ${item.name}`}
                                  >
                                    −
                                  </button>

                                  <div className={styles.qtyMiniValue}>
                                    <AnimatedValue value={item.qty} />
                                  </div>

                                  <button
                                    type="button"
                                    className={styles.qtyMiniBtn}
                                    onClick={() => increaseQty(item)}
                                    aria-label={`Increase ${item.name}`}
                                  >
                                    +
                                  </button>

                                  <button
                                    type="button"
                                    className={styles.removeMiniBtn}
                                    onClick={() => removeItem(item)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              <strong className={styles.cartItemTotal}>
                                <AnimatedValue value={lineTotal.toFixed(2)} prefix="£" />
                              </strong>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </motion.ul>

                    {hiddenItemCount > 0 && (
                      <Link
                        to="/cart"
                        className={styles.moreItemsRow}
                        onClick={() => setCartOpen(false)}
                      >
                        View {hiddenItemCount} more item{hiddenItemCount === 1 ? "" : "s"}
                      </Link>
                    )}

                    <div className={styles.cartFooter}>
                      <div className={styles.cartSubtotalRow}>
                        <span>Subtotal</span>
                        <strong>
                          <AnimatedValue value={subtotal.toFixed(2)} prefix="£" />
                        </strong>
                      </div>

                      <div className={styles.cartActions}>
                        <Link
                          to="/cart"
                          className={styles.viewCartBtn}
                          onClick={() => setCartOpen(false)}
                        >
                          View basket
                        </Link>

                        <Link
                          to="/checkout"
                          className={styles.checkoutBtn}
                          onClick={handleCheckoutClick}
                        >
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

          {/* Auth */}
          {!loading && (
            <AccountMenu
              user={user}
              onLogout={logout}
              onOpenTerms={onOpenTerms}
            />
          )}

        </div>
      </div>
    </nav>
  );
}
