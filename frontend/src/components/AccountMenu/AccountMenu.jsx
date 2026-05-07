import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiChevronRight,
  FiArrowLeft,
  FiLogOut,
  FiHelpCircle,
  FiMoon,
  FiSettings,
  FiUser,
  FiGrid,
  FiFileText,
  FiMessageCircle,
  FiAlertCircle,
  FiEye,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import styles from "./AccountMenu.module.css";
import { useTheme } from "../../theme/ThemeProvider"; // adjust path if needed
import {
  applyColourblindMode,
  loadColourblindMode,
} from "../../utils/accessibilityPreferences";

const panels = {
  root: {
    title: "Account",
    items: ({ user }) => {
      const baseItems = [
        user
          ? {
              type: "profile",
              leftIcon: <FiUser />,
              title: user?.first_name || user?.email || "Account",
              subtitle: "See your profile",
              action: "profile",
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

      const dashboardItems =
        user?.account_type === "producer" || user?.account_type === "admin"
          ? [
              {
                leftIcon: <FiGrid />,
                title: "Dashboard",
                subtitle: "Manage your BRFN workspace",
                action: "dashboard",
              },
            ]
          : [];

      const authOnlyItems = user
        ? [
            ...dashboardItems,
            {
              leftIcon: <FiSettings />,
              title: "Settings & privacy",
              subtitle: "Account and data options",
              rightIcon: <FiChevronRight />,
              toPanel: "settings",
            },
          ]
        : [];

      return [
        ...baseItems,
        ...authOnlyItems,
        {
          leftIcon: <FiHelpCircle />,
          title: "Help & support",
          subtitle: "FAQ, terms and support",
          rightIcon: <FiChevronRight />,
          toPanel: "help",
        },
        {
          leftIcon: <FiMoon />,
          title: "Display & accessibility",
          subtitle: "Theme and appearance",
          rightIcon: <FiChevronRight />,
          toPanel: "display",
        },
        ...(user
          ? [
              { type: "divider" },
              {
                leftIcon: <FiLogOut />,
                title: "Log out",
                subtitle: "End your session",
                danger: true,
                action: "logout",
              },
            ]
          : []),
      ];
    },
  },

  settings: {
    title: "Settings & privacy",
    items: () => [
      {
        leftIcon: <FiSettings />,
        title: "Settings",
        subtitle: "Manage account preferences",
        onClick: () => console.log("Settings"),
      },
      {
        leftIcon: <FiUser />,
        title: "Privacy checkup",
        subtitle: "Review your data options",
        onClick: () => console.log("Privacy"),
      },
      {
        leftIcon: <FiFileText />,
        title: "Privacy shortcuts",
        subtitle: "Quick access to privacy controls",
        onClick: () => console.log("Shortcuts"),
      },
      {
        leftIcon: <FiGrid />,
        title: "Activity log",
        subtitle: "View account activity",
        onClick: () => console.log("Activity log"),
      },
    ],
  },

  help: {
    title: "Help & support",
    items: () => [
      {
        leftIcon: <FiHelpCircle />,
        title: "FAQ",
        subtitle: "Common questions about BRFN",
        action: "faq",
      },
      {
        leftIcon: <FiFileText />,
        title: "Terms & Conditions",
        subtitle: "View data use and platform terms",
        action: "terms",
      },
      {
        leftIcon: <FiMessageCircle />,
        title: "Support inbox",
        subtitle: "Coming soon",
        onClick: () => console.log("Support inbox"),
      },
      {
        leftIcon: <FiAlertCircle />,
        title: "Report a problem",
        subtitle: "Coming soon",
        onClick: () => console.log("Report"),
      },
    ],
  },

  display: {
    title: "Display & accessibility",
    items: () => [
      {
        type: "darkmode",
        title: "Dark mode",
        subtitle:
          "Adjust the appearance of BRFN to reduce glare and give your eyes a break.",
      },
      {
        type: "colourblind",
        title: "Colourblind mode",
        subtitle:
          "Use safer status colours and stronger non-colour cues for clearer UI feedback.",
      },
    ],
  },
};

const panelVariants = {
  enter: (dir) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -28 : 28, opacity: 0 }),
};

