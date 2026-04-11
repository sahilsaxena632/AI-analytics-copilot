"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Run = {
  id: string;
  connectionId: string;
  sqlText: string;
  rowCount: number | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
};

export default function HistoryPage() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void apiFetch<Run[]>("/query/runs", { token })
      .then(setRuns)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader title="History" subtitle="Recent query executions (QueryRun)." />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {!token ? (
          <EmptyState title="Sign in required" />
        ) : loading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-card/80 text-muted">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">SQL</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="odd:bg-background/40">
                    <td className="border-t border-border/60 px-3 py-2 whitespace-nowrap text-xs text-muted">
                      {r.createdAt}
                    </td>
                    <td className="border-t border-border/60 px-3 py-2">
                      {r.success ? (
                        <span className="text-emerald-400">ok</span>
                      ) : (
                        <span className="text-red-300" title={r.errorMessage ?? ""}>
                          error
                        </span>
                      )}
                    </td>
                    <td className="border-t border-border/60 px-3 py-2">{r.rowCount ?? "—"}</td>
                    <td className="border-t border-border/60 px-3 py-2 font-mono text-xs text-foreground">
                      {r.sqlText.slice(0, 120)}
                      {r.sqlText.length > 120 ? "…" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
