"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { ACCENT_COLORS, THEME_MODES, useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { mode, setMode, accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Theme settings"
        title="Theme"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-card ring-2 ring-ring",
        )}
      >
        <Palette className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Theme settings"
          className="animate-scale-in absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-border/70 bg-card/95 p-3 shadow-elevated backdrop-blur-xl"
        >
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_MODES.map(({ id, label, icon: Icon }) => {
              const active = mounted && mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all",
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/60 bg-background/30 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-primary")} />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="px-1 pb-2 pt-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Accent
          </p>
          <div className="grid grid-cols-6 gap-2 px-0.5">
            {ACCENT_COLORS.map(({ id, label, swatch }) => {
              const active = mounted && accent === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccent(id)}
                  title={label}
                  aria-label={`${label} accent`}
                  aria-pressed={active}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-ring",
                    active ? "ring-foreground" : "ring-transparent",
                  )}
                  style={{ backgroundColor: swatch }}
                >
                  {active ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
