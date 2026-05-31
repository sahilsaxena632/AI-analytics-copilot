"use client";

import type { DashboardCardDto, QueryExecuteResultDto } from "@analytics-copilot/shared";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { QueryAutoChart } from "@/components/query-auto-chart";
import { ErrorBanner } from "@/components/error-banner";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCellValue } from "@/lib/format-cell-value";

type SafeConnection = {
  id: string;
  name: string;
  type: "postgres" | "mysql";
};

function dbLabel(t: SafeConnection["type"]): string {
  return t === "mysql" ? "MySQL" : "PostgreSQL";
}

function chartKindLabel(chartType: string): string {
  if (chartType === "line") {
    return "Line";
  }
  if (chartType === "bar") {
    return "Bar";
  }
  return "Table";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatKpiNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 10_000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function labelFromColumn(column: string): string {
  return column.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getKpiSummary(
  preview: QueryExecuteResultDto | null | "loading" | "error" | undefined,
  previewError?: string,
): { value: string; label: string; tone: "normal" | "muted" } {
  if (preview === "loading") {
    return { value: "Loading...", label: "Fetching latest numbers", tone: "muted" };
  }
  if (preview === "error") {
    return { value: "Preview unavailable", label: previewError ?? "Refresh to try again", tone: "muted" };
  }
  if (!preview) {
    return { value: "Loading...", label: "Preparing this KPI", tone: "muted" };
  }
  if (preview.rows.length === 0) {
    return { value: "No rows", label: "This query returned no data", tone: "muted" };
  }
  if (preview.columns.length === 0) {
    return { value: "No value", label: "This query returned no columns", tone: "muted" };
  }

  const firstRow = preview.rows[0];
  const metricColumn = preview.columns.find((column) => toNumber(firstRow[column]) != null) ?? preview.columns[0];
  const rawValue = firstRow[metricColumn];
  const numericValue = toNumber(rawValue);

  return {
    value: numericValue != null ? formatKpiNumber(numericValue) : formatCellValue(rawValue),
    label: labelFromColumn(metricColumn),
    tone: "normal",
  };
}

export type DashboardCardPanelProps = {
  card: DashboardCardDto;
  connection?: SafeConnection;
  editMode: boolean;
  preview: QueryExecuteResultDto | null | "loading" | "error" | undefined;
  previewError?: string;
  chartReflowKey: number;
  onRefresh: () => void;
  onContentHeightChange?: (cardId: string, heightPx: number) => void;
};

export function DashboardCardPanel({
  card,
  connection,
  editMode,
  preview,
  previewError,
  chartReflowKey,
  onRefresh,
  onContentHeightChange,
}: DashboardCardPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const hasMeasuredRef = useRef(false);
  const lastReportedHeightRef = useRef(0);
  const lastVisibilityRef = useRef(`${detailsOpen}:${chartOpen}`);
  const result = preview != null && preview !== "loading" && preview !== "error" ? preview : null;
  const hasResult = result != null;
  const kpi = useMemo(() => getKpiSummary(preview, previewError), [preview, previewError]);

  useLayoutEffect(() => {
    if (!onContentHeightChange) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const nextHeight = measureRef.current?.scrollHeight ?? 0;
      const visibilityKey = `${detailsOpen}:${chartOpen}`;
      const visibilityChanged = visibilityKey !== lastVisibilityRef.current;
      const shouldReport = hasMeasuredRef.current && (visibilityChanged || detailsOpen || chartOpen);

      hasMeasuredRef.current = true;
      lastVisibilityRef.current = visibilityKey;

      if (shouldReport && nextHeight > 0 && Math.abs(nextHeight - lastReportedHeightRef.current) > 8) {
        lastReportedHeightRef.current = nextHeight;
        onContentHeightChange(card.id, nextHeight);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [card.id, chartOpen, detailsOpen, onContentHeightChange, preview, result]);

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        editMode ? "overflow-hidden ring-1 ring-primary/15" : "overflow-hidden",
      )}
    >
      <div ref={measureRef}>
        <CardHeader className="space-y-0 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div
              className={cn(
                "flex min-w-0 flex-1 gap-2",
                editMode && "dashboard-card-drag-handle cursor-grab rounded-md py-0.5 active:cursor-grabbing",
              )}
            >
              {editMode ? (
                <GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground opacity-70" aria-hidden />
              ) : null}
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="line-clamp-2 text-base sm:text-lg">{card.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{chartKindLabel(card.chartType)} view</p>
              </div>
            </div>
            <div className="dashboard-card-no-drag flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setDetailsOpen((open) => !open)}
              >
                {detailsOpen ? "Hide details" : "Details"}
              </Button>
              <Button
                type="button"
                variant={chartOpen ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={!hasResult}
                onClick={() => setChartOpen((open) => !open)}
              >
                {chartOpen ? "Hide chart" : "Chart"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={preview === "loading"}
                onClick={() => void onRefresh()}
              >
                {preview === "loading" || preview === undefined ? "Loading..." : preview === "error" ? "Retry" : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-col gap-4 pt-0">
          <div className="rounded-xl border border-border/70 bg-background/35 px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/85">KPI</p>
            <div
              className={cn(
                "mt-1 truncate text-4xl font-semibold tracking-tight tabular-nums sm:text-[2.55rem]",
                kpi.tone === "normal" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {kpi.value}
            </div>
            <p className="mt-1.5 truncate text-sm text-muted-foreground">{kpi.label}</p>
          </div>

          {detailsOpen ? (
            <div className="dashboard-card-no-drag flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border border-border/60 bg-background/25 p-3.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{connection ? `${dbLabel(connection.type)} · ${connection.name}` : "Database"}</span>
                {result ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
                      {result.truncated ? " (truncated)" : ""}
                    </span>
                  </>
                ) : null}
              </div>

              <details className="rounded-lg border border-border/60 bg-card/20">
                <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted-foreground">SQL</summary>
                <pre className="overflow-x-auto border-t border-border/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {card.sqlText}
                </pre>
              </details>

              {preview === "error" && previewError ? (
                <ErrorBanner title="Preview didn’t load" message={previewError} />
              ) : null}

              {result ? (
                <div className="min-h-0 overflow-auto">
                  <DataTable result={result} />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border/70 bg-card/20 px-3 py-4 text-sm text-muted-foreground">
                  Preview data will appear here once it finishes loading.
                </p>
              )}
            </div>
          ) : null}

          {chartOpen && result ? (
            <div className="dashboard-card-no-drag h-[320px] min-h-[320px] w-full shrink-0" key={`chart-${card.id}-${chartReflowKey}`}>
              <QueryAutoChart result={result} preferredChartType={card.chartType as "bar" | "line" | "table"} />
            </div>
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
