import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  migrateLocalCartToServerIfNeeded,
  setCartAuthed,
  clearCartLocal,
} from "../utils/cartStorage";
import { fetchMe, logout as apiLogout } from "../utils/auth";

const AuthContext = createContext(null);
const PRODUCER_SPLASH_SESSION_KEY_PREFIX = "producer-dashboard-splash-seen";

function clearProducerSplashSession() {
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(PRODUCER_SPLASH_SESSION_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore storage errors during logout.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const me = await fetchMe(); // returns user or null if unauthenticated
      setUser(me);
      return me;
    } catch (error) {
      console.error("[auth] failed to refresh user:", error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("[auth] logout failed:", error);
    } finally {
      clearProducerSplashSession();
      setUser(null);
      await clearCartLocal();
      window.dispatchEvent(new Event("auth:updated"));
    }
  }, []);

  useEffect(() => {
    refresh();

    function onAuthUpdated() {
      refresh();
    }

    window.addEventListener("auth:updated", onAuthUpdated);

    return () => {
      window.removeEventListener("auth:updated", onAuthUpdated);
    };
  }, [refresh]);

  useEffect(() => {
    setCartAuthed(Boolean(user));

    if (!user) return;

    async function migrateCartAfterLogin() {
      try {
        await migrateLocalCartToServerIfNeeded(true);
      } catch (error) {
        console.error("[auth] cart migration failed:", error);
      }
    }

    migrateCartAfterLogin();
  }, [user]);

  // check user / account type
  const customerType = user?.organisation?.organisation_type || user?.account_type;
  const canUseRecurringOrders = customerType === "restaurant";

  
  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
      canUseRecurringOrders, //Allow only for restaurant users
    }),
    [user, loading, refresh, logout, canUseRecurringOrders]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
}
