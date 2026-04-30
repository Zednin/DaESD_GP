import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

const PAGE_SIZE = 4;

export default function FarmStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
            Behind-the-scenes from the producers who grow, raise and craft your food
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
          <div className={styles.emptyIcon}><FiBookOpen size={32} /></div>
          <h3>Couldn't load stories</h3>
          <p>Please try again in a moment.</p>
        </div>
      ) : stories.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><FiBookOpen size={32} /></div>
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
                    <p className={styles.excerpt}>{story.content}</p>
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
    </main>
  );
}
