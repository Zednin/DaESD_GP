import styles from "./Login.module.css";
import { FaGoogle } from "react-icons/fa";
import { motion } from "framer-motion";

export default function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // login logic
  };

  return (
    <div className={styles.container}>
        <motion.div 
            className={styles.card}
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }} 
            >

        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className={styles.input}
              required
            />
          </div>

          <a href="#" className={styles.forgotPassword}>Forgot password?</a>

          <button type="submit" className={styles.loginBtn}>
            Sign In
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Google Sign In - placeholder */}
        <button className={styles.googleBtn}>
          <FaGoogle />
          Continue with Google
        </button>

        {/* Apple Sign In - placeholder */}
        <button type="button" className={styles.appleBtn}>
          <span className={styles.appleIcon}></span>
          Continue with Apple
        </button>

        <p className={styles.register}>
          Don't have an account? <a href="#">Sign up</a>
        </p>

      </motion.div>
    </div>
  );
}