"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedQueryDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SavedQueriesPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<SavedQueryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void apiFetch<SavedQueryDto[]>("/saved-queries", { token })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader title="Saved queries" subtitle="Open a query to view SQL and metadata." />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {!token ? (
          <EmptyState title="Sign in required" />
        ) : loading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState title="No saved queries" description="Save one from the Ask query page." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((q) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle>
                    <Link href={`/queries/${q.id}`} className="hover:underline">
                      {q.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">{q.id}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted line-clamp-3">{q.sqlText}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
