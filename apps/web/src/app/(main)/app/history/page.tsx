"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QueryRunHistoryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner } from "@/components/error-banner";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
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
      setError(friendlyApiMessage(e, "Query history could not be loaded."));
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
      <PageMain gapClassName="gap-6">
        {!token ? (
          <EmptyState title="Sign in required" description="Sign in to see your organization’s query history." />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : loading ? (
          <LoadingState label="Loading history…" />
        ) : empty ? (
          <EmptyState
            title="No runs yet"
            description="Run a query from Ask query. Successful and failed runs appear here with the question when available."
          />
        ) : (
          <div className="space-y-4">
            <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-card/55 shadow-sm shadow-black/10 md:block">
              <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                <thead className="bg-card/95 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Question</th>
                    <th className="px-4 py-3 font-medium">Saved name</th>
                    <th className="px-4 py-3 font-medium">Database</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {runs.map((r) => {
                    const q = r.naturalLanguageQuestion?.trim() || r.savedQueryQuestion?.trim() || "—";
                    const saved = r.savedQueryTitle?.trim() || "—";
                    return (
                      <tr key={r.id} className="even:bg-background/5">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatWhen(r.createdAt)}</td>
                        <td className="max-w-[280px] px-4 py-3 text-foreground" title={q}>
                          <span className="line-clamp-2">{q}</span>
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-muted-foreground" title={saved}>
                          <span className="line-clamp-2">{saved}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {dbLabel(r.databaseType)}
                          <span className="block text-[11px] text-muted-foreground/80">{r.connectionName}</span>
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
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.rowCount ?? "—"}</td>
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
                  <Card key={r.id}>
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
                      <p className="flex items-start gap-2 text-muted-foreground">
                        <Tag className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="text-foreground/80">Saved as: </span>
                          {saved}
                        </span>
                      </p>
                      <p className="flex items-start gap-2 text-muted-foreground">
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
      </PageMain>
    </>
  );
}
