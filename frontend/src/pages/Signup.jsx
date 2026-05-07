import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./Signup.module.css";
import { signupCustomer, signupProducer, login } from "../utils/auth";
import { useAuth } from "../auth/AuthContext";
import { migrateLocalCartToServerIfNeeded } from "../utils/cartStorage";
import TermsModal from "../Components/Legal/TermsModal";

export default function Signup() {
  const { accountType } = useParams();
  const [searchParams] = useSearchParams();
  const org = searchParams.get("org") || "";
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [organisationName, setOrganisationName] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [leadTimeHours, setLeadTimeHours] = useState("48");

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [nextRoute, setNextRoute] = useState("");

  const isProducer = accountType === "producer";

  const pageContent = useMemo(() => {
    if (isProducer) {
      return {
        eyebrow: "Producer signup",
        title: "Start selling local food",
        subtitle:
          "Create your producer profile, set your lead time, and get your storefront ready.",
      };
    }

    const labels = {
      "": "Create your customer account",
      restaurant: "Create your restaurant account",
      community_group: "Create your community group account",
      charity: "Create your charity account",
      education: "Create your education account",
    };

    const subtitles = {
      "": "Sign up to browse and order fresh food from trusted local producers.",
      restaurant: "Order fresh ingredients for your kitchen with less admin.",
      community_group: "Coordinate bulk purchasing for your group with ease.",
      charity: "Manage reliable food ordering for charitable work.",
      education: "Order fresh food for schools and education settings.",
    };

    return {
      eyebrow: org ? "Organisation signup" : "Customer signup",
      title: labels[org] || "Create your customer account",
      subtitle: subtitles[org] || "Sign up to start ordering.",
    };
  }, [isProducer, org]);

  function validate() {
    if (!username.trim()) return "Username is required";
    if (!email.trim()) return "Email is required";
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!isProducer && !phoneNumber.trim()) return "Phone number is required";
    if (!addressLine1.trim()) return "Address line 1 is required";
    if (!city.trim()) return "City is required";
    if (!postcode.trim()) return "Postcode is required";
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== password2) return "Passwords do not match";

    if (accountType === "customer" && org && !organisationName.trim()) {
      return "Organisation name is required";
    }

    if (isProducer) {
      if (!companyName.trim()) return "Company name is required";
      if (!companyNumber.trim()) return "Company number is required";

      const leadTime = Number(leadTimeHours);
      if (!Number.isFinite(leadTime) || leadTime < 48) {
        return "Lead time must be at least 48 hours";
      }
    }

    if (!acceptedTerms) {
      return "You must accept the terms and conditions before creating an account";
    }

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const validationError = validate();
      if (validationError) throw new Error(validationError);

      const addressPayload = {
        address_line_1: addressLine1.trim(),
        address_line_2: addressLine2.trim(),
        city: city.trim(),
        postcode: postcode.trim(),
      };

      if (isProducer) {
        await signupProducer({
          username: username.trim(),
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
          company_email: companyEmail.trim(),
          company_number: companyNumber.trim(),
          company_description: companyDescription.trim(),
          lead_time_hours: Number(leadTimeHours),
          business_address: addressPayload,
        });
      } else {
        await signupCustomer({
          username: username.trim(),
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          default_delivery_address: addressPayload,
          ...(org ? { organisation_type: org } : {}),
          ...(organisationName.trim()
            ? { organisation_name: organisationName.trim() }
            : {}),
        });
      }

      await login(email.trim(), password);
      const user = await refresh();
      await migrateLocalCartToServerIfNeeded();

      setNextRoute(user?.account_type === "producer" ? "/producer/dashboard" : "/products");
      setConfirmationOpen(true);
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />

      <motion.section
        className={styles.shell}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <aside className={styles.heroPanel}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => navigate("/signup/select")}
          >
            ← Back to account types
          </button>

          <div>
            <p className={styles.eyebrow}>{pageContent.eyebrow}</p>
            <h1 className={styles.title}>{pageContent.title}</h1>
            <p className={styles.subtitle}>{pageContent.subtitle}</p>

            <button
              type="submit"
              form="signup-form"
              className={styles.submitBtnHero}
              disabled={loading}
            >
              {loading ? "Creating your account..." : "Create account"}
            </button>

            <p className={styles.ctaHint}>Takes less than 2 minutes</p>
          </div>

          <div className={styles.perks}>
            <span>Fresh local produce</span>
            <span>Simple ordering</span>
            <span>Secure account setup</span>
          </div>
        </aside>

        <section className={styles.card}>
          {error && <div className={styles.error}>{error}</div>}

          <form id="signup-form" className={styles.form} onSubmit={handleSubmit}>
            <FormSection title="Account details">
              <Field label="Username">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. greenbasket"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
            </FormSection>

            <FormSection title={isProducer ? "Primary contact" : "Your details"}>
              <div className={styles.twoCol}>
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </Field>

                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </Field>
              </div>

              {!isProducer && (
                <Field label="Phone number">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 07123 456789"
                  />
                </Field>
              )}
            </FormSection>

            <FormSection title={isProducer ? "Business address" : "Delivery address"}>
              <Field label="Address line 1">
                <input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                />
              </Field>

              <Field label="Address line 2">
                <input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, unit — optional"
                />
              </Field>

              <div className={styles.twoCol}>
                <Field label="City">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </Field>

                <Field label="Postcode">
                  <input
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="Postcode"
                  />
                </Field>
              </div>
            </FormSection>

            {accountType === "customer" && org && (
              <FormSection title="Organisation">
                <Field label="Organisation name">
                  <input
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    placeholder="Organisation name"
                  />
                </Field>
              </FormSection>
            )}

            {isProducer && (
              <FormSection title="Producer profile">
                <Field label="Company name">
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company name"
                  />
                </Field>

                <div className={styles.twoCol}>
                  <Field label="Company email">
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="sales@example.com"
                    />
                  </Field>

                  <Field label="Company number">
                    <input
                      value={companyNumber}
                      onChange={(e) => setCompanyNumber(e.target.value)}
                      placeholder="Company number"
                    />
                  </Field>
                </div>

                <Field label="Company description">
                  <textarea
                    rows={4}
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Tell customers what you grow, make, or supply"
                  />
                </Field>

                <Field label="Lead time hours">
                  <input
                    type="number"
                    min="48"
                    value={leadTimeHours}
                    onChange={(e) => setLeadTimeHours(e.target.value)}
                  />
                </Field>
              </FormSection>
            )}

            <FormSection title="Security">
              <div className={styles.twoCol}>
                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </Field>

                <Field label="Confirm password">
                  <input
                    type="password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="Repeat password"
                  />
                </Field>
              </div>
            </FormSection>
            <div className={styles.termsBox}>
              <label className={styles.termsLabel}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />

                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className={styles.termsLink}
                    onClick={() => setTermsOpen(true)}
                  >
                    Terms and Conditions
                  </button>
                </span>
              </label>
            </div>
          </form>
        </section>
      </motion.section>
      {confirmationOpen && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h2>Account created successfully</h2>
            <p>
              Your {isProducer ? "producer" : "customer"} account has been created.
            </p>

            <button
              type="button"
              className={styles.popupButton}
              onClick={() => navigate(nextRoute, { replace: true })}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </main>
  );
}

function FormSection({ title, children }) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <div className={styles.sectionGrid}>{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className={styles.inputGroup}>
      <span>{label}</span>
      {children}
    </label>
  );
}