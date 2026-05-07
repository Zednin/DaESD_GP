import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Fuse from "fuse.js";
import {
  FiArrowRight,
  FiBookOpen,
  FiChevronDown,
  FiHeart,
  FiSearch,
  FiSliders,
  FiX,
} from "react-icons/fi";
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

function splitParagraphs(content) {
  if (!content) return [];
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const PAGE_SIZE = 4;
const PRODUCER_ACCENT_COUNT = 6;
const HERO_PROGRESS_FULL = 0.62;
const HERO_TEXT_HOLD_END = 0.03;
const HERO_TEXT_EXIT_END = 0.22;

function getProducerName(producer) {
  return producer.company_name ?? producer.name ?? `Producer #${producer.id}`;
}

function getStoryProducerKey(story) {
  return String(story.producer ?? story.producer_id ?? story.producer_profile_id ?? "");
}

function StoryFeatureCard({
  story,
  index,
  producerName,
  onReadMore,
  onToggleLike,
  liking,
  canToggleLikes,
  getLikeLabel,
  user,
  reducedMotion,
}) {
  const cardRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start 88%", "end 12%"],
  });

  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    reducedMotion ? ["0%", "0%"] : ["-8%", "8%"]
  );
  const imageScale = useTransform(
    scrollYProgress,
    [0, 1],
    reducedMotion ? [1, 1] : [1.04, 1.12]
  );
  const panelY = useTransform(
    scrollYProgress,
    [0, 1],
    reducedMotion ? ["0%", "0%"] : ["4%", "-4%"]
  );

  return (
    <motion.article
      ref={cardRef}
      className={`${styles.storyFeature} ${index % 2 === 1 ? styles.storyFeatureAlt : ""}`}
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.storyVisualWrap}>
        <div className={styles.storyVisualOverlay} aria-hidden="true" />

        {story.image ? (
          <motion.img
            src={story.image}
            alt={story.title}
            className={styles.storyVisual}
            style={{ y: imageY, scale: imageScale }}
          />
        ) : (
          <div className={styles.storyVisualPlaceholder} />
        )}

        <div className={styles.storyChipRow}>
          <span className={styles.storyChip}>{formatDate(story.created_at)}</span>
        </div>
      </div>

      <motion.div className={styles.storyPanel} style={{ y: panelY }}>
        <div className={styles.storyMetaLine}>
          <span className={styles.storyProducer}>{producerName}</span>
          <span className={styles.storyDate}>{formatDate(story.created_at)}</span>
        </div>

        <h3 className={styles.storyTitle}>{story.title}</h3>

        {story.content && <p className={styles.storyExcerpt}>{getStoryPreview(story.content, 38, 2)}</p>}

        <div className={styles.storyActionsRow}>
          <button
            type="button"
            className={styles.storyReadMoreBtn}
            onClick={() => onReadMore(story)}
            aria-label={`Read full story: ${story.title}`}
          >
            Read full article
            <FiArrowRight aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`${styles.likeButton} ${story.liked_by_me ? styles.likeButtonActive : ""}`}
            onClick={() => onToggleLike(story)}
            disabled={liking || !canToggleLikes}
            aria-pressed={Boolean(story.liked_by_me)}
            title={
              user?.account_type && user.account_type !== "customer"
                ? "Only customers can like farm stories"
                : undefined
            }
          >
            <FiHeart aria-hidden="true" />
            <span className={styles.likeLabel}>{story.liked_by_me ? "Liked" : "Like"}</span>
            <span className={styles.likeCount}>{getLikeLabel(story)}</span>
          </button>
        </div>
      </motion.div>
    </motion.article>
  );
}

