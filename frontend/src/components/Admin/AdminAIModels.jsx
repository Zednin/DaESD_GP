import { useState, useEffect } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './AdminAIModels.module.css';
const styles = { ...shared, ...local };

const MODELS = [
  {
    key: 'recommendations',
    title: 'Product Recommendations',
    description:
      'Personalised product suggestions shown to customers based on browsing and order history.',
  },
  {
    key: 'freshness',
    title: 'Product Freshness',
    description:
      'Predicts remaining shelf life and flags at-risk stock so producers can mark items as surplus.',
  },
];

function ModelConfigCard({ model, current, onSaved }) {
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelIdentifier, setModelIdentifier] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!current) return;
    setEndpointUrl(current.endpoint_url || '');
    setModelIdentifier(current.model_identifier || '');
    setIsEnabled(Boolean(current.is_enabled));
    setApiKey('');
  }, [current]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // TODO: wire up real backend once the AI-as-a-Service endpoint exists.
      // Expected: POST /ai-models/<model.key>/ with JSON
      //   { endpoint_url, api_key (optional), model_identifier, is_enabled }
      await new Promise(r => setTimeout(r, 500));
      onSaved({
        key: model.key,
        endpoint_url: endpointUrl.trim(),
        model_identifier: modelIdentifier.trim(),
        is_enabled: isEnabled,
        api_key_set: apiKey.trim().length > 0 || Boolean(current?.api_key_set),
        updated_at: new Date().toISOString(),
      });
      setApiKey('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isActive = current?.is_enabled && current?.endpoint_url;

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={`${styles.subheading} ${styles.cardTitle}`}>
            {model.title}
          </h3>
          <p className={styles.cardDescription}>{model.description}</p>
        </div>
        <span
          className={`${styles.statusPill} ${
            isActive ? styles.statusPillActive : styles.statusPillInactive
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Endpoint URL</label>
        <input
          type="url"
          className={styles.input}
          placeholder="https://api.example.com/v1/predict"
          value={endpointUrl}
          onChange={e => setEndpointUrl(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Model Identifier</label>
        <input
          type="text"
          className={styles.input}
          placeholder="e.g. openai/gpt-4o-mini or my-org/freshness-v2"
          value={modelIdentifier}
          onChange={e => setModelIdentifier(e.target.value)}
        />
        <span className={styles.helpText}>
          The model name the provider expects in its request payload. Leave
          blank if not required.
        </span>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          API Key {current?.api_key_set && '(currently set)'}
        </label>
        <input
          type="password"
          className={styles.input}
          placeholder={
            current?.api_key_set
              ? '•••••••• (leave blank to keep existing)'
              : 'Enter provider API key'
          }
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          autoComplete="new-password"
        />
        <span className={styles.helpText}>
          Stored server-side and never returned in API responses.
        </span>
      </div>

      <div className={styles.toggleRow}>
        <input
          id={`enabled-${model.key}`}
          type="checkbox"
          checked={isEnabled}
          onChange={e => setIsEnabled(e.target.checked)}
        />
        <label
          htmlFor={`enabled-${model.key}`}
          className={styles.toggleLabel}
        >
          Enable this AI feature
        </label>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {current?.updated_at && (
        <div className={styles.metaLine}>
          Last updated{' '}
          {new Date(current.updated_at).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}

      <div className={styles.actionsRow}>
        <button type="submit" className={styles.addBtn} disabled={saving}>
          {saving ? 'Saving…' : savedFlash ? 'Saved ✓' : 'Save configuration'}
        </button>
      </div>
    </form>
  );
}

export default function AdminAIModels() {
  const [currentByKey, setCurrentByKey] = useState({});

  function handleSaved(data) {
    setCurrentByKey(prev => ({ ...prev, [data.key]: data }));
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>AI Models</h2>
          <p className={styles.subtitle}>
            Configure the external AI services powering BRFN's AI-driven
            features
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {MODELS.map(model => (
          <ModelConfigCard
            key={model.key}
            model={model}
            current={currentByKey[model.key] || null}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </section>
  );
}
