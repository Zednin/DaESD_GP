import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuArrowUpRight,
  LuBadgeCheck,
  LuBrain,
  LuCamera,
  LuCheck,
  LuCloudUpload,
  LuHistory,
  LuImage,
  LuLayers3,
  LuRefreshCw,
  LuRocket,
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

const FRESHNESS_API_BASE = import.meta.env.VITE_FRESHNESS_API_URL || "http://localhost:5001";

const API_URL = `${FRESHNESS_API_BASE.replace(/\/$/, "")}/freshness/analyze`;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function formatVerdict(prediction) {
  if (!prediction) return "Unknown";
  return prediction.toLowerCase() === "fresh" ? "Fresh" : "Rotten";
}

function buildGuidance(summary) {
  const verdict = summary?.freshness_prediction?.toLowerCase();
  if (verdict === "fresh") {
    return "Suitable for sale based on the visible sample. BRFN AI still recommends a final human check before listing.";
  }
  return "Manual inspection is recommended. Consider holding this batch or diverting it into a surplus decision workflow.";
}

function mapMetrics(summary) {
  const metrics = summary?.metrics ?? {};
  const probs = summary?.class_probabilities ?? {};
  const defectSummary = summary?.defect_summary ?? {};

  const brownRatio = Number(metrics.brown_ratio ?? 0);
  const solidity = Number(metrics.solidity ?? 0);
  const circularity = Number(metrics.circularity ?? 0);
  const defectAreaRatio = Number(defectSummary.defect_area_ratio ?? 0);
  const rottenProbability = Number(probs.rotten ?? 0);

  const colourIntegrity = clamp((1 - brownRatio) * 100);
  const textureStability = clamp(((solidity * 0.7) + (circularity * 0.3)) * 100);
  const spoilageRisk = clamp(
    Math.max(rottenProbability * 100, defectAreaRatio * 100 * 1.35)
  );
  const browning = clamp(brownRatio * 100);

  return {
    colourIntegrity: Math.round(colourIntegrity),
    textureStability: Math.round(textureStability),
    spoilageRisk: Math.round(spoilageRisk),
    browning: Math.round(browning),
  };
}

function mapDeductions(summary) {
  const deductions = summary?.deductions ?? [];
  if (!deductions.length) {
    return [
      summary?.freshness_prediction?.toLowerCase() === "fresh"
        ? "No major spoilage indicators were detected in the visible sample."
        : "The model detected spoilage indicators in the visible sample.",
    ];
  }

  return deductions.map((item) => item.reason);
}

