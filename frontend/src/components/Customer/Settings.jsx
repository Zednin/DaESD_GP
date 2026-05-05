import { useEffect, useMemo, useState } from "react";
import {
  LuBuilding2,
  LuCheck,
  LuLoaderCircle,
  LuMail,
  LuMapPin,
  LuPhone,
  LuRefreshCw,
  LuSave,
  LuShield,
  LuUser,
} from "react-icons/lu";
import apiClient from "../../utils/apiClient";
import styles from "./Settings.module.css";

const initialForm = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  postcode: "",
  organisation_name: "",
  organisation_email: "",
  organisation_type: "",
};

function normaliseSettingsResponse(data) {
  return {
    username: data?.username || "",
    first_name: data?.first_name || "",
    last_name: data?.last_name || "",
    email: data?.email || "",
    phone_number: data?.phone_number || "",
    address_line_1:
      data?.default_delivery_address?.address_line_1 || "",
    address_line_2:
      data?.default_delivery_address?.address_line_2 || "",
    city: data?.default_delivery_address?.city || "",
    postcode: data?.default_delivery_address?.postcode || "",
    organisation_name: data?.organisation?.organisation_name || "",
    organisation_email: data?.organisation?.organisation_email || "",
    organisation_type: data?.organisation?.organisation_type || "",
  };
}

function buildPayload(form, hasOrganisationProfile) {
  const payload = {
    username: form.username.trim(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    phone_number: form.phone_number.trim(),
  };

  const hasAddress =
    form.address_line_1.trim() ||
    form.address_line_2.trim() ||
    form.city.trim() ||
    form.postcode.trim();

  if (hasAddress) {
    payload.default_delivery_address = {
      address_line_1: form.address_line_1.trim(),
      address_line_2: form.address_line_2.trim(),
      city: form.city.trim(),
      postcode: form.postcode.trim(),
    };
  }

  if (hasOrganisationProfile) {
    payload.organisation = {
      organisation_name: form.organisation_name.trim(),
      organisation_email: form.organisation_email.trim(),
      organisation_type: form.organisation_type || "",
    };
  }

  return payload;
}

function hasCompleteAddress(form) {
  return (
    form.address_line_1.trim() &&
    form.city.trim() &&
    form.postcode.trim()
  );
}

function flattenError(err) {
  const data = err?.response?.data;

  if (!data) {
    return "Couldn’t save your settings.";
  }

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }

  const firstReadableMessage = (value) => {
    if (!value) return null;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = firstReadableMessage(item);
        if (found) return found;
      }
      return null;
    }

    if (typeof value === "object") {
      for (const nested of Object.values(value)) {
        const found = firstReadableMessage(nested);
        if (found) return found;
      }
    }

    return null;
  };

  const message = firstReadableMessage(data);
  if (!message) {
    return "Couldn’t save your settings.";
  }

  return message.length > 140 ? `${message.slice(0, 137)}...` : message;
}

function SectionCard({ icon, eyebrow, title, subtitle, children }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIconWrap}>{icon}</div>

        <div>
          {eyebrow ? <p className={styles.sectionEyebrow}>{eyebrow}</p> : null}
          <h3 className={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>
      </div>

      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint ? <small className={styles.fieldHint}>{hint}</small> : null}
    </label>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState}>
      <div className={styles.loadingIconWrap}>
        <LuLoaderCircle className={styles.spinningIcon} size={24} />
      </div>
      <h3>Loading your settings</h3>
      <p>Please wait while we fetch your account details.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorIconWrap}>
        <LuRefreshCw size={24} />
      </div>
      <h3>We couldn’t load your settings</h3>
      <p>{message}</p>
      <button type="button" className={styles.retryBtn} onClick={onRetry}>
        <LuRefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}

