import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiGrid, FiList } from "react-icons/fi";

import apiClient from "../../utils/apiClient";
import { fadeUp } from "../../animations/heroAnimations";

import productStyles from "../../pages/Products.module.css";
import styles from "../../pages/ProducerDetail.module.css";

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPreview(content, wordLimit = 25) {
  if (!content) return "";

  const words = content.split(/\s+/);

  if (words.length <= wordLimit) return content;

  return words.slice(0, wordLimit).join(" ") + "...";
}

function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div className={productStyles.viewToggle}>
      <button
        type="button"
        className={`${productStyles.viewBtn} ${
          viewMode === "grid" ? productStyles.viewBtnActive : ""
        }`}
        onClick={() => setViewMode("grid")}
        aria-label="Grid view"
      >
        <FiGrid />
      </button>

      <button
        type="button"
        className={`${productStyles.viewBtn} ${
          viewMode === "list" ? productStyles.viewBtnActive : ""
        }`}
        onClick={() => setViewMode("list")}
        aria-label="List view"
      >
        <FiList />
      </button>
    </div>
  );
}

export default function ProducerStoriesDetail({ producerId }) {
  const [stories, setStories] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);

  useEffect(() => {
    async function loadStories() {
      try {
        setLoading(true);

        const { data } = await apiClient.get("/farm-stories/", {
          params: {
            producer: producerId,
            is_published: true,
          },
        });

        setStories(data.results ?? data);
      } catch (err) {
        console.error("Failed to load farm stories:", err);
        setStories([]);
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, [producerId]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setSelectedStory(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loading) return <p>Loading farm stories...</p>;

  return (
    <section>
      <div className={productStyles.toolbar}>
        <p className={productStyles.resultCount}>
          {stories.length} {stories.length === 1 ? "story" : "stories"} found
        </p>

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {stories.length ? (
        viewMode === "grid" ? (
          <motion.div
            className={productStyles.grid}
            variants={fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            {stories.map((story) => (
              <article
                key={story.id}
                className={productStyles.card}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStory(story)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedStory(story);
                  }
                }}
                aria-label={`Read farm story ${story.title}`}
              >
                <div className={productStyles.imagePlaceholder}>
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.title}
                      className={productStyles.cardImage}
                    />
                  )}
                </div>

                <div className={productStyles.cardBody}>
                  <h3>{story.title}</h3>
                  {story.content && <p>{getPreview(story.content)}</p>}
                  {story.created_at && (
                    <p className={styles.cardDate}>
                      {formatDate(story.created_at)}
                    </p>
                  )}
                  <button type="button" className={styles.readMoreBtn}>
                    Read story
                  </button>
                </div>
              </article>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className={productStyles.list}
            variants={fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            {stories.map((story) => (
              <article
                key={story.id}
                className={productStyles.listCard}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStory(story)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedStory(story);
                  }
                }}
                aria-label={`Read farm story ${story.title}`}
              >
                <div className={productStyles.listImagePlaceholder}>
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.title}
                      className={productStyles.listImage}
                    />
                  )}
                </div>

                <div className={productStyles.listBody}>
                  <h3>{story.title}</h3>
                  {story.content && <p>{getPreview(story.content)}</p>}
                  {story.created_at && (
                    <p className={styles.cardDate}>
                      {formatDate(story.created_at)}
                    </p>
                  )}
                </div>

                <button type="button" className={productStyles.listQuickAddBtn}>
                  Read story
                </button>
              </article>
            ))}
          </motion.div>
        )
      ) : (
        <p>No farm stories shared yet.</p>
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
              className={styles.contentModal}
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
                <p className={styles.modalEyebrow}>Farm story</p>
                <h2>{selectedStory.title}</h2>

                {selectedStory.created_at && (
                  <p className={styles.modalDate}>
                    {formatDate(selectedStory.created_at)}
                  </p>
                )}

                {selectedStory.content && <p>{selectedStory.content}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}