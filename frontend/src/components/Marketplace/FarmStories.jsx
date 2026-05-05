import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Fuse from "fuse.js";
import { FiBookOpen, FiChevronDown, FiHeart, FiSearch, FiSliders, FiX } from "react-icons/fi";
import { fadeRight, fadeUp } from "../../animations/heroAnimations";
import { useAuth } from "../../auth/AuthContext";
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
const PRODUCER_ACCENT_COUNT = 6;

function getProducerName(producer) {
  return producer.company_name ?? producer.name ?? `Producer #${producer.id}`;
}

function getStoryProducerKey(story) {
  return String(story.producer ?? story.producer_id ?? story.producer_profile_id ?? "");
}

export default function FarmStories() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [producers, setProducers] = useState([]);
  const [producerSearchInput, setProducerSearchInput] = useState("");
  const [producerSearch, setProducerSearch] = useState("");
  const [selectedFeedProducer, setSelectedFeedProducer] = useState("");
  const [feedFilterOpen, setFeedFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [producerError, setProducerError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedStory, setSelectedStory] = useState(null);
  const [likingStoryIds, setLikingStoryIds] = useState(() => new Set());
  const feedFilterRef = useRef(null);

  const producerFuse = useMemo(
    () =>
      new Fuse(producers, {
        keys: ["company_name", "name", "company_description"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [producers]
  );

  const visibleProducers = useMemo(() => {
    const query = producerSearch.trim();
    if (!query) return producers;
    return producerFuse.search(query).map((result) => result.item);
  }, [producerFuse, producerSearch, producers]);

  const filteredStories = useMemo(() => {
    if (!selectedFeedProducer) return stories;
    return stories.filter((story) => getStoryProducerKey(story) === selectedFeedProducer);
  }, [selectedFeedProducer, stories]);

  const selectedFeedProducerName = useMemo(() => {
    if (!selectedFeedProducer) return "";
    const producer = producers.find((p) => String(p.id) === selectedFeedProducer);
    return producer ? getProducerName(producer) : "";
  }, [producers, selectedFeedProducer]);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get("/farm-stories/", { params: { is_published: true } }),
      apiClient.get("/producers/"),
    ])
      .then(([storiesResult, producersResult]) => {
        if (storiesResult.status === "fulfilled") {
          const { data } = storiesResult.value;
          setStories(data.results ?? data);
          setError(null);
        } else {
          setError(storiesResult.reason);
        }

        if (producersResult.status === "fulfilled") {
          const { data } = producersResult.value;
          setProducers(data.results ?? data);
          setProducerError(null);
        } else {
          setProducerError(producersResult.reason);
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setProducerSearch(producerSearchInput), 250);
    return () => clearTimeout(timer);
  }, [producerSearchInput]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedFeedProducer]);

  useEffect(() => {
    function handleOutside(e) {
      if (feedFilterRef.current && !feedFilterRef.current.contains(e.target)) {
        setFeedFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
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

  function updateStoryLike(storyId, likeData) {
    setStories((currentStories) =>
      currentStories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              liked_by_me: likeData.liked_by_me,
              like_count: likeData.like_count,
            }
          : story
      )
    );

    setSelectedStory((story) =>
      story?.id === storyId
        ? {
            ...story,
            liked_by_me: likeData.liked_by_me,
            like_count: likeData.like_count,
          }
        : story
    );
  }

  async function handleToggleLike(story) {
    if (!user) {
      const next = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    if (user.account_type !== "customer") {
      return;
    }

    setLikingStoryIds((current) => new Set(current).add(story.id));

    try {
      const { data } = await apiClient.post(`/farm-stories/${story.id}/toggle-like/`);
      updateStoryLike(story.id, data);
    } catch (err) {
      console.error("Failed to toggle farm story like:", err);
    } finally {
      setLikingStoryIds((current) => {
        const next = new Set(current);
        next.delete(story.id);
        return next;
      });
    }
  }

  function getLikeLabel(story) {
    const count = Number(story.like_count ?? 0);
    return `${count} ${count === 1 ? "like" : "likes"}`;
  }

  function canToggleLikes() {
    return !user || user.account_type === "customer";
  }

  if (loading) {
    return (
      <main className={`container ${styles.page}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading explore...</p>
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
            Explore
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            variants={fadeRight(0.2)}
            initial="hidden"
            animate="visible"
          >
            
          </motion.p>
        </div>

      </header>

      <motion.section
        className={styles.producerSection}
        variants={fadeUp(0.3)}
        initial="hidden"
        animate="visible"
        aria-labelledby="producer-strip-title"
      >
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="producer-strip-title">Producers</h2>
            <p>Search by producer name</p>
          </div>
          <span>
            {visibleProducers.length} of {producers.length}
          </span>
        </div>

        <div className={styles.producerSearchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            className={styles.producerSearch}
            type="text"
            placeholder="Search producers..."
            value={producerSearchInput}
            onChange={(e) => setProducerSearchInput(e.target.value)}
            aria-label="Search producers"
          />
          {producerSearchInput && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setProducerSearchInput("")}
              aria-label="Clear producer search"
            >
              <FiX />
            </button>
          )}
        </div>

        {producerError ? (
          <p className={styles.stripNote}>Producer list is unavailable right now.</p>
        ) : producers.length === 0 ? (
          <p className={styles.stripNote}>No producers to show yet.</p>
        ) : visibleProducers.length === 0 ? (
          <p className={styles.stripNote}>No producers match that search.</p>
        ) : (
          <div className={styles.producerRail}>
            <div className={styles.producerStrip}>
              {visibleProducers.map((producer) => (
                <Link
                  key={producer.id}
                  to={`/producer/${producer.id}`}
                  state={{
                    from: {
                      pathname: location.pathname,
                      search: location.search,
                      hash: location.hash,
                    },
                    fromLabel: "Explore",
                  }}
                  className={`${styles.producerBox} ${
                    styles[`producerAccent${producer.id % PRODUCER_ACCENT_COUNT}`]
                  }`}
                >
                  <span>{getProducerName(producer)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      <motion.p
        className={styles.resultCount}
        variants={fadeUp(0.35)}
        initial="hidden"
        animate="visible"
      >
        Feed - {filteredStories.length}{" "}
        {filteredStories.length === 1 ? "story" : "stories"}
      </motion.p>

      <motion.div
        className={styles.feedControls}
        variants={fadeUp(0.38)}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.feedFilterWrapper} ref={feedFilterRef}>
          <button
            type="button"
            className={`${styles.filterTrigger} ${
              feedFilterOpen ? styles.filterTriggerOpen : ""
            }`}
            onClick={() => setFeedFilterOpen((open) => !open)}
            aria-expanded={feedFilterOpen}
          >
            <FiSliders className={styles.filterIcon} />
            <span>Filters</span>
            {selectedFeedProducer && <span className={styles.filterBadge}>1</span>}
            <motion.span
              className={styles.filterChevron}
              animate={{ rotate: feedFilterOpen ? 180 : 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <FiChevronDown />
            </motion.span>
          </button>

          <AnimatePresence>
            {feedFilterOpen && (
              <motion.div
                className={styles.filterPanel}
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className={styles.filterSection}>
                  <p className={styles.filterSectionLabel}>Producer</p>
                  <div className={styles.filterChips}>
                    <button
                      type="button"
                      className={`${styles.filterChip} ${
                        !selectedFeedProducer ? styles.filterChipActive : ""
                      }`}
                      onClick={() => {
                        setSelectedFeedProducer("");
                        setFeedFilterOpen(false);
                      }}
                    >
                      All
                    </button>

                    {producers.map((producer) => {
                      const value = String(producer.id);
                      const active = selectedFeedProducer === value;

                      return (
                        <button
                          key={producer.id}
                          type="button"
                          className={`${styles.filterChip} ${
                            active ? styles.filterChipActive : ""
                          }`}
                          onClick={() => {
                            setSelectedFeedProducer(active ? "" : value);
                            setFeedFilterOpen(false);
                          }}
                        >
                          {getProducerName(producer)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedFeedProducer && (
                  <button
                    type="button"
                    className={styles.filterClearBtn}
                    onClick={() => {
                      setSelectedFeedProducer("");
                      setFeedFilterOpen(false);
                    }}
                  >
                    Clear all filters (1)
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedFeedProducerName && (
          <span className={styles.activeFilterText}>
            Showing {selectedFeedProducerName}
          </span>
        )}
      </motion.div>

      {error ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FiBookOpen size={32} />
          </div>
          <h3>Couldn't load stories</h3>
          <p>Please try again in a moment.</p>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FiBookOpen size={32} />
          </div>
          <h3>No stories found</h3>
          <p>Producers haven't shared any stories — check back soon.</p>
        </div>
      ) : (
        <>
          <motion.section
            className={styles.feed}
            variants={fadeUp(0.4)}
            initial="hidden"
            animate="visible"
          >
            {filteredStories.slice(0, visibleCount).map((story) => (
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

                  <button
                    type="button"
                    className={`${styles.likeButton} ${
                      story.liked_by_me ? styles.likeButtonActive : ""
                    }`}
                    onClick={() => handleToggleLike(story)}
                    disabled={likingStoryIds.has(story.id) || !canToggleLikes()}
                    aria-pressed={Boolean(story.liked_by_me)}
                    title={
                      user?.account_type && user.account_type !== "customer"
                        ? "Only customers can like farm stories"
                        : undefined
                    }
                  >
                    <FiHeart />
                    <span>{getLikeLabel(story)}</span>
                  </button>
                </div>
              </article>
            ))}
          </motion.section>

          <div className={styles.feedFooter}>
            {visibleCount < filteredStories.length ? (
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

                <button
                  type="button"
                  className={`${styles.likeButton} ${styles.modalLikeButton} ${
                    selectedStory.liked_by_me ? styles.likeButtonActive : ""
                  }`}
                  onClick={() => handleToggleLike(selectedStory)}
                  disabled={
                    likingStoryIds.has(selectedStory.id) || !canToggleLikes()
                  }
                  aria-pressed={Boolean(selectedStory.liked_by_me)}
                  title={
                    user?.account_type && user.account_type !== "customer"
                      ? "Only customers can like farm stories"
                      : undefined
                  }
                >
                  <FiHeart />
                  <span>{getLikeLabel(selectedStory)}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
