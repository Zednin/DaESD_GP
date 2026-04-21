import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuArrowUpRight,
  LuBadgeCheck,
  LuBrain,
  LuCamera,
  LuCheck,
  LuImage,
  LuRefreshCw,
  LuShieldCheck,
  LuSparkles,
  LuUpload,
  LuWandSparkles,
} from "react-icons/lu";
import styles from "./ProducerBrfnAi.module.css";

const ANALYSIS_STEPS = [
  "Uploading sample",
  "Preparing image",
  "Scanning visible texture",
  "Inspecting colour patterns",
  "Running freshness classifier",
  "Calculating spoilage score",
  "Generating BRFN AI verdict",
];

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildFakeResult(file) {
  const seed = hashString(`${file.name}-${file.size}-${file.type}`);
  const score = seed % 100;
  const isFresh = score >= 43;

  let grade = "D";
  if (score >= 86) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 54) grade = "C";

  const confidence = 76 + (seed % 21);
  const colourIntegrity = 42 + ((seed >> 1) % 50);
  const textureStability = 38 + ((seed >> 2) % 56);
  const spoilageRisk = isFresh ? 6 + (seed % 18) : 58 + (seed % 30);

  const observations = isFresh
    ? [
        "Surface texture appears consistent with fresh produce.",
        "No major spoilage signatures detected in the visible sample.",
        "Colour distribution sits within an acceptable freshness range.",
      ]
    : [
        "Visible colour decay suggests quality deterioration.",
        "Texture irregularity indicates probable spoilage progression.",
        "The sample shows elevated spoilage risk in the uploaded image.",
      ];

  const guidance = isFresh
    ? "Suitable for sale based on the visible sample. BRFN AI still recommends a final human check before listing."
    : "Manual inspection is recommended. Consider holding this batch or diverting it into a surplus decision workflow.";

  return {
    verdict: isFresh ? "Fresh" : "Rotten",
    tone: isFresh ? "fresh" : "rotten",
    grade,
    confidence,
    observations,
    guidance,
    metrics: {
      colourIntegrity,
      textureStability,
      spoilageRisk,
    },
  };
}

