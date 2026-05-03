"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GenerateSqlRequestDto,
  GenerateSqlResponseDto,
  QueryExecuteResultDto,
  SchemaExplorerSchemaDto,
} from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { DataTable } from "@/components/data-table";
import { QueryAutoChart } from "@/components/query-auto-chart";
import { QueryInsightsPanel } from "@/components/query-insights-panel";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { ErrorBanner } from "@/components/error-banner";
import { PageMain } from "@/components/page-main";
import { useAuth } from "@/lib/auth-context";
import { qualifiedTableName } from "@/components/schema-explorer/schema-table-sidebar";
import { AskTableContextPicker } from "@/components/ask-table-context-picker";
import { MessageSquareText, X } from "lucide-react";
import { SaveQueryModal, AddToDashboardModal } from "@/components/query-workspace-modals";
import { inferDashboardCardChartType } from "@/lib/query-result-heuristics";

type Connection = { id: string; name: string; isActive: boolean };

const EXAMPLES = [
  "Show total revenue by month",
  "Who are the top 10 customers by order count?",
  "Orders by region",
  "How many rows are in the main fact table?",
];

export default function AppAskPage() {
  const { token } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState("");
  const [schema, setSchema] = useState<SchemaExplorerSchemaDto | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [schemaContext, setSchemaContext] = useState("");
  const [question, setQuestion] = useState("");
  const [generateRes, setGenerateRes] = useState<GenerateSqlResponseDto | null>(null);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<QueryExecuteResultDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedQueryId, setSavedQueryId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);

  const activeConnections = useMemo(() => connections.filter((c) => c.isActive), [connections]);

  const showLowConfidenceWarning = useMemo(() => {
    if (!generateRes || generateRes.status !== "ok") {
      return false;
    }
    if (generateRes.confidence === "low") {
      return true;
    }
    const s = generateRes.confidenceScore;
    return typeof s === "number" && s < 0.55;
  }, [generateRes]);

  const loadConnections = useCallback(async () => {
    if (!token) {
      return;
    }
    setConnectionsLoading(true);
    setConnectionsError(null);
    try {
      const rows = await apiFetch<Connection[]>("/database-connections", { token });
      setConnections(rows);
      setConnectionId((prev) => {
        if (prev && rows.some((r) => r.id === prev && r.isActive)) {
          return prev;
        }
        return rows.find((r) => r.isActive)?.id ?? "";
      });
    } catch (e) {
      setConnectionsError(friendlyApiMessage(e, "Database connections could not be loaded."));
    } finally {
      setConnectionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadConnections();
    }
  }, [token, loadConnections]);

  const loadSchema = useCallback(async () => {
    if (!token || !connectionId) {
      setSchema(null);
      return;
    }
    setSchemaLoading(true);
    try {
      const data = await apiFetch<SchemaExplorerSchemaDto>(`/database-connections/${connectionId}/schema`, {
        token,
      });
      setSchema(data);
    } catch {
      setSchema(null);
    } finally {
      setSchemaLoading(false);
    }
  }, [token, connectionId]);

  useEffect(() => {
    if (token && connectionId) {
      void loadSchema();
    }
  }, [token, connectionId, loadSchema]);

  useEffect(() => {
    if (!schema?.tables.length) {
      return;
    }
    const valid = new Set(schema.tables.map((t) => qualifiedTableName(t)));
    setSelectedTables((prev) => prev.filter((q) => valid.has(q)));
  }, [schema]);

  async function onGenerate() {
    if (!token || !connectionId || !question.trim()) {
      return;
    }
    setBusy("generate");
    setError(null);
    setGenerateRes(null);
    setResult(null);
    try {
      const res = await apiFetch<GenerateSqlResponseDto>("/queries/generate-sql", {
        method: "POST",
        token,
        body: JSON.stringify({
          databaseConnectionId: connectionId,
          question: question.trim(),
          ...(selectedTables.length > 0 ? { selectedTables } : {}),
          ...(schemaContext.trim() ? { schemaContext: schemaContext.trim() } : {}),
        } satisfies GenerateSqlRequestDto),
      });
      setGenerateRes(res);
      if (res.status === "ok" && res.generatedSql) {
        setSql(res.generatedSql);
      } else {
        setSql("");
      }
    } catch (err) {
      setError(friendlyApiMessage(err, "Could not generate SQL from your question."));
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
      const body: Record<string, string | undefined> = {
        databaseConnectionId: connectionId,
        sql,
      };
      if (question.trim()) {
        body.naturalLanguageQuestion = question.trim();
      }
      if (savedQueryId) {
        body.savedQueryId = savedQueryId;
      }
      const res = await apiFetch<QueryExecuteResultDto>("/queries/execute", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(friendlyApiMessage(err, "The query could not be run."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AppHeader
        title="Ask a question"
        subtitle="Describe what you want in plain language, review the SQL, then run a read-only query against your data."
      />
      <PageMain gapClassName="gap-6">
        {error ? <ErrorBanner message={error} /> : null}

        {!token ? (
          <EmptyState title="Sign in required" description="Sign in to generate and run queries." />
        ) : connectionsError ? (
          <ErrorBanner message={connectionsError} />
        ) : connectionsLoading && !connections.length ? (
          <Card>
            <CardContent className="flex justify-center py-16">
              <LoadingState label="Loading connections…" />
            </CardContent>
          </Card>
        ) : activeConnections.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No active database"
            description="Connect PostgreSQL or MySQL first, then return here to ask questions."
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Question</CardTitle>
                  <CardDescription>What should we analyze? You can start from an example below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Connection" id="conn">
                    <select
                      id="conn"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={connectionId}
                      onChange={(e) => {
                        setConnectionId(e.target.value);
                        setSelectedTables([]);
                        setGenerateRes(null);
                        setResult(null);
                        setSavedQueryId(null);
                      }}
                    >
                      {activeConnections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Table context (optional)" id="tbl-ctx" hint="Pick tables to narrow what the generator considers.">
                    <AskTableContextPicker
                      tables={schema?.tables ?? []}
                      selectedQualified={selectedTables}
                      onSelectionChange={setSelectedTables}
                      disabled={schemaLoading || !schema?.tables.length}
                    />
                  </FormField>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted">Active context</p>
                    <div className="flex min-h-[36px] flex-wrap items-center gap-2">
                      {selectedTables.length === 0 ? (
                        <span className="inline-flex items-center rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs text-muted">
                          Using full schema
                        </span>
                      ) : (
                        selectedTables.map((q) => (
                          <span
                            key={q}
                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/35 bg-primary/12 pl-2.5 pr-1 py-0.5 text-xs font-medium text-foreground"
                          >
                            <span className="max-w-[220px] truncate font-mono">{q}</span>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-background/80 hover:text-foreground"
                              aria-label={`Remove ${q} from context`}
                              onClick={() => setSelectedTables((prev) => prev.filter((x) => x !== q))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <FormField label="Your question" id="q">
                    <Textarea
                      id="q"
                      rows={4}
                      placeholder="e.g. Total sales by month for last year"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="resize-y text-sm"
                    />
                  </FormField>
                  <FormField label="Extra context for the generator (optional)" id="ctx">
                    <Textarea
                      id="ctx"
                      rows={2}
                      placeholder="e.g. Amount column is net_amount; date column is order_date"
                      value={schemaContext}
                      onChange={(e) => setSchemaContext(e.target.value)}
                      className="text-sm"
                    />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((ex) => (
                      <Button key={ex} type="button" variant="secondary" size="sm" onClick={() => setQuestion(ex)}>
                        {ex}
                      </Button>
                    ))}
                  </div>
                  <Button type="button" onClick={() => void onGenerate()} disabled={!!busy || !question.trim()}>
                    {busy === "generate" ? <LoadingState label="Generating SQL…" /> : "Generate SQL"}
                  </Button>
                  {generateRes?.status === "needs_clarification" ? (
                    <div className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                      <p className="font-medium">Needs a bit more detail</p>
                      {generateRes.clarificationQuestion ? (
                        <p className="mt-2 font-medium text-amber-50">{generateRes.clarificationQuestion}</p>
                      ) : null}
                      <p className="mt-1 text-amber-100/90">{generateRes.explanation}</p>
                      {generateRes.validationError ? (
                        <p className="mt-2 text-xs text-amber-200/90">Safety check: {generateRes.validationError}</p>
                      ) : null}
                      {generateRes.suggestedTables?.length ? (
                        <p className="mt-2 text-xs text-amber-100/80">
                          Tables: {generateRes.suggestedTables.slice(0, 8).join(", ")}
                          {generateRes.suggestedTables.length > 8 ? "…" : ""}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {generateRes?.status === "ok" && showLowConfidenceWarning ? (
                    <div className="rounded-md border border-amber-800/40 bg-amber-950/25 px-3 py-2 text-xs text-amber-100">
                      Low confidence from the model — review SQL carefully before running, or refine your question and
                      table context.
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">SQL &amp; run</CardTitle>
                  <CardDescription>Review or edit the statement, then execute. Only read-only SELECT is allowed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="SQL" id="sql">
                    <Textarea
                      id="sql"
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      className="min-h-[200px] font-mono text-xs leading-relaxed"
                      spellCheck={false}
                    />
                  </FormField>
                  {generateRes?.status === "ok" ? (
                    <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Why this SQL was generated</p>
                      <p className="mt-1.5 leading-relaxed text-foreground/90">{generateRes.explanation}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                        {generateRes.confidenceScore !== undefined ? (
                          <span>
                            Score: {(generateRes.confidenceScore * 100).toFixed(0)}%
                            {generateRes.confidence ? ` (${generateRes.confidence})` : ""}
                          </span>
                        ) : generateRes.confidence ? (
                          <span>Confidence: {generateRes.confidence}</span>
                        ) : null}
                        {generateRes.providerUsed ? <span>Provider: {generateRes.providerUsed}</span> : null}
                      </div>
                      {generateRes.usedTables?.length ? (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          Tables referenced:{" "}
                          <span className="font-mono text-foreground/80">{generateRes.usedTables.join(", ")}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <Button type="button" onClick={() => void onRun()} disabled={!!busy || !sql.trim()}>
                    {busy === "run" ? <LoadingState label="Running…" /> : "Run query"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
                <CardDescription>Table, suggested chart, and a short narrative you can share as-is.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {result ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSaveModalOpen(true)}>
                      Save query
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setDashboardModalOpen(true)}>
                      Add to dashboard
                    </Button>
                    {savedQueryId ? (
                      <span className="text-xs text-muted">
                        Next runs are linked to saved query{" "}
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => setSavedQueryId(null)}
                        >
                          (clear)
                        </button>
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <DataTable result={result} />
                <div className="grid gap-6 lg:grid-cols-2">
                  <QueryAutoChart result={result} />
                  <QueryInsightsPanel result={result} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageMain>
      {token && connectionId ? (
        <>
          <SaveQueryModal
            open={saveModalOpen}
            token={token}
            connectionId={connectionId}
            question={question}
            sql={sql}
            generatedSql={generateRes?.status === "ok" && generateRes.generatedSql ? generateRes.generatedSql : null}
            onClose={() => setSaveModalOpen(false)}
            onSaved={(row) => setSavedQueryId(row.id)}
          />
          <AddToDashboardModal
            open={dashboardModalOpen}
            token={token}
            connectionId={connectionId}
            sql={sql}
            defaultTitle={question.trim().slice(0, 120) || "Insight"}
            defaultChartType={inferDashboardCardChartType(result)}
            onClose={() => setDashboardModalOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}
