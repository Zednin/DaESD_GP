import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { migrateLocalCartToServerIfNeeded } from "../utils/cartStorage";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    async function completeLogin() {
      try {
        await refresh();
        await migrateLocalCartToServerIfNeeded();

        const next = sessionStorage.getItem("post_login_next") || "/products";
        sessionStorage.removeItem("post_login_next");

        navigate(next, { replace: true });
      } catch (err) {
        console.error("Google login callback failed:", err);
        navigate("/login", { replace: true });
      }
    }

    completeLogin();
  }, [navigate, refresh]);

  return (
    <main className="container" style={{ padding: "64px 0" }}>
      <h1>Signing you in...</h1>
      <p>Please wait while we complete your Google login.</p>
    </main>
  );
}