"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor = "blue" | "emerald" | "violet" | "orange" | "rose" | "slate";

/** Single source of truth for the available modes — extend here to add more. */
export const THEME_MODES: { id: ThemeMode; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Single source of truth for accents — add a swatch here and a CSS block in globals.css. */
export const ACCENT_COLORS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: "blue", label: "Blue", swatch: "hsl(217 91% 60%)" },
  { id: "emerald", label: "Emerald", swatch: "hsl(152 64% 44%)" },
  { id: "violet", label: "Violet", swatch: "hsl(262 83% 63%)" },
  { id: "orange", label: "Orange", swatch: "hsl(25 95% 56%)" },
  { id: "rose", label: "Rose", swatch: "hsl(347 82% 60%)" },
  { id: "slate", label: "Slate", swatch: "hsl(215 28% 55%)" },
];

const MODE_KEY = "analytics-copilot-mode";
const ACCENT_KEY = "analytics-copilot-accent";
const LEGACY_KEY = "analytics-copilot-theme";
const TRANSITION_MS = 360;

const MODE_IDS = THEME_MODES.map((m) => m.id);
const ACCENT_IDS = ACCENT_COLORS.map((a) => a.id);

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  /** Effective light/dark after resolving "system". */
  resolvedMode: "dark" | "light";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveMode(mode: ThemeMode): "dark" | "light" {
  return mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  try {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (stored && MODE_IDS.includes(stored as ThemeMode)) {
      return stored as ThemeMode;
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy === "light") return "light";
    if (legacy === "dark" || legacy === "green") return "dark";
  } catch {
    /* ignore storage access errors */
  }
  return "dark";
}

function readStoredAccent(): AccentColor {
  if (typeof window === "undefined") {
    return "blue";
  }
  try {
    const stored = window.localStorage.getItem(ACCENT_KEY);
    if (stored && ACCENT_IDS.includes(stored as AccentColor)) {
      return stored as AccentColor;
    }
    if (window.localStorage.getItem(LEGACY_KEY) === "green") {
      return "emerald";
    }
  } catch {
    /* ignore storage access errors */
  }
  return "blue";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);
  const [accent, setAccent] = useState<AccentColor>(readStoredAccent);
  const [resolvedMode, setResolvedMode] = useState<"dark" | "light">(() => resolveMode(readStoredMode()));
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginTransition = useCallback(() => {
    const el = document.documentElement;
    el.classList.add("theme-transition");
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => el.classList.remove("theme-transition"), TRANSITION_MS);
  }, []);

  const applyResolved = useCallback((resolved: "dark" | "light", nextAccent: AccentColor) => {
    const el = document.documentElement;
    el.setAttribute("data-mode", resolved);
    el.setAttribute("data-accent", nextAccent);
    el.classList.toggle("dark", resolved === "dark");
    setResolvedMode(resolved);
  }, []);

  // Apply attributes whenever the preference changes (and animate after first paint).
  useEffect(() => {
    const resolved = resolveMode(mode);
    if (initialized.current) {
      beginTransition();
    }
    applyResolved(resolved, accent);
    try {
      window.localStorage.setItem(MODE_KEY, mode);
      window.localStorage.setItem(ACCENT_KEY, accent);
    } catch {
      /* ignore storage access errors */
    }
    initialized.current = true;
  }, [mode, accent, applyResolved, beginTransition]);

  // Track OS preference changes while in "system" mode.
  useEffect(() => {
    if (mode !== "system") {
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      beginTransition();
      applyResolved(mql.matches ? "dark" : "light", accent);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode, accent, applyResolved, beginTransition]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, accent, setAccent, resolvedMode }),
    [mode, accent, resolvedMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
