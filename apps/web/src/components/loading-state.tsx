import { Loader2 } from "lucide-react";

export function LoadingState({
  label = "Loading…",
  bordered = false,
}: {
  label?: string;
  /** Use for standalone regions (e.g. full page). Inline buttons should keep the default. */
  bordered?: boolean;
}) {
  const inner = (
    <>
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </>
  );
  if (bordered) {
    return (
      <div
        className="flex items-center justify-center gap-2.5 rounded-lg border border-border/60 bg-card/20 px-4 py-3 text-sm text-muted"
        role="status"
        aria-live="polite"
      >
        {inner}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
      {inner}
    </div>
  );
}
