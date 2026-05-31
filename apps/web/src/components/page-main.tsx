import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent main content area under `AppHeader` across the manager workspace. */
export function PageMain({
  children,
  className,
  gapClassName = "gap-8",
}: {
  children: ReactNode;
  className?: string;
  /** Use `gap-6` for denser list-heavy pages. */
  gapClassName?: "gap-6" | "gap-8";
}) {
  return (
    <main
      className={cn(
        "animate-fade-up mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-6 md:px-8 md:py-8",
        gapClassName,
        className,
      )}
    >
      {children}
    </main>
  );
}
