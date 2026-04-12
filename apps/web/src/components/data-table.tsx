"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { formatCellValue } from "@/lib/format-cell-value";

export function DataTable({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result || result.columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-card/20 px-4 py-10 text-center text-sm text-muted">
        {result && result.columns.length === 0 ? "This query returned no columns." : "Run a query to see rows here."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/20 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-card/90 text-muted">
            <tr>
              {result.columns.map((c) => (
                <th key={c} className="border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="odd:bg-background/25">
                {result.columns.map((c) => (
                  <td key={c} className="border-b border-border/50 px-3 py-2 align-top text-foreground">
                    {formatCellValue(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1 border-t border-border bg-card/50 px-3 py-2.5 text-xs text-muted">
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

