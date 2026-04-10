import { useRef, useState } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './AdminAIModels.module.css';
const styles = { ...shared, ...local };

const MODELS = [
  {
    key: 'recommendations',
    title: 'Product Recommendations',
    description:
      'Personalised product suggestions shown to customers based on browsing and order history.',
    accepts: '.pkl,.joblib,.onnx,.h5,.pt,.bin,.zip',
    acceptsLabel: '.pkl, .joblib, .onnx, .h5, .pt, .zip',
  },
  {
    key: 'freshness',
    title: 'Product Freshness',
    description:
      'Predicts remaining shelf life and flags at-risk stock so producers can mark items as surplus.',
    accepts: '.pkl,.joblib,.onnx,.h5,.pt,.bin,.zip',
    acceptsLabel: '.pkl, .joblib, .onnx, .h5, .pt, .zip',
  },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ModelUploadCard({ model }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [error, setError] = useState('');

  function handleFilePick(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setError('');
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      // TODO: replace with real upload once the backend endpoint exists.
      // POST /ai-models/<model.key>/ with multipart form data { file }
      await new Promise(r => setTimeout(r, 700));
      setUploaded({
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleClear() {
    setFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={styles.card}>
      <div>
        <h3 className={`${styles.subheading} ${styles.cardTitle}`}>
          {model.title}
        </h3>
        <p className={styles.cardDescription}>{model.description}</p>
      </div>

      <div className={styles.currentPanel}>
        <div className={styles.currentLabel}>Current model</div>
        {uploaded ? (
          <div className={styles.currentRow}>
            <div className={styles.currentInfo}>
              <div className={styles.currentName}>{uploaded.name}</div>
              <div className={styles.currentMeta}>
                {formatSize(uploaded.size)} • uploaded{' '}
                {new Date(uploaded.uploadedAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <span className={styles.activePill}>Active</span>
          </div>
        ) : (
          <div className={styles.currentEmpty}>No model uploaded yet.</div>
        )}
      </div>

      <div className={styles.uploadGroup}>
        <label className={styles.filePicker}>
          <span
            className={`${styles.filePickerLabel} ${
              file ? styles.filePickerLabelSelected : ''
            }`}
          >
            {file ? file.name : `Choose a file (${model.acceptsLabel})`}
          </span>
          <span className={styles.browseBtn}>Browse</span>
          <input
            ref={inputRef}
            type="file"
            accept={model.accepts}
            onChange={handleFilePick}
            className={styles.hiddenInput}
          />
        </label>

        {file && (
          <div className={styles.selectedMeta}>
            Selected: {formatSize(file.size)}
          </div>
        )}

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload model'}
          </button>
          {file && !uploading && (
            <button
              type="button"
              className={styles.deleteRowBtn}
              onClick={handleClear}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAIModels() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>AI Models</h2>
          <p className={styles.subtitle}>
            Upload and manage the model files powering BRFN's AI-driven features
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {MODELS.map(model => (
          <ModelUploadCard key={model.key} model={model} />
        ))}
      </div>
    </section>
  );
}
