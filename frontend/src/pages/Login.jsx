import { useState } from "react";
import styles from "./Login.module.css";
import { FaGoogle } from "react-icons/fa";
import { motion } from "framer-motion";
import { login, signup } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup-only
  const [username, setUsername] = useState("");
  const [password2, setPassword2] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/products"); // or wherever
      } else {
        await signup({ username, email, password1: password, password2 });
        // Option A: registration may already log you in (depends on config)
        // Safer: perform login after signup
        await login(email, password);
        navigate("/products");
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
          {mode === "login"
            ? "Sign in to your account"
            : "Sign up to start ordering"}
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
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === "signup" && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Username</label>
              <input
                type="text"
                placeholder="Choose a username"
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === "signup" && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter your password"
                className={styles.input}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
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
              : "Sign Up"}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Social placeholders */}
        <button className={styles.googleBtn} disabled>
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
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setError(""); }}>
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }}>
                Sign in
              </a>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}