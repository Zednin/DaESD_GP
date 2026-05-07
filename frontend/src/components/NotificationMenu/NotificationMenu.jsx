import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBell, FiCheckCircle, FiX } from "react-icons/fi";
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
  onClearNotification,
}) {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const wrapRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onMouseDown(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectedNotification(null);
      }
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

  async function handleItemClick(notification) {
    setSelectedNotification(notification);
    await onNotificationClick?.(notification);
  }

  async function handleMarkAllReadClick() {
    await onMarkAllRead?.();
    setSelectedNotification(null);
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
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 24,
              mass: 0.8,
            }}
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

            <div className={`${styles.body} ${localStyles.notificationBodyWrap}`}>
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
                      <div className={localStyles.notificationList}>
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`${styles.row} ${localStyles.notificationRow} ${
                              !n.read ? localStyles.rowUnread : ""
                            }`}
                          >
                            <button
                              type="button"
                              className={localStyles.notificationMainBtn}
                              onClick={() => handleItemClick(n)}
                            >
                              <span className={styles.iconCircle}>
                                <FiBell />
                              </span>

                              <span className={localStyles.notificationText}>
                                <span className={styles.rowTitle}>{n.title}</span>

                                {n.body && (
                                  <span className={localStyles.notificationBody}>
                                    {String(n.body).split("---PRODUCER_CONTACT---")[0].trim()}
                                  </span>
                                )}

                                {n.created_at && (
                                  <span className={localStyles.notificationTime}>
                                    {new Date(n.created_at).toLocaleString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </span>

                              {!n.read && <span className={localStyles.dot} />}
                            </button>

                            <button
                              type="button"
                              className={localStyles.clearNotificationBtn}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await onClearNotification?.(n);
                              }}
                              aria-label="Clear notification"
                              title="Clear notification"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                      </div>

                      {onMarkAllRead && notifications.length > 0 && (
                        <>
                          <div className={styles.divider} />
                          <button
                            type="button"
                            className={styles.row}
                            onClick={handleMarkAllReadClick}
                          >
                            <span className={styles.iconCircle}>
                              <FiCheckCircle />
                            </span>
                            <span className={styles.rowTitle}>
                              Clear all notifications
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

      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            className={localStyles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              className={localStyles.modal}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={localStyles.modalHeader}>
                <div>
                  <p className={localStyles.modalEyebrow}>Notification</p>
                  <h3>{selectedNotification.title}</h3>
                </div>

                <button
                  type="button"
                  className={localStyles.modalClose}
                  onClick={() => setSelectedNotification(null)}
                  aria-label="Close notification"
                >
                  <FiX />
                </button>
              </div>

              {selectedNotification.created_at && (
                <p className={localStyles.modalTime}>
                  {new Date(selectedNotification.created_at).toLocaleString(
                    "en-GB",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              )}

              <NotificationBody body={selectedNotification.body} />

              <div className={localStyles.modalActions}>
                {selectedNotification.link && (
                  <button
                    type="button"
                    className={localStyles.modalPrimaryBtn}
                    onClick={() => {
                      setSelectedNotification(null);
                      close();
                      window.location.href = "/my-account";
                    }}
                  >
                    View My Orders
                  </button>
                )}

                <button
                  type="button"
                  className={localStyles.modalSecondaryBtn}
                  onClick={() => setSelectedNotification(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationBody({ body }) {
  const [mainText, contactText] = String(body || "").split("---PRODUCER_CONTACT---");

  const contactLines = (contactText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const contact = contactLines.reduce((acc, line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return acc;
    acc[key.trim().toLowerCase()] = rest.join(":").trim();
    return acc;
  }, {});

  return (
    <>
      <p className={localStyles.modalBody}>
        {mainText.trim() || "No extra details provided."}
      </p>

      {contactLines.length > 0 && (
        <div className={localStyles.producerContactBox}>
          <p className={localStyles.producerContactTitle}>Producer Contact</p>

          {contact.producer && (
            <div className={localStyles.producerContactRow}>
              <span>Producer</span>
              <strong>{contact.producer}</strong>
            </div>
          )}

          {contact.email && (
            <div className={localStyles.producerContactRow}>
              <span>Email</span>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </div>
          )}

          {contact.phone && (
            <div className={localStyles.producerContactRow}>
              <span>Phone</span>
              <a href={`tel:${contact.phone}`}>{contact.phone}</a>
            </div>
          )}
        </div>
      )}
    </>
  );
}