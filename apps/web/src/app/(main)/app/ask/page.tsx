"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { MessageSquareText, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SaveQueryModal, AddToDashboardModal } from "@/components/query-workspace-modals";
import { inferDashboardCardChartType } from "@/lib/query-result-heuristics";

type Connection = { id: string; name: string; isActive: boolean };
type WorkspaceQueryPreferences = {
  defaultDatabaseConnectionId: string | null;
  autoRunGeneratedSql: boolean;
  defaultChartType: string;
};

const EXAMPLES = [
  "Show total revenue by month",
  "Who are the top 10 customers by order count?",
  "Orders by region",
  "How many rows are in the main fact table?",
];

export default function AppAskPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
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
  const [autoRunGeneratedSql, setAutoRunGeneratedSql] = useState(false);
  const canGenerate = !busy && !!question.trim();
  const canRun = !busy && !!sql.trim();

  const loadConnections = useCallback(async () => {
    if (!token) {
      return;
    }
    setConnectionsLoading(true);
    setConnectionsError(null);
    try {
      const [rows, preferences] = await Promise.all([
        apiFetch<Connection[]>("/database-connections", { token }),
        apiFetch<WorkspaceQueryPreferences>("/settings/workspace", { token }),
      ]);
      setConnections(rows);
      setAutoRunGeneratedSql(preferences.autoRunGeneratedSql);
      setConnectionId((prev) => {
        if (prev && rows.some((r) => r.id === prev && r.isActive)) {
          return prev;
        }
        if (preferences.defaultDatabaseConnectionId) {
          const defaultConnection = rows.find((r) => r.id === preferences.defaultDatabaseConnectionId && r.isActive);
          if (defaultConnection) {
            return defaultConnection.id;
          }
        }
        return rows.find((r) => r.isActive)?.id ?? "";
      });
    } catch (e) {
      setConnectionsError(friendlyApiMessage(e, "Database connections could not be loaded."));
    } finally {
      setConnectionsLoading(false);
    }
  }, [token]);

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
    const nextConnectionId = searchParams.get("connectionId");
    const nextSql = searchParams.get("sql");
    const nextQuestion = searchParams.get("question");
    const nextSavedQueryId = searchParams.get("savedQueryId");
    if (nextConnectionId) {
      setConnectionId(nextConnectionId);
    }
    if (nextSql) {
      setSql(nextSql);
    }
    if (nextQuestion) {
      setQuestion(nextQuestion);
    }
    if (nextSavedQueryId) {
      setSavedQueryId(nextSavedQueryId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (token) {
      void loadConnections();
    }
  }, [token, loadConnections]);

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
        if (autoRunGeneratedSql) {
          const body: Record<string, string | undefined> = {
            databaseConnectionId: connectionId,
            sql: res.generatedSql,
          };
          if (question.trim()) {
            body.naturalLanguageQuestion = question.trim();
          }
          const runRes = await apiFetch<QueryExecuteResultDto>("/queries/execute", {
            method: "POST",
            token,
            body: JSON.stringify(body),
          });
          setResult(runRes);
        }
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
        title="Ask copilot"
        subtitle="Describe what you want in plain language. The copilot writes safe, read-only SQL — review it, run it, and get an instant chart and insight."
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
            <Card>
              <CardHeader className="space-y-3">
                <StepBadge step={1} label="Ask" />
                <div className="space-y-1">
                  <CardTitle className="text-xl">What would you like to understand?</CardTitle>
                  <CardDescription>
                    Start with a plain-language question, then narrow with optional table context before generating SQL.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
                  <FormField
                    label="Connection"
                    id="conn"
                    hint="Choose the active database to query."
                    className="rounded-lg border border-border/65 bg-background/25 p-3.5"
                  >
                    <select
                      id="conn"
                      className="control-base"
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
                  <FormField
                    label="Your question"
                    id="q"
                    hint="Keep it outcome-focused, e.g. trend, top drivers, or segments."
                    className="rounded-lg border border-primary/30 bg-primary/5 p-3.5"
                  >
                    <Textarea
                      id="q"
                      rows={5}
                      placeholder="e.g. Total sales by month for last year"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="min-h-[140px] resize-y border-primary/40 bg-background/90 text-sm"
                    />
                  </FormField>
                </div>

                <div className="space-y-4 rounded-lg border border-border/65 bg-background/25 p-3.5">
                  <FormField
                    label="Table context (optional)"
                    id="tbl-ctx"
                    hint="Pick tables to guide generation when your warehouse is large."
                  >
                    <AskTableContextPicker
                      tables={schema?.tables ?? []}
                      selectedQualified={selectedTables}
                      onSelectionChange={setSelectedTables}
                      disabled={schemaLoading || !schema?.tables.length}
                    />
                  </FormField>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Selected tables</p>
                    <div className="flex min-h-[42px] flex-wrap items-center gap-2">
                      {selectedTables.length === 0 ? (
                        <span className="inline-flex items-center rounded-full border border-dashed border-border/75 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                          No table filters selected (using full schema)
                        </span>
                      ) : (
                        selectedTables.map((q) => (
                          <span
                            key={q}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-foreground shadow-sm shadow-black/10"
                          >
                            <span className="max-w-[240px] truncate font-mono text-[11px]">{q}</span>
                            <button
                              type="button"
                              className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/85 hover:text-foreground"
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
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Quick starters</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setQuestion(ex)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                        {ex}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/20 px-3.5 py-3">
                    <div className="text-xs text-muted-foreground">
                      Next: generate SQL from your question, then review before running.
                    </div>
                    <Button type="button" onClick={() => void onGenerate()} disabled={!canGenerate}>
                      {busy === "generate" ? <LoadingState label="Generating SQL…" /> : "Generate SQL"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-3">
                <StepBadge step={2} label="Review and run" />
                <div className="space-y-1">
                  <CardTitle className="text-lg">Generated SQL</CardTitle>
                  <CardDescription>SQL is shown for transparency. You can edit it, then run a read-only query.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {generateRes?.status === "needs_clarification" ? (
                  <div className="rounded-lg border border-amber-900/45 bg-amber-950/25 px-3.5 py-3 text-sm text-amber-100">
                    <p className="font-medium">Needs a bit more detail</p>
                    {generateRes.clarificationQuestion ? (
                      <p className="mt-1.5 font-medium text-amber-50">{generateRes.clarificationQuestion}</p>
                    ) : null}
                    <p className="mt-1.5 text-amber-100/90">{generateRes.explanation}</p>
                    {generateRes.validationError ? (
                      <p className="mt-2 text-xs text-amber-200/90">Safety check: {generateRes.validationError}</p>
                    ) : null}
                    {generateRes.suggestedTables?.length ? (
                      <p className="mt-1.5 text-xs text-amber-100/80">
                        Suggested tables: {generateRes.suggestedTables.slice(0, 8).join(", ")}
                        {generateRes.suggestedTables.length > 8 ? "…" : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {generateRes?.status === "ok" && showLowConfidenceWarning ? (
                  <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-3.5 py-2.5 text-xs text-amber-100">
                    Low confidence from the model — review SQL carefully before running, or refine your question and table context.
                  </div>
                ) : null}

                <FormField label="SQL (editable)" id="sql" hint="Only read-only SELECT statements are allowed.">
                    <Textarea
                      id="sql"
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      className="min-h-[220px] bg-background/80 font-mono text-xs leading-relaxed"
                      spellCheck={false}
                    />
                  </FormField>
                {generateRes?.status === "ok" ? (
                  <div className="rounded-lg border border-border/70 bg-background/25 px-3.5 py-3 text-xs text-muted-foreground">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/85">Why this SQL</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{generateRes.explanation}</p>
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
                        Tables referenced: <span className="font-mono text-foreground/80">{generateRes.usedTables.join(", ")}</span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/75 bg-background/20 px-3.5 py-3 text-sm text-muted-foreground">
                    Generate SQL to see a plain-language explanation before you run.
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/20 px-3.5 py-3">
                  <div className="text-xs text-muted-foreground">Next: run query to view table output, chart suggestion, and insights.</div>
                  <Button type="button" onClick={() => void onRun()} disabled={!canRun}>
                    {busy === "run" ? <LoadingState label="Running…" /> : "Run query"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-3">
                <StepBadge step={3} label="Review insight" />
                <CardTitle className="text-lg">Results</CardTitle>
                <CardDescription>Clean output view with data, suggested visualization, and summary insights.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {result ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/25 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="success">Result ready</Badge>
                      <span className="tabular-nums">
                        {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
                        {result.truncated ? " (truncated)" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setSaveModalOpen(true)}
                      >
                      Save query
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setDashboardModalOpen(true)}
                      >
                      Add to dashboard
                      </Button>
                      {savedQueryId ? (
                        <span className="text-xs text-muted-foreground">
                          Linked to saved query{" "}
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
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/75 bg-background/20 px-4 py-7 text-sm text-muted-foreground">
                    Run a query to see results here. The flow is: generate SQL, review it, then run.
                  </div>
                )}
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

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/8 py-1 pl-1 pr-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-gradient text-[10px] font-bold text-white">
        {step}
      </span>
      {label}
    </div>
  );
}
