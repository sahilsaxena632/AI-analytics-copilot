import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-md bg-background/45", className)} {...props} />;
}

/** Placeholder rows while list data loads. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Simple card-shaped placeholder. */
export function CardSkeleton() {
  return (
    <div className="surface-elevated p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-3 h-5 w-1/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-[85%]" />
    </div>
  );
}

/** KPI-shaped placeholder for dashboard metric grids. */
export function KpiSkeleton() {
  return (
    <div className="surface-elevated p-5" aria-busy="true" aria-label="Loading metric">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-5 h-7 w-28" />
    </div>
  );
}

/** Chart-shaped placeholder for visualization panels. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("surface-elevated p-5", className)} aria-busy="true" aria-label="Loading chart">
      <Skeleton className="mb-2 h-5 w-40" />
      <Skeleton className="mb-6 h-3.5 w-56" />
      <div className="flex h-48 items-end gap-2.5">
        {[60, 85, 45, 70, 95, 55, 80, 40, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
