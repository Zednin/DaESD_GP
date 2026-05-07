export function applyColourblindMode(enabled) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (enabled) {
    root.dataset.colourblind = "true";
  } else {
    delete root.dataset.colourblind;
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("colourblindMode", enabled ? "true" : "false");
  }
}

export function loadColourblindMode() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("colourblindMode") === "true";
}