function MetricBar({ label, value, tone = "neutral" }) {
  return (
    <div className={styles.metricRow}>
      <div className={styles.metricTop}>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className={styles.metricTrack}>
        <motion.div
          className={`${styles.metricFill} ${styles[`metricFill--${tone}`] || ""}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function OrbVisual() {
  return (
    <div className={styles.orbScene}>
      <motion.div
        className={styles.orbPulse}
        animate={{ scale: [0.95, 1.12, 0.95], opacity: [0.22, 0.45, 0.22] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={styles.orbRing}
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className={`${styles.orbRing} ${styles.orbRingSecondary}`}
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className={styles.orbCore}
        animate={{ scale: [1, 1.06, 1], rotate: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function ProducerBrfnAi({ producerName }) {
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);

  const [phase, setPhase] = useState("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (phase !== "processing" || !file) return undefined;

    setStepIndex(0);

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 650);

    const completionTimer = setTimeout(() => {
      setResult(buildFakeResult(file));
      setPhase("complete");
    }, 5200);

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
    };
  }, [phase, file]);

  useEffect(() => {
    if (phase === "complete" && result && resultsRef.current) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [phase, result]);

  const progress = useMemo(() => {
    if (phase === "idle") return 0;
    if (phase === "uploaded") return 14;
    if (phase === "processing") {
      return Math.min(94, 18 + ((stepIndex + 1) / ANALYSIS_STEPS.length) * 76);
    }
    if (phase === "complete") return 100;
    return 0;
  }, [phase, stepIndex]);

  function handleSelectedFile(selectedFile) {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) return;

    setFile(selectedFile);
    setResult(null);
    setPhase("uploaded");
  }

  function handleInputChange(event) {
    const selectedFile = event.target.files?.[0];
    handleSelectedFile(selectedFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    handleSelectedFile(droppedFile);
  }

  function startAnalysis() {
    if (!file) return;
    setResult(null);
    setPhase("processing");
  }

  function resetFlow() {
    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setPhase("idle");
    setStepIndex(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className={styles.page}>
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>BRFN AI</span>
          <h1 className={styles.heroTitle}>AI-powered freshness intelligence for producers</h1>
          <p className={styles.heroSubtitle}>
            Upload a produce image and let BRFN AI assess freshness, spoilage risk,
            and shelf-readiness in seconds.
          </p>

          <div className={styles.heroPills}>
            <span className={styles.heroPill}>
              <LuBrain size={15} />
              Food quality screening
            </span>
            <span className={styles.heroPill}>
              <LuShieldCheck size={15} />
              Producer decision support
            </span>
          </div>

          <div className={styles.heroNote}>
            <LuArrowUpRight size={15} />
            {producerName
              ? `Active workspace: ${producerName}`
              : "Ready for producer-side AI workflows"}
          </div>
        </div>

        <div className={styles.heroVisual}>
          <OrbVisual />
        </div>
      </motion.section>

      <motion.section
        className={styles.portal}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
      >
        <div className={styles.portalHeader}>
          <div>
            <p className={styles.cardEyebrow}>Inspection portal</p>
            <h2 className={styles.portalTitle}>Run a BRFN AI freshness scan</h2>
          </div>

          {file && (
            <button type="button" className={styles.resetBtn} onClick={resetFlow}>
              <LuRefreshCw size={14} />
              Reset
            </button>
          )}
        </div>

        <div
          className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDragging : ""} ${file ? styles.uploadZoneLoaded : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handleInputChange}
          />

          {!file ? (
            <motion.div
              className={styles.uploadEmpty}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.uploadIconWrap}>
                <LuUpload size={32} />
              </div>
              <h3>Upload a produce image</h3>
              <p>
                BRFN AI inspects visible freshness signals and returns a spoilage verdict,
                confidence score, and shelf-readiness grade.
              </p>
              <div className={styles.uploadMeta}>
                <span><LuCamera size={14} /> Freshness image input</span>
                <span><LuImage size={14} /> JPG, PNG, WEBP</span>
              </div>
            </motion.div>
          ) : (
            <div className={styles.previewShell}>
              <div className={styles.previewFrame}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Uploaded produce preview"
                    className={styles.previewImage}
                  />
                )}
              </div>

              <div className={styles.previewBar}>
                <div>
                  <span className={styles.previewLabel}>Loaded sample</span>
                  <strong className={styles.previewFileName}>{file.name}</strong>
                </div>

                <div className={styles.previewActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    Replace image
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      startAnalysis();
                    }}
                    disabled={phase === "processing"}
                  >
                    Run BRFN AI
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      <AnimatePresence>
        {phase === "processing" && file && (
          <motion.div
            className={styles.processingOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <motion.div
              className={styles.processingShell}
              initial={{ opacity: 0, scale: 0.985, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.985, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className={styles.processingTop}>
                <div>
                  <p className={styles.processingEyebrow}>BRFN AI</p>
                  <h2 className={styles.processingTitle}>Analysing produce sample</h2>
                  <p className={styles.processingSubtitle}>
                    Inspecting visible freshness signals and spoilage indicators.
                  </p>
                </div>

                <div className={styles.processingProgressPill}>
                  {Math.round(progress)}%
                </div>
              </div>

              <div className={styles.processingGrid}>
                <div className={styles.processingImagePanel}>
                  <div className={styles.processingImageFrame}>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Analysing produce sample"
                        className={styles.processingImage}
                      />
                    )}

                    <div className={styles.processingScanOverlay}>
                      <motion.div
                        className={styles.processingScanLine}
                        initial={{ top: "8%" }}
                        animate={{ top: "84%" }}
                        transition={{
                          duration: 1.7,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut",
                        }}
                      />
                      <div className={styles.processingScanGrid} />
                    </div>
                  </div>
                </div>

                <div className={styles.processingInfoPanel}>
                  <div className={styles.processingProgressBlock}>
                    <div className={styles.processingProgressTrack}>
                      <motion.div
                        className={styles.processingProgressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className={styles.processingSteps}>
                    {ANALYSIS_STEPS.map((step, index) => {
                      const isDone = index < stepIndex;
                      const isCurrent = index === stepIndex;

                      return (
                        <motion.div
                          key={step}
                          className={`${styles.processingStep} ${isDone ? styles.processingStepDone : ""} ${isCurrent ? styles.processingStepCurrent : ""}`}
                          initial={{ opacity: 0.5, x: 0 }}
                          animate={{ opacity: isCurrent || isDone ? 1 : 0.58, x: isCurrent ? 4 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className={styles.processingStepBadge}>
                            {isDone ? <LuCheck size={13} /> : index + 1}
                          </span>
                          <span>{step}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && phase === "complete" && (
          <motion.section
            ref={resultsRef}
            className={styles.resultsSection}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className={`${styles.resultHero} ${styles[`resultHero--${result.tone}`]}`}>
              <div className={styles.resultHeroLeft}>
                <p className={styles.cardEyebrow}>BRFN AI verdict</p>

                <div className={styles.verdictRow}>
                  <div className={`${styles.verdictBadge} ${styles[`verdictBadge--${result.tone}`]}`}>
                    {result.verdict}
                  </div>
                  <div className={styles.gradeBadge}>Grade {result.grade}</div>
                </div>

                <p className={styles.resultGuidance}>{result.guidance}</p>
              </div>

              <div className={styles.resultHeroRight}>
                <div
                  className={styles.confidenceOrb}
                  style={{
                    background: `conic-gradient(var(--secondary) ${result.confidence * 3.6}deg, var(--surface-2) 0deg)`,
                  }}
                >
                  <div className={styles.confidenceInner}>
                    <span className={styles.confidenceLabel}>Confidence</span>
                    <strong>{result.confidence}%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.resultsGrid}>
              <div className={styles.resultCard}>
                <p className={styles.cardEyebrow}>AI observations</p>
                <h3 className={styles.resultCardTitle}>Visible signals detected</h3>

                <div className={styles.observationList}>
                  {result.observations.map((item) => (
                    <div key={item} className={styles.observationItem}>
                      <LuBadgeCheck size={16} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.resultCard}>
                <p className={styles.cardEyebrow}>Quality profile</p>
                <h3 className={styles.resultCardTitle}>Metric breakdown</h3>

                <MetricBar
                  label="Colour integrity"
                  value={result.metrics.colourIntegrity}
                  tone={result.tone}
                />
                <MetricBar
                  label="Texture stability"
                  value={result.metrics.textureStability}
                  tone={result.tone}
                />
                <MetricBar
                  label="Spoilage risk"
                  value={result.metrics.spoilageRisk}
                  tone="rotten"
                />
              </div>

              <div className={styles.resultCard}>
                <p className={styles.cardEyebrow}>Suggested action</p>
                <h3 className={styles.resultCardTitle}>Operational decision support</h3>

                <div className={styles.decisionPanel}>
                  {result.verdict === "Fresh" ? (
                    <>
                      <span className={`${styles.decisionPill} ${styles.decisionPillFresh}`}>
                        Suitable for listing
                      </span>
                      <p>
                        This image appears consistent with fresh produce. BRFN AI
                        suggests the item is fit for sale, subject to a final human check.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className={`${styles.decisionPill} ${styles.decisionPillRotten}`}>
                        Manual review recommended
                      </span>
                      <p>
                        The image suggests a notable spoilage risk. Consider holding
                        the batch, inspecting it physically, or diverting it to a surplus workflow.
                      </p>
                    </>
                  )}

                  <div className={styles.resultActions}>
                    <button type="button" className={styles.secondaryBtn} onClick={resetFlow}>
                      <LuUpload size={14} />
                      Analyse another image
                    </button>
                    <button type="button" className={styles.primaryBtn}>
                      <LuWandSparkles size={14} />
                      Save BRFN AI result
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </section>
  );
}