function buildResultFromApi(data) {
  const summary = data?.analysis_summary ?? {};
  const verdict = formatVerdict(summary.freshness_prediction);
  const tone = verdict.toLowerCase();
  const confidence = Math.round(
    clamp(Number(summary.freshness_confidence ?? 0) * 100)
  );

  return {
    verdict,
    tone,
    grade: summary.quality_grade ?? "—",
    confidence,
    observations: mapDeductions(summary),
    guidance: buildGuidance(summary),
    metrics: mapMetrics(summary),
    summary,
    shapImage: data?.shap_explanation_base64
      ? `data:image/png;base64,${data.shap_explanation_base64}`
      : "",
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

function TabButton({ label, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      className={`${styles.tabButton} ${active ? styles.tabButtonActive : ""}`}
      onClick={onClick}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );
}

function StatusPill({ children, tone = "neutral" }) {
  return (
    <span className={`${styles.statusPill} ${styles[`statusPill--${tone}`] || ""}`}>
      {children}
    </span>
  );
}

function ModelUploadPanel({
  modelForm,
  setModelForm,
  modelFile,
  setModelFile,
  onSubmit,
  uploading,
}) {
  return (
    <div className={styles.resultCard}>
      <p className={styles.cardEyebrow}>Engineer tools</p>
      <h3 className={styles.resultCardTitle}>Upload a new AI model</h3>

      <div className={styles.modelFormGrid}>
        <label className={styles.fieldGroup}>
          <span>Model name</span>
          <input
            className={styles.textInput}
            value={modelForm.name}
            onChange={(e) =>
              setModelForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Freshness Classifier"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Model type</span>
          <select
            className={styles.textInput}
            value={modelForm.modelType}
            onChange={(e) =>
              setModelForm((prev) => ({ ...prev, modelType: e.target.value }))
            }
          >
            <option value="freshness">Freshness</option>
            <option value="quality">Quality</option>
            <option value="recommender">Recommender</option>
          </select>
        </label>

        <label className={styles.fieldGroup}>
          <span>Version</span>
          <input
            className={styles.textInput}
            value={modelForm.version}
            onChange={(e) =>
              setModelForm((prev) => ({ ...prev, version: e.target.value }))
            }
            placeholder="v1.2.0"
          />
        </label>

        <label className={styles.fieldGroup}>
          <span>Notes</span>
          <input
            className={styles.textInput}
            value={modelForm.notes}
            onChange={(e) =>
              setModelForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Improved rotten apple detection"
          />
        </label>

        <label className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
          <span>Model file</span>
          <input
            type="file"
            className={styles.textInput}
            onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className={styles.decisionPanel}>
        <p>
          Uploads should be restricted to engineer or admin users. This form is
          frontend-only for now and can be wired to the Django upload endpoint next.
        </p>

        <div className={styles.resultActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onSubmit}
            disabled={uploading}
          >
            <LuCloudUpload size={14} />
            {uploading ? "Uploading..." : "Upload model"}
          </button>
        </div>

        {modelFile && (
          <p className={styles.modelUploadMeta}>
            Selected file: <strong>{modelFile.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

function ModelListPanel({ models, onActivate }) {
  return (
    <div className={styles.resultCard}>
      <p className={styles.cardEyebrow}>Deployment history</p>
      <h3 className={styles.resultCardTitle}>Registered models</h3>

      <div className={styles.modelList}>
        {models.map((model) => (
          <div key={model.id} className={styles.modelRow}>
            <div className={styles.modelMeta}>
              <div className={styles.modelTitleRow}>
                <strong>{model.name}</strong>
                {model.isActive && <StatusPill tone="fresh">Active</StatusPill>}
                {!model.isActive && (
                  <StatusPill tone="neutral">Inactive</StatusPill>
                )}
              </div>

              <div className={styles.modelSubMeta}>
                <span>{model.modelType}</span>
                <span>{model.version}</span>
                <span>{model.uploadedAt}</span>
              </div>

              <p className={styles.modelNotes}>{model.notes}</p>
            </div>

            <div className={styles.modelRowActions}>
              {!model.isActive && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => onActivate(model.id)}
                >
                  <LuRocket size={14} />
                  Set active
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedResultsPanel() {
  return (
    <div className={styles.resultCard}>
      <p className={styles.cardEyebrow}>Saved results</p>
      <h3 className={styles.resultCardTitle}>Scan history</h3>
      <p>
        This section can later show previously analysed items, verdicts, grades,
        timestamps, and explanation images.
      </p>
    </div>
  );
}

export default function ProducerBrfnAi({
  producerName,
  userRole = "producer",
}) {
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const [activeTab, setActiveTab] = useState("scan");

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);

  const [phase, setPhase] = useState("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [uploadingModel, setUploadingModel] = useState(false);
  const [modelFile, setModelFile] = useState(null);
  const [modelForm, setModelForm] = useState({
    name: "",
    modelType: "freshness",
    version: "",
    notes: "",
  });

  const [models, setModels] = useState([
    {
      id: 1,
      name: "Freshness Classifier",
      modelType: "freshness",
      version: "v1.0.0",
      notes: "Initial deployment",
      isActive: true,
      uploadedAt: "22 Apr 2026",
    },
    {
      id: 2,
      name: "Freshness Classifier",
      modelType: "freshness",
      version: "v1.1.0",
      notes: "Improved defect localisation",
      isActive: false,
      uploadedAt: "23 Apr 2026",
    },
  ]);

  // const isEngineer = userRole === "engineer" || userRole === "admin";
   const isEngineer = true

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
          return prev;
        }
        return prev + 1;
      });
    }, 1250);

    return () => clearInterval(interval);
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
    setError("");
    setPhase("uploaded");
  }

  function handleInputChange(event) {
    handleSelectedFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleSelectedFile(event.dataTransfer.files?.[0]);
  }

  async function startAnalysis() {
    if (!file) return;

    setError("");
    setResult(null);
    setPhase("processing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Freshness analysis failed.");
      }

      setResult(buildResultFromApi(data));
      setPhase("complete");
      setStepIndex(ANALYSIS_STEPS.length - 1);
    } catch (err) {
      setError(err.message || "Something went wrong while analysing the image.");
      setPhase("uploaded");
    }
  }

  function resetFlow() {
    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setPhase("idle");
    setStepIndex(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleModelUpload() {
    if (!modelFile) return;

    setUploadingModel(true);

    try {
      // Placeholder only for now
      const newModel = {
        id: Date.now(),
        name: modelForm.name || "Untitled model",
        modelType: modelForm.modelType,
        version: modelForm.version || "v0.0.0",
        notes: modelForm.notes || "No notes provided",
        isActive: false,
        uploadedAt: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };

      setModels((prev) => [newModel, ...prev]);
      setModelFile(null);
      setModelForm({
        name: "",
        modelType: "freshness",
        version: "",
        notes: "",
      });
    } finally {
      setUploadingModel(false);
    }
  }

  function handleActivateModel(modelId) {
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        isActive: model.id === modelId,
      }))
    );
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
          <h1 className={styles.heroTitle}>AI-powered producer intelligence</h1>
          <p className={styles.heroSubtitle}>
            Run freshness scans, review AI outputs, and manage deployed models from one dashboard.
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
            {isEngineer && (
              <span className={styles.heroPill}>
                <LuLayers3 size={15} />
                Engineer model controls
              </span>
            )}
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

      <section className={styles.tabBar}>
        <TabButton
          label="Freshness Scan"
          icon={LuSparkles}
          active={activeTab === "scan"}
          onClick={() => setActiveTab("scan")}
        />
        <TabButton
          label="Saved Results"
          icon={LuHistory}
          active={activeTab === "results"}
          onClick={() => setActiveTab("results")}
        />
        {isEngineer && (
          <TabButton
            label="AI Models"
            icon={LuLayers3}
            active={activeTab === "models"}
            onClick={() => setActiveTab("models")}
          />
        )}
      </section>

      {activeTab === "scan" && (
        <>
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

            {error && <p className={styles.errorText}>{error}</p>}
          </motion.section>

          <AnimatePresence>
            {phase === "processing" && file && (
              <motion.div
                className={styles.processingOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className={styles.processingShell}
                  initial={{ opacity: 0, scale: 0.985, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.985, y: 20 }}
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
                              animate={{
                                opacity: isCurrent || isDone ? 1 : 0.58,
                                x: isCurrent ? 4 : 0,
                              }}
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
                    <h3 className={styles.resultCardTitle}>Why this decision was made</h3>

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
                      label="Browning"
                      value={result.metrics.browning}
                      tone="rotten"
                    />
                    <MetricBar
                      label="Spoilage risk"
                      value={result.metrics.spoilageRisk}
                      tone="rotten"
                    />
                  </div>

                  <div className={styles.resultCard}>
                    <p className={styles.cardEyebrow}>Model explanation</p>
                    <h3 className={styles.resultCardTitle}>What BRFN AI focused on</h3>

                    {result.shapImage ? (
                      <div className={styles.shapPanel}>
                        <img
                          src={result.shapImage}
                          alt="BRFN AI SHAP explanation"
                          className={styles.shapImage}
                        />
                        <p className={styles.shapCaption}>
                          Highlighted regions show which visible areas most influenced the verdict.
                        </p>
                      </div>
                    ) : (
                      <p>No explanation image was returned for this scan.</p>
                    )}
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
        </>
      )}

      {activeTab === "results" && (
        <section className={styles.resultsSection}>
          <SavedResultsPanel />
        </section>
      )}

      {activeTab === "models" && isEngineer && (
        <section className={styles.resultsSection}>
          <div className={styles.resultsGrid}>
            <ModelUploadPanel
              modelForm={modelForm}
              setModelForm={setModelForm}
              modelFile={modelFile}
              setModelFile={setModelFile}
              onSubmit={handleModelUpload}
              uploading={uploadingModel}
            />
            <ModelListPanel models={models} onActivate={handleActivateModel} />
          </div>
        </section>
      )}
    </section>
  );
}