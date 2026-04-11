"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SavedQueryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { apiFetch, ApiError } from "@/lib/api";
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
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <>
      <AppHeader title={q?.title ?? "Query"} subtitle="Saved SQL detail — run again from Ask query." />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {loading ? <LoadingState /> : null}
        {q ? (
          <Card>
            <CardHeader>
              <CardTitle>{q.title}</CardTitle>
              <CardDescription>
                Connection <span className="font-mono text-foreground">{q.connectionId}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {q.naturalLanguageQuestion ? (
                <div>
                  <p className="text-xs uppercase text-muted">Original question</p>
                  <p className="text-sm text-foreground">{q.naturalLanguageQuestion}</p>
                </div>
              ) : null}
              <pre className="overflow-x-auto rounded-md bg-background/60 p-4 text-xs text-foreground">{q.sqlText}</pre>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </>
  );
}
