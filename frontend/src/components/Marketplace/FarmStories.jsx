import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBookOpen } from "react-icons/fi";
import { LuLeaf } from "react-icons/lu";
import { fadeRight, fadeUp } from "../../animations/heroAnimations";
import apiClient from "../../utils/apiClient";
import styles from "./FarmStories.module.css";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStoryPreview(content, wordLimit = 25, sentenceLimit = 2) {
  if (!content) return "";

  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const previewText = sentences.slice(0, sentenceLimit).join(" ").trim();

  const words = previewText.split(/\s+/);

  if (words.length <= wordLimit) {
    return previewText;
  }

  return words.slice(0, wordLimit).join(" ") + "...";
}

const PAGE_SIZE = 4;

export default function FarmStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedStory, setSelectedStory] = useState(null);

  useEffect(() => {
    apiClient
      .get("/farm-stories/", { params: { is_published: true } })
      .then(({ data }) => {
        setStories(data.results ?? data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setSelectedStory(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loading) {
    return (
      <main className={`container ${styles.page}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading farm stories...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <motion.h1
            className={styles.title}
            variants={fadeRight(0.1)}
            initial="hidden"
            animate="visible"
          >
            Farm Stories
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            variants={fadeRight(0.2)}
            initial="hidden"
            animate="visible"
          >
            Behind-the-scenes from the producers who grow, raise and craft your
            food
          </motion.p>
        </div>

        <motion.div
          className={styles.tag}
          variants={fadeUp(0.25)}
          initial="hidden"
          animate="visible"
        >
          <LuLeaf className={styles.tagIcon} />
          <span>Straight from the farm</span>
        </motion.div>
      </header>

      <motion.p
        className={styles.resultCount}
        variants={fadeUp(0.3)}
        initial="hidden"
        animate="visible"
      >
        {stories.length} {stories.length === 1 ? "story" : "stories"}
      </motion.p>

      {error ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FiBookOpen size={32} />
          </div>
          <h3>Couldn't load stories</h3>
          <p>Please try again in a moment.</p>
        </div>
      ) : stories.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FiBookOpen size={32} />
          </div>
          <h3>No stories yet</h3>
          <p>Producers haven't shared any stories — check back soon.</p>
        </div>
      ) : (
        <>
          <motion.section
            className={styles.feed}
            variants={fadeUp(0.35)}
            initial="hidden"
            animate="visible"
          >
            {stories.slice(0, visibleCount).map((story) => (
              <article key={story.id} className={styles.card}>
                <div className={styles.imageArea}>
                  {story.image ? (
                    <img
                      src={story.image}
                      alt={story.title}
                      className={styles.cardImage}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder} />
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardMeta}>
                    <span className={styles.producerName}>
                      {story.company_name ?? `Producer #${story.producer}`}
                    </span>

                    <span className={styles.date}>
                      {formatDate(story.created_at)}
                    </span>
                  </div>

                  <h3 className={styles.storyTitle}>{story.title}</h3>

                  {story.content && (
                    <p className={styles.excerpt}>
                      {getStoryPreview(story.content)}{" "}
                      <button
                        type="button"
                        className={styles.readMoreBtn}
                        onClick={() => setSelectedStory(story)}
                      >
                        Read more
                      </button>
                    </p>
                  )}
                </div>
              </article>
            ))}
          </motion.section>

          <div className={styles.feedFooter}>
            {visibleCount < stories.length ? (
              <button
                type="button"
                className={styles.loadMoreBtn}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load more stories
              </button>
            ) : (
              <p className={styles.caughtUp}>You're all caught up</p>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {selectedStory && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setSelectedStory(null)}
          >
            <motion.div
              className={styles.storyModal}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={selectedStory.title}
            >
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedStory(null)}
                aria-label="Close story"
              >
                ×
              </button>

              {selectedStory.image && (
                <img
                  src={selectedStory.image}
                  alt={selectedStory.title}
                  className={styles.modalImage}
                />
              )}

              <div className={styles.modalContent}>
                <div className={styles.cardMeta}>
                  <span className={styles.producerName}>
                    {selectedStory.company_name ??
                      `Producer #${selectedStory.producer}`}
                  </span>

                  <span className={styles.date}>
                    {formatDate(selectedStory.created_at)}
                  </span>
                </div>

                <h2 className={styles.modalTitle}>{selectedStory.title}</h2>

                <p className={styles.modalBody}>{selectedStory.content}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}