export default function FarmStories() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

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
  const [heroNavOffset, setHeroNavOffset] = useState(0);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  

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

  const producerNameById = useMemo(() => {
    const nameMap = new Map();
    for (const producer of producers) {
      nameMap.set(String(producer.id), getProducerName(producer));
    }
    return nameMap;
  }, [producers]);

  const storyCountByProducer = useMemo(() => {
    const countMap = new Map();
    for (const story of stories) {
      const key = getStoryProducerKey(story);
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }
    return countMap;
  }, [stories]);

  const visibleProducers = useMemo(() => {
    const query = producerSearch.trim();
    if (!query) return producers;
    return producerFuse.search(query).map((result) => result.item);
  }, [producerFuse, producerSearch, producers]);

  const filteredStories = useMemo(() => {
    if (!selectedFeedProducer) return stories;
    return stories.filter((story) => getStoryProducerKey(story) === selectedFeedProducer);
  }, [selectedFeedProducer, stories]);

  const visibleStories = useMemo(
    () => filteredStories.slice(0, visibleCount),
    [filteredStories, visibleCount]
  );

  const selectedFeedProducerName = useMemo(() => {
    if (!selectedFeedProducer) return "";
    return producerNameById.get(selectedFeedProducer) ?? "";
  }, [producerNameById, selectedFeedProducer]);

  const highlightedStory = useMemo(
    () => filteredStories[0] ?? stories[0] ?? null,
    [filteredStories, stories]
  );

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
        setFeedFilterOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function measureNavOffset() {
      const nav = document.querySelector("nav");
      if (!nav) {
        setHeroNavOffset(0);
        return;
      }

      const navStyles = window.getComputedStyle(nav);
      const isOverlayNav =
        navStyles.position === "fixed" || navStyles.position === "sticky";

      setHeroNavOffset(
        isOverlayNav ? Math.ceil(nav.getBoundingClientRect().height) : 0
      );
    }

    measureNavOffset();
    window.addEventListener("resize", measureNavOffset);
    return () => window.removeEventListener("resize", measureNavOffset);
  }, []);

  function getProducerLabelForStory(story) {
    return story.company_name ?? producerNameById.get(getStoryProducerKey(story)) ?? `Producer #${story.producer}`;
  }

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

  const heroScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    bodyScrollRef.current = document.body;
  }, []);

  const { scrollYProgress: heroScrollProgressRaw } = useScroll({
    container: bodyScrollRef,
    target: heroScrollRef,
    offset: [`start ${heroNavOffset}px`, `end ${heroNavOffset}px`],
    trackContentSize: true,
  });
  const heroScrollProgressSmooth = useSpring(heroScrollProgressRaw, {
    stiffness: 320,
    damping: 34,
    mass: 0.12,
  });

  const heroImageScale = useTransform(
    heroScrollProgressSmooth,
    [0, HERO_PROGRESS_FULL],
    reducedMotion ? [1, 1] : [1, 1.32]
  );

  const heroImageY = useTransform(
    heroScrollProgressSmooth,
    [0, HERO_PROGRESS_FULL],
    reducedMotion ? [0, 0] : [0, -36]
  );

  const heroImageBlurAmount = useTransform(
    heroScrollProgressSmooth,
    [0, HERO_PROGRESS_FULL],
    reducedMotion ? [0, 0] : [0, 8]
  );
  const heroImageBlur = useMotionTemplate`blur(${heroImageBlurAmount}px)`;

  const heroTextOpacity = useTransform(
    heroScrollProgressSmooth,
    [0, HERO_TEXT_HOLD_END, HERO_TEXT_EXIT_END],
    reducedMotion ? [1, 1, 1] : [1, 1, 0]
  );

  const heroTextY = useTransform(
    heroScrollProgressSmooth,
    [0, HERO_TEXT_HOLD_END, HERO_TEXT_EXIT_END],
    reducedMotion ? [0, 0, 0] : [0, -20, -210]
  );

  const heroOverlayOpacity = useTransform(
    heroScrollProgressSmooth,
    [0, HERO_PROGRESS_FULL],
    reducedMotion ? [0.12, 0.12] : [0.1, 0.72]
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.heroScrollScene}>
          <header className={`${styles.hero} ${styles.heroLoading}`}>
            <div className={styles.heroImageFallback} aria-hidden="true" />
            <div className={styles.heroOverlay} aria-hidden="true" />

            <div className={styles.heroContent}>
              <p className={styles.heroEyebrow}>Editorial Discovery</p>
              <h1 className={styles.heroTitle}>
                Explore The Stories Behind Every Local Harvest
              </h1>
              <p className={styles.heroSubtitle}>
                Loading producer stories...
              </p>
            </div>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section
        ref={heroScrollRef}
        className={styles.heroScrollScene}
        style={{ "--hero-nav-offset": `${heroNavOffset}px` }}
      >
        <motion.header className={styles.hero}>
          <div className={styles.heroMedia}>
            <motion.div
              className={styles.heroImageFallback}
              aria-hidden="true"
              animate={{ opacity: heroVideoReady ? 0 : 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            <motion.video
              className={styles.heroImage}
              autoPlay
              muted
              loop
              playsInline
              initial={{ opacity: 0 }}
              animate={{ opacity: heroVideoReady ? 1 : 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              onCanPlay={() => setHeroVideoReady(true)}
            >
              <source
                src="https://res.cloudinary.com/drwmcduef/video/upload/v1778143348/8540470-hd_1920_1080_30fps_oswpmw.mp4"
                type="video/mp4"
              />
            </motion.video>
          </div>

          <motion.div
            className={styles.heroOverlay}
            style={{ opacity: heroOverlayOpacity }}
            aria-hidden="true"
          />

          <motion.div
            className={styles.heroContent}
            style={{
              opacity: heroTextOpacity,
              y: heroTextY,
            }}
          >
            <p className={styles.heroEyebrow}>Editorial Discovery</p>

            <h1 className={styles.heroTitle}>
              Explore The Stories Behind Every Local Harvest
            </h1>

            <p className={styles.heroSubtitle}>
              A living magazine of Bristol’s farms, bakers, butchers, dairy makers and
              small-batch producers. Follow the people shaping your food, one story at a
              time.
            </p>

            {highlightedStory && (
              <button
                type="button"
                className={styles.heroFeatureBtn}
                onClick={() => setSelectedStory(highlightedStory)}
              >
                <span className={styles.heroFeatureLabel}>Featured story</span>
                <strong>{highlightedStory.title}</strong>
                <span className={styles.heroFeatureMeta}>
                  {getProducerLabelForStory(highlightedStory)} ·{" "}
                  {formatDate(highlightedStory.created_at)}
                </span>
              </button>
            )}
          </motion.div>
        </motion.header>
      </section>

      <section className={`container ${styles.discoveryLayout}`}>
        <aside className={styles.producerRailWrap} aria-labelledby="producer-strip-title">
          <div className={styles.producerRailSticky}>
            <div className={styles.producerRailHead}>
              <div>
                <h2 id="producer-strip-title">Producer Channels</h2>
                <p>Search and switch the feed by producer while keeping profile links nearby.</p>
              </div>
              <span className={styles.producerCountPill}>
                {visibleProducers.length} / {producers.length}
              </span>
            </div>

            <div className={styles.producerSearchWrap}>
              <FiSearch className={styles.searchIcon} aria-hidden="true" />
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
              <div className={styles.channelList}>
                {visibleProducers.map((producer) => {
                  const producerKey = String(producer.id);
                  const active = selectedFeedProducer === producerKey;
                  const storyCount = storyCountByProducer.get(producerKey) ?? 0;

                  return (
                    <article
                      key={producer.id}
                      className={`${styles.channelCard} ${
                        styles[`producerAccent${producer.id % PRODUCER_ACCENT_COUNT}`]
                      } ${active ? styles.channelCardActive : ""}`}
                    >
                      <div className={styles.channelBody}>
                        <p className={styles.channelKicker}>Channel</p>
                        <h3>{getProducerName(producer)}</h3>
                        <p className={styles.channelMeta}>
                          {storyCount} {storyCount === 1 ? "story" : "stories"}
                          {active ? " · Active in feed" : ""}
                        </p>
                      </div>

                      <div className={styles.channelActions}>
                        <button
                          type="button"
                          className={styles.channelFilterBtn}
                          aria-pressed={active}
                          onClick={() => setSelectedFeedProducer(active ? "" : producerKey)}
                        >
                          {active ? "Selected" : "Show in feed"}
                        </button>

                        <Link
                          to={`/producer/${producer.id}`}
                          state={{
                            from: {
                              pathname: location.pathname,
                              search: location.search,
                              hash: location.hash,
                            },
                            fromLabel: "Explore",
                          }}
                          className={styles.channelProfileLink}
                        >
                          Profile <FiArrowRight aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className={styles.feedColumn} aria-labelledby="feed-title">
          <div className={styles.feedHeaderRow}>
            <div>
              <p className={styles.resultCount}>
                Feed · {filteredStories.length} {filteredStories.length === 1 ? "story" : "stories"}
              </p>
              <h2 id="feed-title" className={styles.feedTitle}>
                Producer Story Feed
              </h2>
            </div>

            <div className={styles.feedControls}>
              <div className={styles.feedFilterWrapper} ref={feedFilterRef}>
                <button
                  type="button"
                  className={`${styles.filterTrigger} ${feedFilterOpen ? styles.filterTriggerOpen : ""}`}
                  onClick={() => setFeedFilterOpen((open) => !open)}
                  aria-expanded={feedFilterOpen}
                  aria-label="Open feed filters"
                >
                  <FiSliders className={styles.filterIcon} />
                  <span>Filter feed</span>
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
                      initial={reducedMotion ? false : { opacity: 0, y: -10, scale: 0.97 }}
                      animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <div className={styles.filterSection}>
                        <p className={styles.filterSectionLabel}>Producer Channel</p>
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
                            All stories
                          </button>

                          {producers.map((producer) => {
                            const value = String(producer.id);
                            const active = selectedFeedProducer === value;

                            return (
                              <button
                                key={producer.id}
                                type="button"
                                className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
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
                          Clear filter (1)
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedFeedProducerName && (
                <span className={styles.activeFilterText}>
                  Active channel: <strong>{selectedFeedProducerName}</strong>
                </span>
              )}
            </div>
          </div>

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
              <p>Producers haven't shared any stories for this filter yet.</p>
            </div>
          ) : (
            <>
              <section className={styles.storyStack}>
                {visibleStories.map((story, index) => (
                  <StoryFeatureCard
                    key={story.id}
                    story={story}
                    index={index}
                    producerName={getProducerLabelForStory(story)}
                    onReadMore={setSelectedStory}
                    onToggleLike={handleToggleLike}
                    liking={likingStoryIds.has(story.id)}
                    canToggleLikes={canToggleLikes()}
                    getLikeLabel={getLikeLabel}
                    user={user}
                    reducedMotion={Boolean(reducedMotion)}
                  />
                ))}
              </section>

              <div className={styles.feedFooter}>
                {visibleCount < filteredStories.length ? (
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  >
                    Load more stories
                  </button>
                ) : (
                  <p className={styles.caughtUp}>You're all caught up for now.</p>
                )}
              </div>
            </>
          )}
        </section>
      </section>

      <AnimatePresence>
        {selectedStory && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setSelectedStory(null)}
          >
            <motion.article
              className={styles.storyModal}
              initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.985 }}
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
                <FiX />
              </button>

              {selectedStory.image && (
                <figure className={styles.modalHeroMedia}>
                  <img
                    src={selectedStory.image}
                    alt={selectedStory.title}
                    className={styles.modalImage}
                  />
                  <figcaption className={styles.modalHeroMeta}>
                    {getProducerLabelForStory(selectedStory)} · {formatDate(selectedStory.created_at)}
                  </figcaption>
                </figure>
              )}

              <div className={styles.modalContent}>
                <div className={styles.modalKicker}>Farm Story</div>
                <h2 className={styles.modalTitle}>{selectedStory.title}</h2>

                <div className={styles.modalBodyWrap}>
                  {splitParagraphs(selectedStory.content).map((paragraph, idx) => (
                    <p key={`${selectedStory.id}-${idx}`} className={styles.modalBody}>
                      {paragraph}
                    </p>
                  ))}

                  {!splitParagraphs(selectedStory.content).length && (
                    <p className={styles.modalBody}>{selectedStory.content}</p>
                  )}
                </div>

                <button
                  type="button"
                  className={`${styles.likeButton} ${styles.modalLikeButton} ${
                    selectedStory.liked_by_me ? styles.likeButtonActive : ""
                  }`}
                  onClick={() => handleToggleLike(selectedStory)}
                  disabled={likingStoryIds.has(selectedStory.id) || !canToggleLikes()}
                  aria-pressed={Boolean(selectedStory.liked_by_me)}
                  title={
                    user?.account_type && user.account_type !== "customer"
                      ? "Only customers can like farm stories"
                      : undefined
                  }
                >
                  <FiHeart aria-hidden="true" />
                  <span className={styles.likeLabel}>{selectedStory.liked_by_me ? "Liked" : "Like"}</span>
                  <span className={styles.likeCount}>{getLikeLabel(selectedStory)}</span>
                </button>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
