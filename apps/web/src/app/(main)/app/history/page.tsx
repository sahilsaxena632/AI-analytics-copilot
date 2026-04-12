"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QueryRunHistoryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Clock, Database, HelpCircle, Tag } from "lucide-react";

function dbLabel(t: QueryRunHistoryDto["databaseType"]): string {
  return t === "mysql" ? "MySQL" : "PostgreSQL";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AppHistoryPage() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<QueryRunHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await apiFetch<QueryRunHistoryDto[]>("/query-runs", { token });
      setRuns(rows);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void load();
  }, [token, load]);

  const empty = useMemo(() => !loading && runs.length === 0 && !error, [loading, runs.length, error]);

  return (
    <>
      <AppHeader
        title="Query history"
        subtitle="Recent questions and runs across your databases — easy to scan for managers."
      />
      <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        {!token ? (
          <EmptyState title="Sign in required" description="Sign in to see your organization’s query history." />
        ) : error ? (
          <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : loading ? (
          <LoadingState label="Loading history…" />
        ) : empty ? (
          <EmptyState
            title="No runs yet"
            description="Run a query from Ask query. Successful and failed runs appear here with the question when available."
          />
        ) : (
          <div className="space-y-4">
            <div className="hidden overflow-hidden rounded-lg border border-border md:block">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-card/90 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Question</th>
                    <th className="px-4 py-3 font-medium">Saved name</th>
                    <th className="px-4 py-3 font-medium">Database</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const q = r.naturalLanguageQuestion?.trim() || r.savedQueryQuestion?.trim() || "—";
                    const saved = r.savedQueryTitle?.trim() || "—";
                    return (
                      <tr key={r.id} className="border-t border-border/70 odd:bg-background/30">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatWhen(r.createdAt)}</td>
                        <td className="max-w-[280px] px-4 py-3 text-foreground" title={q}>
                          <span className="line-clamp-2">{q}</span>
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-muted" title={saved}>
                          <span className="line-clamp-2">{saved}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                          {dbLabel(r.databaseType)}
                          <span className="block text-[11px] text-muted/80">{r.connectionName}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.success ? (
                            <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-xs text-emerald-200">Success</span>
                          ) : (
                            <span
                              className="rounded-full bg-red-950/60 px-2 py-0.5 text-xs text-red-200"
                              title={r.errorMessage ?? ""}
                            >
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{r.rowCount ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {runs.map((r) => {
                const q = r.naturalLanguageQuestion?.trim() || r.savedQueryQuestion?.trim() || "—";
                const saved = r.savedQueryTitle?.trim() || "—";
                return (
                  <Card key={r.id} className="border-border bg-card/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-medium leading-snug">{q}</CardTitle>
                        {r.success ? (
                          <span className="shrink-0 rounded-full bg-emerald-950/60 px-2 py-0.5 text-xs text-emerald-200">
                            OK
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-red-950/60 px-2 py-0.5 text-xs text-red-200">Err</span>
                        )}
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatWhen(r.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Database className="h-3.5 w-3.5" />
                          {dbLabel(r.databaseType)}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="flex items-start gap-2 text-muted">
                        <Tag className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="text-foreground/80">Saved as: </span>
                          {saved}
                        </span>
                      </p>
                      <p className="flex items-start gap-2 text-muted">
                        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="line-clamp-3 font-mono text-[11px] text-foreground/90">{r.sqlText}</span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
