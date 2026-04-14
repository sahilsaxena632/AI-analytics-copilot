"use client";

import type { DashboardCardDto, QueryExecuteResultDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { QueryAutoChart } from "@/components/query-auto-chart";
import { ErrorBanner } from "@/components/error-banner";
import { LoadingState } from "@/components/loading-state";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

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

export type DashboardCardPanelProps = {
  card: DashboardCardDto;
  connection?: SafeConnection;
  editMode: boolean;
  preview: QueryExecuteResultDto | null | "loading" | "error" | undefined;
  previewError?: string;
  chartReflowKey: number;
  onRefresh: () => void;
};

export function DashboardCardPanel({
  card,
  connection,
  editMode,
  preview,
  previewError,
  chartReflowKey,
  onRefresh,
}: DashboardCardPanelProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden border-border bg-card/40 shadow-sm",
        editMode && "ring-1 ring-primary/15",
      )}
    >
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div
          className={cn(
            "flex min-w-0 flex-1 gap-2",
            editMode && "dashboard-card-drag-handle cursor-grab rounded-md py-0.5 active:cursor-grabbing",
          )}
        >
          {editMode ? (
            <GripVertical
              className="mt-0.5 h-5 w-5 shrink-0 text-muted opacity-70"
              aria-hidden
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{card.title}</CardTitle>
            <CardDescription>
              {chartKindLabel(card.chartType)} ·{" "}
              {connection ? `${dbLabel(connection.type)} · ${connection.name}` : "Database"}
            </CardDescription>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="dashboard-card-no-drag whitespace-nowrap"
          onClick={() => void onRefresh()}
        >
          {preview === "loading" ? "Loading…" : preview && preview !== "error" ? "Refresh data" : "Load preview"}
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-0">
        <details className="dashboard-card-no-drag rounded-lg border border-border/60 bg-background/40">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted">View SQL</summary>
          <pre className="overflow-x-auto border-t border-border/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
            {card.sqlText}
          </pre>
        </details>
        {preview === "error" && previewError ? (
          <ErrorBanner title="Preview didn’t load" message={previewError} />
        ) : null}
        {preview && preview !== "loading" && preview !== "error" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="dashboard-card-no-drag min-h-0 shrink-0 overflow-auto">
              <DataTable result={preview} />
            </div>
            {card.chartType !== "table" ? (
              <div className="dashboard-card-no-drag min-h-[220px] w-full shrink-0" key={`chart-${card.id}-${chartReflowKey}`}>
                <QueryAutoChart result={preview} />
              </div>
            ) : null}
          </div>
        ) : preview === "loading" ? (
          <LoadingState label="Fetching latest numbers…" />
        ) : (
          <p className="rounded-lg border border-dashed border-border/70 bg-card/20 px-3 py-4 text-sm text-muted">
            Load preview to pull the current numbers from your database.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
