import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBell, FiCheckCircle } from "react-icons/fi";
import styles from "../AccountMenu/AccountMenu.module.css";
import localStyles from "./NotificationMenu.module.css";

const panelVariants = {
  enter: { y: -6, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -6, opacity: 0 },
};

export default function NotificationMenu({
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  function close() {
    setOpen(false);
  }

  function handleItemClick(notification) {
    onNotificationClick?.(notification);
    close();
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={localStyles.bellBtn}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifications"
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className={localStyles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
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
              <span className={styles.headerSpacer} />
              <div className={styles.headerTitle}>Notifications</div>
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key="notifications"
                  variants={panelVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {notifications.length === 0 ? (
                    <div className={localStyles.empty}>
                      <span className={styles.iconCircle}>
                        <FiBell />
                      </span>
                      <div className={localStyles.emptyTitle}>
                        No notifications yet
                      </div>
                      <div className={localStyles.emptySub}>
                        You're all caught up. We'll let you know when something
                        new comes in.
                      </div>
                    </div>
                  ) : (
                    <>
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={`${styles.row} ${
                            !n.read ? localStyles.rowUnread : ""
                          }`}
                          onClick={() => handleItemClick(n)}
                        >
                          <span className={styles.iconCircle}>
                            <FiBell />
                          </span>
                          <span className={localStyles.notificationText}>
                            <span className={styles.rowTitle}>{n.title}</span>
                            {n.body && (
                              <span className={localStyles.notificationBody}>
                                {n.body}
                              </span>
                            )}
                            {n.created_at && (
                              <span className={localStyles.notificationTime}>
                                {new Date(n.created_at).toLocaleString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            )}
                          </span>
                          {!n.read && <span className={localStyles.dot} />}
                        </button>
                      ))}

                      {onMarkAllRead && unreadCount > 0 && (
                        <>
                          <div className={styles.divider} />
                          <button
                            type="button"
                            className={styles.row}
                            onClick={() => {
                              onMarkAllRead();
                              close();
                            }}
                          >
                            <span className={styles.iconCircle}>
                              <FiCheckCircle />
                            </span>
                            <span className={styles.rowTitle}>
                              Mark all as read
                            </span>
                            <span className={styles.rowRight} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
