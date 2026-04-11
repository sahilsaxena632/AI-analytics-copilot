"use client";

import { useCallback, useEffect, useState } from "react";
import type { AskQuestionResponseDto, QueryExecuteResultDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { DataTable } from "@/components/data-table";
import { ResultChart } from "@/components/result-chart";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Connection = { id: string; name: string };
type DashboardRow = { id: string; name: string; _count?: { cards: number } };

export default function AskPage() {
  const { token } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dashboards, setDashboards] = useState<DashboardRow[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [dashboardId, setDashboardId] = useState("");
  const [question, setQuestion] = useState("What database am I connected to?");
  const [sql, setSql] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [result, setResult] = useState<QueryExecuteResultDto | null>(null);
  const [saveTitle, setSaveTitle] = useState("My saved query");
  const [savedQueryId, setSavedQueryId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!token) {
      return;
    }
    const rows = await apiFetch<Connection[]>("/connections", { token });
    setConnections(rows);
    setConnectionId((prev) => prev || rows[0]?.id || "");
  }, [token]);

  const loadDashboards = useCallback(async () => {
    if (!token) {
      return;
    }
    const rows = await apiFetch<DashboardRow[]>("/dashboards", { token });
    setDashboards(rows);
    setDashboardId((prev) => prev || rows[0]?.id || "");
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void (async () => {
      try {
        await loadConnections();
        await loadDashboards();
      } catch {
        setError("Failed to load connections or dashboards");
      }
    })();
  }, [token, loadConnections, loadDashboards]);

  async function onRefreshSchema() {
    if (!token || !connectionId) {
      return;
    }
    setBusy("schema");
    setError(null);
    try {
      await apiFetch(`/schema/connections/${connectionId}/refresh`, { method: "POST", token });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Schema refresh failed");
    } finally {
      setBusy(null);
    }
  }

  async function onAsk() {
    if (!token || !connectionId) {
      return;
    }
    setBusy("ask");
    setError(null);
    try {
      const res = await apiFetch<AskQuestionResponseDto>("/query/ask", {
        method: "POST",
        token,
        body: JSON.stringify({ connectionId, question }),
      });
      setSql(res.generatedSql);
      setExplanation(res.explanation);
      setResult(null);
      setSavedQueryId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ask failed");
    } finally {
      setBusy(null);
    }
  }

  async function onRun() {
    if (!token || !connectionId || !sql.trim()) {
      return;
    }
    setBusy("run");
    setError(null);
    try {
      const res = await apiFetch<QueryExecuteResultDto>("/query/execute", {
        method: "POST",
        token,
        body: JSON.stringify({
          connectionId,
          sql,
          ...(savedQueryId ? { savedQueryId } : {}),
        }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Execute failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveQuery() {
    if (!token || !connectionId || !sql.trim()) {
      return;
    }
    setBusy("saveQuery");
    setError(null);
    try {
      const saved = await apiFetch<{ id: string }>("/saved-queries", {
        method: "POST",
        token,
        body: JSON.stringify({
          connectionId,
          title: saveTitle,
          sqlText: sql,
          naturalLanguageQuestion: question,
        }),
      });
      setSavedQueryId(saved.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save query failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveCard() {
    if (!token || !connectionId || !dashboardId || !sql.trim()) {
      return;
    }
    setBusy("saveCard");
    setError(null);
    try {
      await apiFetch(`/dashboards/${dashboardId}/cards`, {
        method: "POST",
        token,
        body: JSON.stringify({
          connectionId,
          title: saveTitle || "Chart card",
          chartType: "bar",
          sqlText: sql,
        }),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save dashboard card failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AppHeader
        title="Ask query"
        subtitle="Minimal E2E path: ask (placeholder SQL), edit, run read-only SQL, save query, add dashboard card."
      />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {error ? (
          <p className="rounded-md border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : null}

        {!token ? (
          <EmptyState title="Not signed in" description="Open the login page to continue." />
        ) : connections.length === 0 ? (
          <EmptyState
            title="No connections yet"
            description="Create a database connection first."
            action={
              <Button type="button" onClick={() => (window.location.href = "/connect-database")}>
                Connect database
              </Button>
            }
          />
        ) : null}

        {token && connections.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>1. Connection & schema</CardTitle>
                <CardDescription>Select a connection and refresh cached schema metadata.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Connection" id="connection">
                  <select
                    id="connection"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                  >
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Button type="button" variant="secondary" onClick={() => void onRefreshSchema()} disabled={!!busy}>
                  {busy === "schema" ? <LoadingState label="Refreshing…" /> : "Refresh schema cache"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Question → SQL (placeholder)</CardTitle>
                <CardDescription>LLM integration replaces the template in QueryService.askQuestion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Question" id="question">
                  <Input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} />
                </FormField>
                <Button type="button" onClick={() => void onAsk()} disabled={!!busy}>
                  {busy === "ask" ? <LoadingState label="Generating…" /> : "Generate SQL"}
                </Button>
                {explanation ? <p className="text-xs text-muted">{explanation}</p> : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>3. Edit & run (read-only)</CardTitle>
                <CardDescription>Only SELECT / WITH queries are accepted by the API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="SQL" id="sql">
                  <Textarea id="sql" value={sql} onChange={(e) => setSql(e.target.value)} className="font-mono text-xs" />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void onRun()} disabled={!!busy}>
                    {busy === "run" ? <LoadingState label="Running…" /> : "Run query"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Save query</CardTitle>
                <CardDescription>Persist SQL for reuse (links optional runs when executing with savedQueryId).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField label="Title" id="title">
                  <Input id="title" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} />
                </FormField>
                <Button type="button" variant="secondary" onClick={() => void onSaveQuery()} disabled={!!busy}>
                  {busy === "saveQuery" ? <LoadingState label="Saving…" /> : "Save query"}
                </Button>
                {savedQueryId ? (
                  <p className="text-xs text-muted">
                    Saved as <span className="font-mono text-foreground">{savedQueryId}</span>. Re-run will attach{" "}
                    <code className="text-foreground">savedQueryId</code>.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Dashboard card</CardTitle>
                <CardDescription>Stores chart metadata + SQL on a dashboard (execution uses same read-only path).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField label="Dashboard" id="dashboard">
                  <select
                    id="dashboard"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={dashboardId}
                    onChange={(e) => setDashboardId(e.target.value)}
                  >
                    {dashboards.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d._count ? ` (${d._count.cards} cards)` : ""}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Button type="button" variant="secondary" onClick={() => void onSaveCard()} disabled={!!busy}>
                  {busy === "saveCard" ? <LoadingState label="Saving card…" /> : "Save bar chart card"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>Tabular output plus a simple bar chart when a numeric column exists.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DataTable result={result} />
                <ResultChart result={result} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </>
  );
}
