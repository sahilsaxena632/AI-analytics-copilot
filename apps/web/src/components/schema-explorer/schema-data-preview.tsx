"use client";

import type { SchemaTablePreviewDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

type Props = {
  preview: SchemaTablePreviewDto | null;
  loading: boolean;
  error: string | null;
  title?: string;
};

export function SchemaDataPreview({ preview, loading, error, title = "Sample rows" }: Props) {
  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          Read-only preview (up to 10 rows). Values are shown as returned by the database driver.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingState label="Loading sample rows…" />
          </div>
        ) : !preview || preview.columns.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Select a table to preview rows.</p>
        ) : (
          <>
            {preview.truncated ? (
              <p className="mb-2 text-xs text-muted">Showing the first rows; more exist in this table.</p>
            ) : null}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    {preview.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-border/60 odd:bg-background/30">
                      {preview.columns.map((col) => (
                        <td key={col} className="max-w-[240px] truncate px-3 py-2 text-muted" title={formatCell(row[col])}>
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
