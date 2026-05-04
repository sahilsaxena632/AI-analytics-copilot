"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SavedQueryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { ErrorBanner } from "@/components/error-banner";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";

export default function QueryDetailPage() {
  const params = useParams();
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

  return (
    <>
      <AppHeader title={q?.title ?? "Saved query"} subtitle="Review the question and SQL, then run again from Ask query." />
      <PageMain gapClassName="gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {loading ? <LoadingState label="Loading saved query…" /> : null}
        {q ? (
          <Card>
            <CardHeader>
              <CardTitle>{q.title}</CardTitle>
              <CardDescription>Uses one of your connected databases. Run from Ask query to pick the connection and refresh results.</CardDescription>
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
