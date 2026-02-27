import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronRight, FiArrowLeft, FiLogOut, FiHelpCircle, FiMoon, FiSettings, FiUser } from "react-icons/fi";
import styles from "./AccountMenu.module.css";

const panels = {
  root: {
    title: "Account",
    items: ({ user }) => ([
      {
        type: "profile",
        leftIcon: <FiUser />,
        title: user?.username || user?.email || "Account",
        subtitle: "See your profile",
        onClick: () => console.log("go profile"),
      },
      { type: "divider" },
      {
        leftIcon: <FiSettings />,
        title: "Settings & privacy",
        rightIcon: <FiChevronRight />,
        toPanel: "settings",
      },
      {
        leftIcon: <FiHelpCircle />,
        title: "Help & support",
        rightIcon: <FiChevronRight />,
        toPanel: "help",
      },
      {
        leftIcon: <FiMoon />,
        title: "Display & accessibility",
        rightIcon: <FiChevronRight />,
        toPanel: "display",
      },
      { type: "divider" },
      {
        leftIcon: <FiLogOut />,
        title: "Log out",
        danger: true,
        action: "logout",
      },
    ]),
  },

  settings: {
    title: "Settings & privacy",
    items: () => ([
      { leftIcon: <FiSettings />, title: "Settings", onClick: () => console.log("Settings") },
      { leftIcon: <FiUser />, title: "Privacy checkup", onClick: () => console.log("Privacy") },
      { leftIcon: <FiSettings />, title: "Privacy shortcuts", onClick: () => console.log("Shortcuts") },
      { leftIcon: <FiSettings />, title: "Activity log", onClick: () => console.log("Activity log") },
    ]),
  },

  help: {
    title: "Help & support",
    items: () => ([
      { leftIcon: <FiHelpCircle />, title: "Help Centre", onClick: () => console.log("Help Centre") },
      { leftIcon: <FiHelpCircle />, title: "Support inbox", onClick: () => console.log("Support inbox") },
      { leftIcon: <FiHelpCircle />, title: "Report a problem", onClick: () => console.log("Report") },
    ]),
  },

  display: {
    title: "Display & accessibility",
    items: () => ([
      { leftIcon: <FiMoon />, title: "Dark mode", onClick: () => console.log("Dark mode") },
      { leftIcon: <FiSettings />, title: "Compact mode", onClick: () => console.log("Compact") },
      { leftIcon: <FiSettings />, title: "Keyboard", onClick: () => console.log("Keyboard") },
    ]),
  },
};

const panelVariants = {
  enter: (dir) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -28 : 28, opacity: 0 }),
};

export default function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState(["root"]);
  const wrapRef = useRef(null);

  const activeKey = stack[stack.length - 1];
  const activePanel = panels[activeKey];
  const canBack = stack.length > 1;

  // Direction for slide animation
  const dir = useMemo(() => (stack.length > 1 ? 1 : 0), [stack.length]);

  useEffect(() => {
    function onMouseDown(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function go(panelKey) {
    setStack((s) => [...s, panelKey]);
  }

  function back() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  function close() {
    setOpen(false);
    setStack(["root"]);
  }

  function handleItem(item) {
    if (item.toPanel) return go(item.toPanel);
    if (item.action === "logout") {
      onLogout?.();
      close();
      return;
    }
    item.onClick?.();
    close();
  }

  const items = activePanel.items({ user });

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* Trigger button (FB-like round avatar) */}
      <button
        type="button"
        className={styles.avatarBtn}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
      >
        <span className={styles.avatarCircle}>
          {(user?.username?.[0] || user?.email?.[0] || "A").toUpperCase()}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.menu}
            role="menu"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: "easeInOut" }}
          >
            <div className={styles.header}>
              {canBack ? (
                <button className={styles.headerIconBtn} type="button" onClick={back} aria-label="Back">
                  <FiArrowLeft />
                </button>
              ) : (
                <span className={styles.headerSpacer} />
              )}

              <div className={styles.headerTitle}>{activePanel.title}</div>

              <button className={styles.headerIconBtn} type="button" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>

            <div className={styles.body}>
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={activeKey}
                  custom={dir}
                  variants={panelVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {items.map((item, idx) => {
                    if (item.type === "divider") return <div key={`d-${idx}`} className={styles.divider} />;

                    if (item.type === "profile") {
                      return (
                        <button
                          key={`p-${idx}`}
                          type="button"
                          className={styles.profileRow}
                          onClick={() => handleItem(item)}
                        >
                          <span className={styles.profileIcon}>
                            {item.leftIcon}
                          </span>
                          <span className={styles.profileText}>
                            <span className={styles.profileTitle}>{item.title}</span>
                            <span className={styles.profileSub}>{item.subtitle}</span>
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={`i-${idx}`}
                        type="button"
                        className={`${styles.row} ${item.danger ? styles.rowDanger : ""}`}
                        onClick={() => handleItem(item)}
                      >
                        <span className={styles.iconCircle}>{item.leftIcon}</span>
                        <span className={styles.rowTitle}>{item.title}</span>
                        <span className={styles.rowRight}>{item.rightIcon}</span>
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}