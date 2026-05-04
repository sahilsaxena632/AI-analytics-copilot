"use client";

import type { SchemaTablePreviewDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner } from "@/components/error-banner";
import { LoadingState } from "@/components/loading-state";
import { formatCellValue } from "@/lib/format-cell-value";

type Props = {
  preview: SchemaTablePreviewDto | null;
  loading: boolean;
  error: string | null;
  title?: string;
};

export function SchemaDataPreview({ preview, loading, error, title = "Sample rows" }: Props) {
  return (
    <Card className="bg-card/75">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          Read-only preview (up to 10 rows). Values are shown as returned by the database driver.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? <ErrorBanner title="Preview didn’t load" message={error} /> : null}
        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingState label="Loading sample rows…" />
          </div>
        ) : !preview || preview.columns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/25 py-6 text-center text-sm text-muted-foreground">
            Select a table to preview rows.
          </p>
        ) : (
          <>
            {preview.truncated ? (
              <p className="mb-2 text-xs text-muted-foreground">Showing the first rows; more exist in this table.</p>
            ) : null}
            <div className="overflow-hidden rounded-lg border border-border/60 bg-background/25">
              <div className="max-h-[420px] overflow-auto overscroll-contain">
                <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                  <tr>
                    {preview.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {preview.rows.map((row, ri) => (
                      <tr key={ri} className="even:bg-background/5">
                        {preview.columns.map((col) => (
                          <td
                            key={col}
                            className="max-w-[240px] truncate px-3 py-2.5 text-foreground/90"
                            title={formatCellValue(row[col])}
                          >
                            {formatCellValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
