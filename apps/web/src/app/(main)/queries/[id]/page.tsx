"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SavedQueryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { ErrorBanner } from "@/components/error-banner";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";

export default function QueryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const { token } = useAuth();
  const [q, setQ] = useState<SavedQueryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    void apiFetch<SavedQueryDto>(`/saved-queries/${id}`, { token })
      .then(setQ)
      .catch((e) => setError(friendlyApiMessage(e, "This saved query could not be loaded.")))
      .finally(() => setLoading(false));
  }, [token, id]);

  function runInAsk() {
    if (!q) {
      return;
    }
    const params = new URLSearchParams();
    params.set("connectionId", q.connectionId);
    params.set("sql", q.sqlText);
    if (q.naturalLanguageQuestion) {
      params.set("question", q.naturalLanguageQuestion);
    }
    if (q.id) {
      params.set("savedQueryId", q.id);
    }
    router.push(`/app/ask?${params.toString()}`);
  }

  return (
    <>
      <AppHeader title={q?.title ?? "Saved query"} subtitle="Review the question and SQL, then run it in Ask query." />
      <PageMain gapClassName="gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {loading ? <LoadingState label="Loading saved query…" /> : null}
        {q ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{q.title}</CardTitle>
                <CardDescription>Run this query again with the saved SQL and connection.</CardDescription>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" onClick={runInAsk}>
                  Run query
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push("/queries")}>
                  Back to list
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {q.naturalLanguageQuestion ? (
                <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Original question</p>
                  <p className="mt-1 text-sm text-foreground">{q.naturalLanguageQuestion}</p>
                </div>
              ) : null}
              {q.generatedSqlText && q.generatedSqlText.trim() !== q.sqlText.trim() ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested SQL (before edits)</p>
                  <pre className="mt-1 overflow-x-auto rounded-md border border-border/60 bg-background/50 p-3 font-mono text-xs text-foreground">
                    {q.generatedSqlText}
                  </pre>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SQL you saved</p>
                <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed text-foreground">
                  {q.sqlText}
                </pre>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </PageMain>
    </>
  );
}
