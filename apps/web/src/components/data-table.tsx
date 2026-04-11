"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";

export function DataTable({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result || result.columns.length === 0) {
    return <p className="text-sm text-muted">No rows to display.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-card/80 text-muted">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="border-b border-border px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="odd:bg-background/40">
              {result.columns.map((c) => (
                <td key={c} className="border-b border-border/60 px-3 py-2 align-top text-foreground">
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-1 border-t border-border bg-card/40 px-3 py-2 text-xs text-muted">
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

function formatCell(v: unknown) {
  if (v === null || v === undefined) {
    return "—";
  }
  if (typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}
