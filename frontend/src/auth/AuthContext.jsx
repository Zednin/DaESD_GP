import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, logout as apiLogout } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const me = await fetchMe(); // returns null if not logged in
      setUser(me);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await apiLogout();
    await refresh();
  }

  useEffect(() => {
    refresh();

    function onAuthUpdated() {
      refresh();
    }
    window.addEventListener("auth:updated", onAuthUpdated);
    return () => window.removeEventListener("auth:updated", onAuthUpdated);
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}