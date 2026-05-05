import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuBuilding2,
  LuCheck,
  LuClock,
  LuLoaderCircle,
  LuMapPin,
  LuRefreshCw,
  LuSave,
  LuShield,
} from "react-icons/lu";
import apiClient from "../../utils/apiClient";
import styles from "../Customer/Settings.module.css";

const initialForm = {
  company_name: "",
  company_number: "",
  company_description: "",
  lead_time_hours: 48,
  business_address: null,
  address_line_1: "",
  address_line_2: "",
  city: "",
  postcode: "",
};

function normaliseProducer(producer, address = null) {
  const businessAddress =
    typeof producer?.business_address === "object"
      ? producer.business_address
      : address;

  return {
    company_name: producer?.company_name || "",
    company_number: producer?.company_number || "",
    company_description: producer?.company_description || "",
    lead_time_hours: producer?.lead_time_hours || 48,
    business_address:
      businessAddress?.id ||
      producer?.business_address ||
      address?.id ||
      null,
    address_line_1: businessAddress?.address_line_1 || "",
    address_line_2: businessAddress?.address_line_2 || "",
    city: businessAddress?.city || "",
    postcode: businessAddress?.postcode || "",
  };
}

function buildProducerPayload(form) {
  return {
    company_name: form.company_name.trim(),
    company_number: form.company_number.trim(),
    company_description: form.company_description.trim(),
    lead_time_hours: Number(form.lead_time_hours) || 48,
    business_address: form.business_address,
  };
}

function buildAddressPayload(form) {
  return {
    address_type: "BUSINESS",
    address_line_1: form.address_line_1.trim(),
    address_line_2: form.address_line_2.trim(),
    city: form.city.trim(),
    postcode: form.postcode.trim(),
  };
}

function hasAddressValues(form) {
  return (
    form.address_line_1.trim() ||
    form.address_line_2.trim() ||
    form.city.trim() ||
    form.postcode.trim()
  );
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

  if (!data) return "Couldn’t save your producer settings.";
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;

  function findMessage(value) {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(findMessage).find(Boolean);
    if (typeof value === "object") {
      return Object.values(value).map(findMessage).find(Boolean);
    }
    return null;
  }

  return findMessage(data) || "Couldn’t save your producer settings.";
}

function SectionCard({ icon, eyebrow, title, subtitle, children }) {
  return (
    <motion.div
      className={styles.sectionCard}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIconWrap}>{icon}</div>
        <div>
          {eyebrow ? <p className={styles.sectionEyebrow}>{eyebrow}</p> : null}
          <h3 className={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </motion.div>
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

export default function Settings() {
  const [producerId, setProducerId] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [initialData, setInitialData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialData),
    [form, initialData]
  );

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { data: producer } = await apiClient.get("/producers/me/");

      if (!producer) {
        setError("No producer profile was found for your account.");
        return;
      }

      let businessAddress = null;

      if (producer.business_address) {
        if (typeof producer.business_address === "object") {
          businessAddress = producer.business_address;
        } else {
          const { data } = await apiClient.get(
            `/addresses/${producer.business_address}/`
          );
          businessAddress = data;
        }
      } else {
        // fallback: fetch existing BUSINESS address
        const { data: addresses } = await apiClient.get(
          "/addresses/?address_type=BUSINESS"
        );

        businessAddress =
          Array.isArray(addresses) && addresses.length > 0
            ? addresses[0]
            : null;
      }

      const normalised = normaliseProducer(producer, businessAddress);

      setProducerId(producer.id);
      setAddressId(businessAddress?.id || null);
      setForm(normalised);
      setInitialData(normalised);
    } catch (err) {
      setError(flattenError(err));
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

    if (!producerId) return;

    if (!hasCompleteAddress(form)) {
      setError("Address line 1, city, and postcode are required.");
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let nextAddressId = addressId;

      if (hasAddressValues(form)) {
        const addressPayload = buildAddressPayload(form);

        if (addressId) {
          const { data } = await apiClient.patch(`/addresses/${addressId}/`, addressPayload);
          nextAddressId = data.id;
        } else {
          const { data } = await apiClient.post("/addresses/", addressPayload);
          nextAddressId = data.id;
        }
      }

      const producerPayload = {
        ...buildProducerPayload(form),
        business_address: nextAddressId,
      };

      const { data: updatedProducer } = await apiClient.patch(
        `/producers/${producerId}/`,
        producerPayload
      );

      const address =
        nextAddressId && hasAddressValues(form)
          ? {
              id: nextAddressId,
              address_line_1: form.address_line_1,
              address_line_2: form.address_line_2,
              city: form.city,
              postcode: form.postcode,
            }
          : null;

      const normalised = normaliseProducer(updatedProducer, address);

      setAddressId(nextAddressId);
      setForm(normalised);
      setInitialData(normalised);
      setSuccess("Your producer settings have been updated successfully.");
    } catch (err) {
      setError(flattenError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <motion.section
        className={styles.wrapper}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Producer account</p>
            <h2 className={styles.title}>Settings</h2>
            <p className={styles.subtitle}>Loading your producer profile.</p>
          </div>
        </div>

        <div className={styles.loadingState}>
          <div className={styles.loadingIconWrap}>
            <LuLoaderCircle className={styles.spinningIcon} size={24} />
          </div>
          <h3>Loading your settings</h3>
          <p>Please wait while we fetch your producer details.</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className={styles.wrapper}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Producer account</p>
          <h2 className={styles.title}>Settings</h2>
          <p className={styles.subtitle}>
            Update your business profile, company details, address, and order lead time.
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

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            className={styles.errorBanner}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {error}
          </motion.div>
        ) : null}

        {success ? (
          <motion.div
            key="success"
            className={styles.successBanner}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <LuCheck size={16} />
            {success}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <form className={styles.form} onSubmit={handleSubmit}>
        <SectionCard
          icon={<LuBuilding2 size={20} />}
          eyebrow="Business"
          title="Company details"
          subtitle="These details appear across your producer profile and dashboard."
        >
          <div className={styles.fieldGrid}>
            <Field label="Company name">
              <input
                className={styles.input}
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="Enter your company name"
              />
            </Field>

            <Field label="Company number">
              <input
                className={styles.input}
                name="company_number"
                value={form.company_number}
                onChange={handleChange}
                placeholder="Enter your company number"
              />
            </Field>

            <Field label="Company description">
              <textarea
                className={styles.input}
                name="company_description"
                value={form.company_description}
                onChange={handleChange}
                placeholder="Tell customers about your business"
                rows={5}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<LuMapPin size={20} />}
          eyebrow="Business address"
          title="Producer address"
          subtitle="This is your main business address linked to your producer profile."
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
                placeholder="Unit, building, farm name, etc."
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

        <SectionCard
          icon={<LuClock size={20} />}
          eyebrow="Orders"
          title="Lead time"
          subtitle="Set the minimum preparation time customers should expect."
        >
          <div className={styles.fieldGrid}>
            <Field label="Lead time in hours" hint="Minimum allowed value is 48 hours.">
              <input
                className={styles.input}
                type="number"
                min="48"
                name="lead_time_hours"
                value={form.lead_time_hours}
                onChange={handleChange}
              />
            </Field>
          </div>
        </SectionCard>

        <div className={styles.securityNote}>
          <div className={styles.securityIconWrap}>
            <LuShield size={18} />
          </div>
          <div>
            <strong>Account security</strong>
            <p>Password changes are not handled from this page.</p>
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
            disabled={!hasChanges || saving || !producerId}
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
    </motion.section>
  );
}