export default function Settings() {
  const [form, setForm] = useState(initialForm);
  const [initialData, setInitialData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasOrganisationProfile, setHasOrganisationProfile] = useState(false);

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialData),
    [form, initialData]
  );

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { data } = await apiClient.get("/account/settings/");
      const normalised = normaliseSettingsResponse(data);
      

      setForm(normalised);
      setInitialData(normalised);
      setHasOrganisationProfile(Boolean(data?.organisation));

    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Something went wrong while loading your account settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleReset() {
    setForm(initialData);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!hasCompleteAddress(form)) {
      setError("Address line 1, city, and postcode are required.");
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = buildPayload(form, hasOrganisationProfile);
      const { data } = await apiClient.patch("/account/settings/", payload);

      const normalised = normaliseSettingsResponse(data);
      setForm(normalised);
      setInitialData(normalised);
      setSuccess("Your settings have been updated successfully.");
    } catch (err) {
      setError(flattenError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Account</p>
            <h2 className={styles.title}>Settings</h2>
            <p className={styles.subtitle}>
              Manage your account details, saved contact information, and delivery address.
            </p>
          </div>
        </div>

        <LoadingState />
      </section>
    );
  }

  if (error && !form.email && !form.username) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Account</p>
            <h2 className={styles.title}>Settings</h2>
            <p className={styles.subtitle}>
              Manage your account details, saved contact information, and delivery address.
            </p>
          </div>
        </div>

        <ErrorState message={error} onRetry={loadSettings} />
      </section>
    );
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h2 className={styles.title}>Settings</h2>
          <p className={styles.subtitle}>
            Update your personal details, delivery address, and any organisation info linked to your account.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={loadSettings}
            disabled={saving}
          >
            <LuRefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {success ? (
        <div className={styles.successBanner}>
          <LuCheck size={16} />
          {success}
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <SectionCard
          icon={<LuUser size={20} />}
          eyebrow="Profile"
          title="Personal details"
          subtitle="This information is tied to your account and used across your profile."
        >
          <div className={styles.fieldGrid}>
            <Field label="First name">
              <input
                className={styles.input}
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Enter your first name"
              />
            </Field>

            <Field label="Last name">
              <input
                className={styles.input}
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Enter your last name"
              />
            </Field>

            <Field label="Username">
              <input
                className={styles.input}
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Choose a username"
              />
            </Field>

            <Field label="Email address">
              <input
                className={styles.input}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email address"
              />
            </Field>

            <Field label="Phone number" hint="Useful for delivery or account contact if needed.">
              <input
                className={styles.input}
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<LuMapPin size={20} />}
          eyebrow="Delivery"
          title="Default delivery address"
          subtitle="Your main saved delivery address for future orders."
        >
          <div className={styles.fieldGrid}>
            <Field label="Address line 1">
              <input
                className={styles.input}
                name="address_line_1"
                value={form.address_line_1}
                onChange={handleChange}
                placeholder="House number and street"
                required
              />
            </Field>

            <Field label="Address line 2">
              <input
                className={styles.input}
                name="address_line_2"
                value={form.address_line_2}
                onChange={handleChange}
                placeholder="Apartment, suite, unit, etc."
              />
            </Field>

            <Field label="City / Town">
              <input
                className={styles.input}
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="City or town"
                required
              />
            </Field>

            <Field label="Postcode">
              <input
                className={styles.input}
                name="postcode"
                value={form.postcode}
                onChange={handleChange}
                placeholder="Postcode"
                required
              />
            </Field>
          </div>
        </SectionCard>


        {hasOrganisationProfile && (
          <SectionCard
            icon={<LuBuilding2 size={20} />}
            eyebrow="Organisation"
            title="Organisation details"
            subtitle="Only complete this section if your customer profile is linked to an organisation."
          >
            <div className={styles.fieldGrid}>
              <Field label="Organisation name">
                <input
                  className={styles.input}
                  name="organisation_name"
                  value={form.organisation_name}
                  onChange={handleChange}
                  placeholder="Organisation name"
                />
              </Field>

              <Field label="Organisation email">
                <input
                  className={styles.input}
                  type="email"
                  name="organisation_email"
                  value={form.organisation_email}
                  onChange={handleChange}
                  placeholder="Organisation email"
                />
              </Field>

              <Field label="Organisation type">
                <select
                  className={styles.input}
                  name="organisation_type"
                  value={form.organisation_type}
                  onChange={handleChange}
                >
                  <option value="">Select organisation type</option>
                  <option value="community_group">Community Group</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="charity">Charity</option>
                  <option value="education">Education</option>
                </select>
              </Field>
            </div>
          </SectionCard>
        )}

        <div className={styles.securityNote}>
          <div className={styles.securityIconWrap}>
            <LuShield size={18} />
          </div>
          <div>
            <strong>Account security</strong>
            <p>
              For security reasons we dont allow password changes from this page.
            </p>
          </div>
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            Reset changes
          </button>

          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <LuLoaderCircle className={styles.spinningIcon} size={16} />
                Saving...
              </>
            ) : (
              <>
                <LuSave size={16} />
                Save settings
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}