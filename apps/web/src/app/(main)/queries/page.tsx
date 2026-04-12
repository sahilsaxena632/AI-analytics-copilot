"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedQueryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { ListSkeleton } from "@/components/skeleton";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";

export default function SavedQueriesPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<SavedQueryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    void apiFetch<SavedQueryDto[]>("/saved-queries", { token })
      .then(setRows)
      .catch((e) => setError(friendlyApiMessage(e, "Saved queries could not be loaded.")))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader title="Saved queries" subtitle="Named questions and SQL your team can open again anytime." />
      <PageMain gapClassName="gap-6">
        {!token ? (
          <EmptyState title="Sign in required" description="Sign in to see saved queries for your workspace." />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : loading ? (
          <ListSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No saved queries yet"
            description="When you save a question from Ask query, it will appear here for quick access."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((q) => (
              <Card key={q.id} className="border-border bg-card/40 shadow-sm transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link href={`/queries/${q.id}`} className="hover:underline">
                      {q.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Updated{" "}
                    {new Date(q.updatedAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="line-clamp-3 font-mono text-xs leading-relaxed text-muted">{q.sqlText}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageMain>
    </>
  );
}