export default function AccountMenu({ user, onLogout, onOpenTerms }) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState(["root"]);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const { theme, setTheme } = useTheme();
  const [colourblindMode, setColourblindMode] = useState(() => loadColourblindMode());

  const activeKey = stack[stack.length - 1];
  const activePanel = panels[activeKey];
  const canBack = stack.length > 1;
  const dir = useMemo(() => (stack.length > 1 ? 1 : 0), [stack.length]);
  const items = activePanel.items({ user });

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
    function onStorage(e) {
      if (e.key !== "colourblindMode") return;
      setColourblindMode(loadColourblindMode());
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleColourblindToggle() {
    const nextValue = !colourblindMode;
    setColourblindMode(nextValue);
    applyColourblindMode(nextValue);
  }

  

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

    if (item.action === "profile") {
      close();

      if (user?.account_type === "producer") {
        navigate("/producer/myaccount");
      } else {
        navigate("/my-account");
      }

      return;
    }

    if (item.action === "dashboard") {
      close();

      if (user?.account_type === "admin") {
        navigate("/admin/dashboard");
      } else if (user?.account_type === "producer") {
        navigate("/producer/dashboard");
      }

      return;
    }

    if (item.action === "faq") {
      close();
      navigate("/faq");
      return;
    }

    if (item.action === "terms") {
      close();
      onOpenTerms?.();
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

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.avatarBtn}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
      >
        <span className={styles.avatarCircle}>
          {user ? (
            (user.username?.[0] || user.email?.[0]).toUpperCase()
          ) : (
            <FiUser />
          )}
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
                <button
                  className={styles.headerIconBtn}
                  type="button"
                  onClick={back}
                  aria-label="Back"
                >
                  <FiArrowLeft />
                </button>
              ) : (
                <span className={styles.headerSpacer} />
              )}

              <div className={styles.headerTitle}>{activePanel.title}</div>

              <button
                className={styles.headerIconBtn}
                type="button"
                onClick={close}
                aria-label="Close"
              >
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
                    if (item.type === "divider") {
                      return (
                        <div key={`d-${idx}`} className={styles.divider} />
                      );
                    }

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
                            <span className={styles.profileTitle}>
                              {item.title}
                            </span>
                            <span className={styles.profileSub}>
                              {item.subtitle}
                            </span>
                          </span>
                        </button>
                      );
                    }

                    if (item.type === "darkmode") {
                      const options = [
                        { key: "light", label: "Light" },
                        { key: "dark", label: "Dark" },
                        { key: "cyberpunk", label: "Cyberpunk" },
                        {
                          key: "auto",
                          label: "Automatic",
                          hint: "We’ll automatically adjust the display based on your device’s system settings.",
                        },
                      ];

                      return (
                        <div key={`dm-${idx}`} className={styles.darkModeBlock}>
                          <div className={styles.darkModeHead}>
                            <span className={styles.darkModeIconCircle}>
                              <FiMoon />
                            </span>

                            <div className={styles.darkModeHeadText}>
                              <div className={styles.darkModeTitle}>
                                {item.title}
                              </div>
                              <div className={styles.darkModeSub}>
                                {item.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className={styles.darkModeOptions}>
                            {options.map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                className={styles.darkModeRow}
                                onClick={() => setTheme(opt.key)}
                              >
                                <div className={styles.darkModeRowText}>
                                  <div className={styles.darkModeRowLabel}>
                                    {opt.label}
                                  </div>

                                  {opt.hint && opt.key === "auto" && (
                                    <div className={styles.darkModeHint}>
                                      {opt.hint}
                                    </div>
                                  )}
                                </div>

                                <span
                                  className={`${styles.radio} ${
                                    theme === opt.key ? styles.radioOn : ""
                                  }`}
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (item.type === "colourblind") {
                      return (
                        <button
                          key={`cb-${idx}`}
                          type="button"
                          className={`${styles.row} ${styles.colourblindRow}`}
                          onClick={handleColourblindToggle}
                          role="switch"
                          aria-checked={colourblindMode}
                        >
                          <span className={styles.iconCircle}>
                            <FiEye />
                          </span>

                          <span className={styles.rowText}>
                            <span className={styles.rowTitle}>{item.title}</span>
                            <span className={styles.rowSub}>{item.subtitle}</span>
                          </span>

                          <span
                            className={`${styles.colourblindToggle} ${
                              colourblindMode ? styles.colourblindToggleOn : ""
                            }`}
                            aria-hidden="true"
                          >
                            <span className={styles.colourblindToggleThumb} />
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={`i-${idx}`}
                        type="button"
                        className={`${styles.row} ${
                          item.danger ? styles.rowDanger : ""
                        }`}
                        onClick={() => handleItem(item)}
                      >
                        <span className={styles.iconCircle}>
                          {item.leftIcon}
                        </span>

                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>{item.title}</span>
                          {item.subtitle && (
                            <span className={styles.rowSub}>
                              {item.subtitle}
                            </span>
                          )}
                        </span>

                        <span className={styles.rowRight}>
                          {item.rightIcon}
                        </span>
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
