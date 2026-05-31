"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { formatCellValue } from "@/lib/format-cell-value";

export function DataTable({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result || result.columns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/65 bg-background/25 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">
          {result && result.columns.length === 0 ? "No columns in this result" : "No table yet"}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {result && result.columns.length === 0
            ? "The query completed but returned no column definitions."
            : "Run a query to see rows and column values here."}
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up overflow-hidden rounded-xl border border-border/60 bg-card/55 shadow-soft">
      <div className="max-h-[min(60vh,520px)] overflow-auto overscroll-contain">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/95 backdrop-blur-sm">
            <tr>
              {result.columns.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {result.rows.map((row, i) => (
              <tr key={i} className="even:bg-background/5 transition-colors hover:bg-background/12">
                {result.columns.map((c) => (
                  <td key={c} className="px-4 py-3 align-top text-foreground/95">
                    {formatCellValue(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-border/55 bg-background/35 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
            {result.truncated ? " (truncated)" : ""}
            {result.durationMs != null ? ` · ${result.durationMs} ms` : ""}
          </span>
        </div>
        {result.warnings?.length ? (
          <ul className="list-inside list-disc text-amber-200/90">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
