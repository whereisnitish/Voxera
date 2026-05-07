import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const KEY = "voxera_theme";

interface ThemeState {
  theme: Theme;       // user preference (may be "system")
  resolved: Resolved; // what's actually applied
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

function systemPref(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function apply(resolved: Resolved) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStored());
  const [resolved, setResolved] = useState<Resolved>(() =>
    readStored() === "system" ? systemPref() : (readStored() as Resolved),
  );

  // Apply when resolved changes
  useEffect(() => {
    apply(resolved);
  }, [resolved]);

  // Recompute resolved whenever the user preference changes
  useEffect(() => {
    setResolved(theme === "system" ? systemPref() : theme);
  }, [theme]);

  // Track OS-level changes while in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/* Pre-paint script: prevents a flash of the wrong theme.
 * Inline this in index.html before the React bundle if you ever add SSR. */
export const themeBootScript = `
(function () {
  try {
    var v = localStorage.getItem(${JSON.stringify(KEY)});
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var resolved = (v === 'light' || v === 'dark') ? v : sys;
    var el = document.documentElement;
    if (resolved === 'dark') el.classList.add('dark');
    el.style.colorScheme = resolved;
  } catch (e) {}
})();
`;
