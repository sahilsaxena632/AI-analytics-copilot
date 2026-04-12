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
import { apiFetch, ApiError } from "@/lib/api";
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

export default function AppDashboardDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { token } = useAuth();
  const [data, setData] = useState<DashboardDetail | null>(null);
  const [connections, setConnections] = useState<SafeConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Record<string, QueryExecuteResultDto | null | "loading" | "error">>({});

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
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
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
      try {
        const res = await apiFetch<QueryExecuteResultDto>("/queries/execute", {
          method: "POST",
          token,
          body: JSON.stringify({ databaseConnectionId: connectionId, sql }),
        });
        setPreview((p) => ({ ...p, [cardId]: res }));
      } catch {
        setPreview((p) => ({ ...p, [cardId]: "error" }));
      }
    },
    [token],
  );

  return (
    <>
      <AppHeader title={data?.name ?? "Dashboard"} subtitle={data?.description ?? ""} />
      <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {loading ? <LoadingState /> : null}
        {!loading && data ? (
          <div className="space-y-6">
            {data.cards.length === 0 ? (
              <Card className="border-dashed border-border bg-card/30">
                <CardContent className="py-10 text-center text-sm text-muted">
                  No cards yet. Add one from Ask query using &quot;Add to dashboard&quot;.
                </CardContent>
              </Card>
            ) : (
              data.cards.map((c) => {
                const conn = connMap.get(c.connectionId);
                const state = preview[c.id];
                return (
                  <Card key={c.id} className="border-border bg-card/40">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">{c.title}</CardTitle>
                        <CardDescription>
                          {c.chartType} chart · {conn ? `${dbLabel(conn.type)} · ${conn.name}` : "Connection"}
                        </CardDescription>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => void runPreview(c.id, c.connectionId, c.sqlText)}>
                        {state === "loading" ? "Loading…" : state && state !== "error" ? "Refresh data" : "Load preview"}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <details className="rounded-md border border-border/60 bg-background/40">
                        <summary className="cursor-pointer px-3 py-2 text-xs text-muted">SQL</summary>
                        <pre className="overflow-x-auto border-t border-border/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                          {c.sqlText}
                        </pre>
                      </details>
                      {state === "error" ? (
                        <p className="text-sm text-red-300">Could not run this query. Check the connection or SQL.</p>
                      ) : null}
                      {state && state !== "loading" && state !== "error" ? (
                        <div className="space-y-4">
                          <DataTable result={state} />
                          {c.chartType !== "table" ? <QueryAutoChart result={state} /> : null}
                        </div>
                      ) : state === "loading" ? (
                        <LoadingState label="Running read-only query…" />
                      ) : (
                        <p className="text-sm text-muted">Load preview to see current data from your database.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : null}
      </main>
    </>
  );
}
