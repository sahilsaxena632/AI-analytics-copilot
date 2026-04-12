"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { QueryAutoChart } from "@/components/query-auto-chart";
import { ErrorBanner } from "@/components/error-banner";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";

type DashboardDetail = {
  id: string;
  name: string;
  description: string | null;
  cards: Array<{
    id: string;
    title: string;
    chartType: string;
    sqlText: string;
    connectionId: string;
  }>;
};

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

export default function AppDashboardDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { token } = useAuth();
  const [data, setData] = useState<DashboardDetail | null>(null);
  const [connections, setConnections] = useState<SafeConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Record<string, QueryExecuteResultDto | null | "loading" | "error">>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<DashboardDetail>(`/dashboards/${id}`, { token }),
      apiFetch<SafeConnection[]>("/database-connections", { token }),
    ])
      .then(([dash, conns]) => {
        setData(dash);
        setConnections(conns);
      })
      .catch((e) => setError(friendlyApiMessage(e, "This dashboard could not be loaded.")))
      .finally(() => setLoading(false));
  }, [token, id]);

  const connMap = useMemo(() => {
    const m = new Map<string, SafeConnection>();
    for (const c of connections) {
      m.set(c.id, c);
    }
    return m;
  }, [connections]);

  const runPreview = useCallback(
    async (cardId: string, connectionId: string, sql: string) => {
      if (!token) {
        return;
      }
      setPreview((p) => ({ ...p, [cardId]: "loading" }));
      setPreviewErrors((m) => {
        const next = { ...m };
        delete next[cardId];
        return next;
      });
      try {
        const res = await apiFetch<QueryExecuteResultDto>("/queries/execute", {
          method: "POST",
          token,
          body: JSON.stringify({ databaseConnectionId: connectionId, sql }),
        });
        setPreview((p) => ({ ...p, [cardId]: res }));
      } catch (e) {
        setPreview((p) => ({ ...p, [cardId]: "error" }));
        setPreviewErrors((m) => ({
          ...m,
          [cardId]: friendlyApiMessage(e, "This card could not be refreshed right now."),
        }));
      }
    },
    [token],
  );

  return (
    <>
      <AppHeader title={data?.name ?? "Dashboard"} subtitle={data?.description ?? ""} />
      <PageMain gapClassName="gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {loading ? <LoadingState label="Loading dashboard…" /> : null}
        {!loading && data ? (
          <div className="space-y-6">
            {data.cards.length === 0 ? (
              <Card className="border-dashed border-border bg-card/30">
                <CardContent className="py-10 text-center text-sm leading-relaxed text-muted">
                  No cards yet. Use <span className="font-medium text-foreground">Ask query</span> and choose{" "}
                  <span className="font-medium text-foreground">Add to dashboard</span> to pin a result here.
                </CardContent>
              </Card>
            ) : (
              data.cards.map((c) => {
                const conn = connMap.get(c.connectionId);
                const state = preview[c.id];
                return (
                  <Card key={c.id} className="border-border bg-card/40 shadow-sm">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">{c.title}</CardTitle>
                        <CardDescription>
                          {chartKindLabel(c.chartType)} · {conn ? `${dbLabel(conn.type)} · ${conn.name}` : "Database"}
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => void runPreview(c.id, c.connectionId, c.sqlText)}
                      >
                        {state === "loading" ? "Loading…" : state && state !== "error" ? "Refresh data" : "Load preview"}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <details className="rounded-lg border border-border/60 bg-background/40">
                        <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted">
                          View SQL
                        </summary>
                        <pre className="overflow-x-auto border-t border-border/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                          {c.sqlText}
                        </pre>
                      </details>
                      {state === "error" && previewErrors[c.id] ? (
                        <ErrorBanner title="Preview didn’t load" message={previewErrors[c.id]} />
                      ) : null}
                      {state && state !== "loading" && state !== "error" ? (
                        <div className="space-y-4">
                          <DataTable result={state} />
                          {c.chartType !== "table" ? <QueryAutoChart result={state} /> : null}
                        </div>
                      ) : state === "loading" ? (
                        <LoadingState label="Fetching latest numbers…" />
                      ) : (
                        <p className="rounded-lg border border-dashed border-border/70 bg-card/20 px-3 py-4 text-sm text-muted">
                          Load preview to pull the current numbers from your database.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : null}
      </PageMain>
    </>
  );
}
