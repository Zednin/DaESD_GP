import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronRight, FiArrowLeft, FiLogOut, FiHelpCircle, FiMoon, FiSettings, FiUser } from "react-icons/fi";
import styles from "./AccountMenu.module.css";
import { useNavigate } from "react-router-dom";

const panels = {
  root: {
    title: "Account",
    items: ({ user }) => {
      const baseItems = [
        user
          ? {
              type: "profile",
              leftIcon: <FiUser />,
              title: user?.username || user?.email || "Account",
              subtitle: "See your profile",
              onClick: () => console.log("go profile"),
            }
          : {
              type: "profile",
              leftIcon: <FiUser />,
              title: "Sign in",
              subtitle: "Sign in to your account",
              action: "signin",
            },

        { type: "divider" },
      ];

      const authOnlyItems = user
        ? [
            {
              leftIcon: <FiSettings />,
              title: "Settings & privacy",
              rightIcon: <FiChevronRight />,
              toPanel: "settings",
            },
          ]
        : [];

      const sharedItems = [
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
      ];

      const logoutItem = user
        ? [
            { type: "divider" },
            {
              leftIcon: <FiLogOut />,
              title: "Log out",
              danger: true,
              action: "logout",
            },
          ]
        : [];

      return [
        ...baseItems,
        ...authOnlyItems,
        ...sharedItems,
        ...logoutItem,
      ];
    },
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
      {
        type: "darkmode",
        title: "Dark mode",
        subtitle:
          "Adjust the appearance of BRFN to reduce glare and give your eyes a break.",
      },
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
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") || "auto"; // "auto" default
  });

  const activeKey = stack[stack.length - 1];
  const activePanel = panels[activeKey];
  const canBack = stack.length > 1;

  const navigate = useNavigate();

  function handleSignIn() {
    close();
    navigate("/login");
  }

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

 useEffect(() => {
    localStorage.setItem("theme", darkMode);

    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
    const isDark = darkMode === "auto" ? mq.matches : darkMode === "on";

    // enable transitions just for the switch moment
    root.classList.add("theme-animate");
    root.dataset.theme = isDark ? "dark" : "light";

    window.clearTimeout(root.__themeTimer);
    root.__themeTimer = window.setTimeout(() => {
      root.classList.remove("theme-animate");
    }, 260);
  };

  apply();

  if (darkMode === "auto") {
    const onChange = () => apply();
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }
}, [darkMode]);

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

    if (item.action === "signin") {
      close();
      navigate("/login");
      return;
    }

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
        {user ? (user.username?.[0] || user.email?.[0]).toUpperCase() : <FiUser />}
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

                    if (item.type === "darkmode") {
                    const options = [
                        { key: "off", label: "Off" },
                        { key: "on", label: "On" },
                        { key: "auto", label: "Automatic", hint: "We’ll automatically adjust the display based on your device’s system settings." },
                    ];

                    return (
                        <div key={`dm-${idx}`} className={styles.darkModeBlock}>
                        {/* Title row with icon */}
                        <div className={styles.darkModeHead}>
                            <span className={styles.darkModeIconCircle}>
                            <FiMoon />
                            </span>
                            <div className={styles.darkModeHeadText}>
                            <div className={styles.darkModeTitle}>{item.title}</div>
                            <div className={styles.darkModeSub}>{item.subtitle}</div>
                            </div>
                        </div>

                        {/* Options */}
                        <div className={styles.darkModeOptions}>
                            {options.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                className={styles.darkModeRow}
                                onClick={() => setDarkMode(opt.key)}
                            >
                                <div className={styles.darkModeRowText}>
                                <div className={styles.darkModeRowLabel}>{opt.label}</div>
                                {opt.hint && opt.key === "auto" && (
                                    <div className={styles.darkModeHint}>{opt.hint}</div>
                                )}
                                </div>

                                <span
                                className={`${styles.radio} ${darkMode === opt.key ? styles.radioOn : ""}`}
                                aria-hidden="true"
                                />
                            </button>
                            ))}
                        </div>
                        </div>
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