import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./Signup.module.css";
import { signupCustomer, signupProducer, login } from "../utils/auth";
import { useAuth } from "../auth/AuthContext";
import { migrateLocalCartToServerIfNeeded } from "../utils/cartStorage";

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
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [organisationName, setOrganisationName] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [leadTimeHours, setLeadTimeHours] = useState("48");

  const pageContent = useMemo(() => {
    if (accountType === "producer") {
      return {
        title: "Create your producer account",
        subtitle: "Set up your storefront and start selling through the marketplace.",
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
      "": "Sign up to browse and order fresh food.",
      restaurant: "Sign up to place recurring orders.",
      community_group: "Sign up to coordinate bulk food purchasing.",
      charity: "Sign up to manage food orders for charitable work.",
      education: "Sign up to order for schools and education settings.",
    };

    return {
      title: labels[org] || "Create your customer account",
      subtitle: subtitles[org] || "Sign up to start ordering.",
    };
  }, [accountType, org]);

  function validate() {
    if (!username.trim()) return "Username is required";
    if (!email.trim()) return "Email is required";
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== password2) return "Passwords do not match";

    if (accountType === "customer" && org && !organisationName.trim()) {
      return "Organisation name is required";
    }

    if (accountType === "producer") {
      if (!companyName.trim()) return "Company name is required";
      if (!companyNumber.trim()) return "Company number is required";

      const leadTime = Number(leadTimeHours);
      if (!Number.isFinite(leadTime) || leadTime < 48) {
        return "Lead time must be at least 48 hours";
      }
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

      if (accountType === "producer") {
        await signupProducer({
          username: username.trim(),
          email: email.trim(),
          password,
          company_name: companyName.trim(),
          company_email: companyEmail.trim(),
          company_number: companyNumber.trim(),
          company_description: companyDescription.trim(),
          lead_time_hours: Number(leadTimeHours),
        });
      } else {
        await signupCustomer({
          username: username.trim(),
          email: email.trim(),
          password,
          ...(org ? { organisation_type: org } : {}),
          ...(organisationName.trim()
            ? { organisation_name: organisationName.trim() }
            : {}),
        });
      }

      await login(email.trim(), password);
      const user = await refresh();
      await migrateLocalCartToServerIfNeeded();

      if (user?.account_type === "producer") {
        navigate("/producer/dashboard", { replace: true });
      } else {
        navigate("/products", { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate("/signup/select")}
        >
          ← Back
        </button>

        <h1 className={styles.title}>{pageContent.title}</h1>
        <p className={styles.subtitle}>{pageContent.subtitle}</p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          {accountType === "customer" && org && (
            <div className={styles.inputGroup}>
              <label>Organisation name</label>
              <input
                type="text"
                value={organisationName}
                onChange={(e) => setOrganisationName(e.target.value)}
                placeholder="Enter your organisation name"
              />
            </div>
          )}

          {accountType === "producer" && (
            <>
              <div className={styles.inputGroup}>
                <label>Company name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Company email</label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="Enter your company email"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Company number</label>
                <input
                  type="text"
                  value={companyNumber}
                  onChange={(e) => setCompanyNumber(e.target.value)}
                  placeholder="Enter your company number"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Company description</label>
                <textarea
                  rows={4}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Tell us about your business"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Lead time hours</label>
                <input
                  type="number"
                  min="48"
                  value={leadTimeHours}
                  onChange={(e) => setLeadTimeHours(e.target.value)}
                  placeholder="48"
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Confirm password</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}