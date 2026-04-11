"use client";

import { useCallback, useEffect, useState } from "react";
import type { SchemaSnapshotDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Connection = { id: string; name: string };

export default function SchemaPage() {
  const { token } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [snapshot, setSnapshot] = useState<SchemaSnapshotDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!token) {
      return;
    }
    const rows = await apiFetch<Connection[]>("/connections", { token });
    setConnections(rows);
    setConnectionId((prev) => prev || rows[0]?.id || "");
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadConnections().catch(() => setError("Failed to load connections"));
    }
  }, [token, loadConnections]);

  async function loadLatest() {
    if (!token || !connectionId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<SchemaSnapshotDto | null>(`/schema/connections/${connectionId}/latest`, { token });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load schema");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!token || !connectionId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<SchemaSnapshotDto>(`/schema/connections/${connectionId}/refresh`, {
        method: "POST",
        token,
      });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to refresh schema");
    } finally {
      setBusy(false);
    }
  }

  const columns = snapshot?.columns ?? [];

  return (
    <>
      <AppHeader title="Schema explorer" subtitle="Cached column metadata from information_schema." />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {!token ? (
          <EmptyState title="Sign in required" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Schema snapshot</CardTitle>
              <CardDescription>Refresh pulls live metadata into the app database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-sm text-muted" htmlFor="conn">
                    Connection
                  </label>
                  <select
                    id="conn"
                    className="mt-1 h-10 min-w-[220px] rounded-md border border-border bg-card px-3 text-sm"
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                  >
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="secondary" onClick={() => void loadLatest()} disabled={busy}>
                  Load latest cache
                </Button>
                <Button type="button" onClick={() => void refresh()} disabled={busy}>
                  {busy ? <LoadingState label="Refreshing…" /> : "Refresh from database"}
                </Button>
              </div>
              {snapshot ? (
                <p className="text-xs text-muted">Fetched {snapshot.fetchedAt}</p>
              ) : (
                <p className="text-sm text-muted">No cached schema yet — run a refresh.</p>
              )}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-card/80 text-muted">
                    <tr>
                      <th className="px-3 py-2">Schema</th>
                      <th className="px-3 py-2">Table</th>
                      <th className="px-3 py-2">Column</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Nullable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.slice(0, 200).map((c, i) => (
                      <tr key={`${c.tableName}-${c.columnName}-${i}`} className="odd:bg-background/40">
                        <td className="border-t border-border/60 px-3 py-2">{c.tableSchema}</td>
                        <td className="border-t border-border/60 px-3 py-2">{c.tableName}</td>
                        <td className="border-t border-border/60 px-3 py-2">{c.columnName}</td>
                        <td className="border-t border-border/60 px-3 py-2">{c.dataType}</td>
                        <td className="border-t border-border/60 px-3 py-2">{c.isNullable ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {columns.length > 200 ? (
                <p className="text-xs text-muted">Showing first 200 columns. TODO: paginate.</p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
