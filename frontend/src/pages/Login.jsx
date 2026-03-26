import { useState } from "react";
import styles from "./Login.module.css";
import { FaGoogle } from "react-icons/fa";
import { motion } from "framer-motion";
import { login, signupCustomer, signupProducer } from "../utils/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { migrateLocalCartToServerIfNeeded } from "../utils/cartStorage";

const CUSTOMER_ORGANISATION_OPTIONS = [
  { value: "", label: "Individual customer" },
  { value: "restaurant", label: "Restaurant" },
  { value: "community_group", label: "Community Group" },
  { value: "charity", label: "Charity" },
  { value: "education", label: "Education" },
];

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [accountType, setAccountType] = useState("customer"); // "customer" | "producer"
  const [organisationType, setOrganisationType] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup-only
  const [username, setUsername] = useState("");
  const [password2, setPassword2] = useState("");

  // producer-only
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [leadTimeHours, setLeadTimeHours] = useState("48");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();

  function clearError() {
    setError("");
  }

  function resetProducerFields() {
    setCompanyName("");
    setCompanyEmail("");
    setCompanyNumber("");
    setCompanyDescription("");
    setLeadTimeHours("48");
  }

  function resetCustomerFields() {
    setOrganisationType("");
    setOrganisationName("");
  }

  function resetSignupFields() {
    setUsername("");
    setPassword("");
    setPassword2("");
    resetProducerFields();
    resetCustomerFields();
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setPassword2("");

    if (nextMode === "login") {
      resetSignupFields();
      setAccountType("customer");
    }
  }

  function handleAccountTypeChange(e) {
    const nextType = e.target.value;
    setAccountType(nextType);
    clearError();

    if (nextType === "customer") {
      resetProducerFields();
    } else {
      resetCustomerFields();
    }
  }

  function validateLogin() {
    if (!email.trim()) {
      return "Email is required";
    }

    if (!password) {
      return "Password is required";
    }

    return "";
  }

  function validateSignup() {
    if (!username.trim()) {
      return "Username is required";
    }

    if (!email.trim()) {
      return "Email is required";
    }

    if (!password) {
      return "Password is required";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }

    if (password !== password2) {
      return "Passwords do not match";
    }

    if (accountType === "customer") {
      const validOrganisationTypes = CUSTOMER_ORGANISATION_OPTIONS.map(
        (option) => option.value
      );

      if (!validOrganisationTypes.includes(organisationType)) {
        return "Invalid organisation type";
      }

      if (organisationType && !organisationName.trim()) {
        return "Organisation name is required";
      }

      if (!organisationType && organisationName.trim()) {
        return "Please select an organisation type";
      }
    }

    if (accountType === "producer") {
      if (!companyName.trim()) {
        return "Company name is required";
      }

      if (!companyNumber.trim()) {
        return "Company number is required";
      }

      const leadTime = Number(leadTimeHours);
      if (!Number.isFinite(leadTime) || leadTime < 48) {
        return "Lead time must be at least 48 hours";
      }
    }

    return "";
  }

  function getSignupSubtitle() {
    if (accountType === "producer") {
      return "Sign up to create your producer account";
    }

    if (organisationType === "restaurant") {
      return "Sign up to place recurring orders";
    }

    if (organisationType === "community_group") {
      return "Sign up to place bulk orders";
    }

    return "Sign up to start ordering";
  // Google Login
  function handleGoogleLogin() {
    const next = searchParams.get("next") || "/products";
    sessionStorage.setItem("post_login_next", next);

    window.location.href = "http://localhost:8000/api/accounts/google/login/?process=login";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      if (mode === "login") {
        const loginError = validateLogin();
        if (loginError) {
          throw new Error(loginError);
        }

        await login(email.trim(), password);
      } else {
        const signupError = validateSignup();
        if (signupError) {
          throw new Error(signupError);
        }

        if (accountType === "customer") {
          await signupCustomer({
            username: username.trim(),
            email: email.trim(),
            password,
            ...(organisationType ? { organisation_type: organisationType } : {}),
            ...(organisationName.trim()
              ? { organisation_name: organisationName.trim() }
              : {}),
          });
        } else {
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
        }

        await login(email.trim(), password);
      }

      const user = await refresh();
      await migrateLocalCartToServerIfNeeded();

      const next = searchParams.get("next");

      if (next) {
        navigate(next, { replace: true });
      } else if (user?.account_type === "producer") {
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
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className={styles.title}>
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>

        <p className={styles.subtitle}>
          {mode === "login" ? "Sign in to your account" : getSignupSubtitle()}
        </p>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#FEF2F2",
              color: "#991B1B",
              border: "1px solid #FCA5A5",
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={styles.form}
          autoComplete="off"
        >
          {mode === "signup" && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="accountType">
                  Account type
                </label>
                <select
                  id="accountType"
                  className={styles.input}
                  value={accountType}
                  onChange={handleAccountTypeChange}
                >
                  <option value="customer">Customer</option>
                  <option value="producer">Producer</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  className={styles.input}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearError();
                  }}
                  required
                  autoComplete="username"
                />
              </div>
            </>
          )}

          {mode === "signup" && accountType === "customer" && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="organisationType">
                  Organisation type
                </label>
                <select
                  id="organisationType"
                  className={styles.input}
                  value={organisationType}
                  onChange={(e) => {
                    setOrganisationType(e.target.value);
                    if (!e.target.value) {
                      setOrganisationName("");
                    }
                    clearError();
                  }}
                >
                  {CUSTOMER_ORGANISATION_OPTIONS.map((option) => (
                    <option key={option.value || "individual"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {organisationType && (
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="organisationName">
                    Organisation name
                  </label>
                  <input
                    id="organisationName"
                    type="text"
                    placeholder="Enter your organisation name"
                    className={styles.input}
                    value={organisationName}
                    onChange={(e) => {
                      setOrganisationName(e.target.value);
                      clearError();
                    }}
                    required
                  />
                </div>
              )}
            </>
          )}

          {mode === "signup" && accountType === "producer" && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="companyName">
                  Company name
                </label>
                <input
                  id="companyName"
                  type="text"
                  placeholder="Enter your company name"
                  className={styles.input}
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    clearError();
                  }}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="companyEmail">
                  Company email
                </label>
                <input
                  id="companyEmail"
                  type="email"
                  placeholder="Enter your company email"
                  className={styles.input}
                  value={companyEmail}
                  onChange={(e) => {
                    setCompanyEmail(e.target.value);
                    clearError();
                  }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="companyNumber">
                  Company number
                </label>
                <input
                  id="companyNumber"
                  type="text"
                  placeholder="Enter your company number"
                  className={styles.input}
                  value={companyNumber}
                  onChange={(e) => {
                    setCompanyNumber(e.target.value);
                    clearError();
                  }}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="companyDescription">
                  Company description
                </label>
                <textarea
                  id="companyDescription"
                  placeholder="Tell us a little about your business"
                  className={styles.input}
                  value={companyDescription}
                  onChange={(e) => {
                    setCompanyDescription(e.target.value);
                    clearError();
                  }}
                  rows={4}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="leadTimeHours">
                  Lead time hours
                </label>
                <input
                  id="leadTimeHours"
                  type="number"
                  min="48"
                  placeholder="48"
                  className={styles.input}
                  value={leadTimeHours}
                  onChange={(e) => {
                    setLeadTimeHours(e.target.value);
                    clearError();
                  }}
                  required
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={styles.input}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "signup" && (
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="password2">
                Confirm Password
              </label>
              <input
                id="password2"
                type="password"
                placeholder="Re-enter your password"
                className={styles.input}
                value={password2}
                onChange={(e) => {
                  setPassword2(e.target.value);
                  clearError();
                }}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {mode === "login" && (
            <a href="#" className={styles.forgotPassword}>
              Forgot password?
            </a>
          )}

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign In"
              : `Sign Up as ${
                  accountType === "producer"
                    ? "Producer"
                    : organisationType === "restaurant"
                    ? "Restaurant Customer"
                    : organisationType === "community_group"
                    ? "Community Group"
                    : organisationType === "charity"
                    ? "Charity"
                    : organisationType === "education"
                    ? "Education"
                    : "Customer"
                }`}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Social placeholders */}
        <button className={styles.googleBtn} onClick={handleGoogleLogin}>
          <FaGoogle />
          Continue with Google
        </button>

        <button type="button" className={styles.appleBtn} disabled>
          <span className={styles.appleIcon}></span>
          Continue with Apple
        </button>

        <p className={styles.register}>
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  switchMode("signup");
                }}
              >
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  switchMode("login");
                }}
              >
                Sign in
              </a>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}