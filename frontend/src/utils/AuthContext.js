import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe } from "./auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleAuthUpdated = () => {
      refreshUser();
    };

    window.addEventListener("auth:updated", handleAuthUpdated);

    return () => {
      window.removeEventListener("auth:updated", handleAuthUpdated);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}