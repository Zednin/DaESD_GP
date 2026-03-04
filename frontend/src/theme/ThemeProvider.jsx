import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "auto"; // "light" | "dark" | "auto"
  });

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      const resolved = theme === "auto" ? (systemDark ? "dark" : "light") : theme;
      root.setAttribute("data-theme", resolved);
    };

    apply();

    // If auto, react to OS changes
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (theme === "auto" && mq?.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (t) => {
      setTheme(t);
      localStorage.setItem("theme", t);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}