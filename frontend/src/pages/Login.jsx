import { useState } from "react";
import styles from "./Login.module.css";
import { FaGoogle, FaArrowRight } from "react-icons/fa";
import { motion } from "framer-motion";
import { login } from "../utils/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { migrateLocalCartToServerIfNeeded } from "../utils/cartStorage";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();

  function clearError() {
    setError("");
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

  function handleGoogleLogin() {
    const next = searchParams.get("next") || "/products";
    sessionStorage.setItem("post_login_next", next);

    window.location.href =
      "http://localhost:8000/api/accounts/google/login/?process=login";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      const loginError = validateLogin();
      if (loginError) {
        throw new Error(loginError);
      }

      await login(email.trim(), password);

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
    <div className={styles.page}>
      <div className={styles.bgGlowOne} />
      <div className={styles.bgGlowTwo} />

      <div className={styles.layout}>
        <motion.div
          className={styles.hero}
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className={styles.eyebrow}>Fresh food marketplace</p>
          <h1 className={styles.heroTitle}>
            Source smarter.
            <br />
            Sell fresher.
            <br />
            Grow faster.
          </h1>
          <p className={styles.heroText}>
            Connect customers, restaurants, community groups, charities,
            education buyers, and producers in one beautifully simple platform.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <span className={styles.featureDot} />
              Fast ordering for customers and organisations
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureDot} />
              Dedicated producer accounts and dashboard access
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureDot} />
              Seamless cart, checkout, and marketplace flow
            </div>
          </div>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in to your account</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form
            onSubmit={handleSubmit}
            className={styles.form}
            autoComplete="off"
          >
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
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="password">
                  Password
                </label>
                <a href="#" className={styles.forgotPassword}>
                  Forgot password?
                </a>
              </div>

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
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? "Please wait..." : "Sign In"}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or continue with</span>
          </div>

          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
          >
            <FaGoogle />
            Continue with Google
          </button>

          <button type="button" className={styles.appleBtn} disabled>
            <span className={styles.appleIcon}></span>
            Continue with Apple
          </button>

          <div className={styles.signupPanel}>
            <div>
              <p className={styles.signupTitle}>New to the marketplace?</p>
              <p className={styles.signupText}>
                Create a tailored account for customers, organisations, or
                producers.
              </p>
            </div>

            <button
              type="button"
              className={styles.signupBtn}
              onClick={() => navigate("/signup/select")}
            >
              Sign up
              <FaArrowRight />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}