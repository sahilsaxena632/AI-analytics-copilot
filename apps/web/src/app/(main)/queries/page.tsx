"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedQueryDto } from "@analytics-copilot/shared";
import { ArrowUpRight, Bookmark } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { ListSkeleton } from "@/components/skeleton";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

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
            icon={Bookmark}
            title="No saved queries yet"
            description="When you save a question from the copilot, it appears here for one-click reuse across your team."
            action={
              <Link href="/app/ask" className={cn(buttonVariants())}>
                Ask the copilot
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((q) => (
              <Link
                key={q.id}
                href={`/queries/${q.id}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card interactive className="h-full">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bookmark className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base group-hover:text-primary">{q.title}</CardTitle>
                        <Badge variant="default" className="mt-1.5">
                          Updated {new Date(q.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </Badge>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardHeader>
                  <CardContent>
                    <pre className="line-clamp-3 overflow-hidden rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
                      {q.sqlText}
                    </pre>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageMain>
    </>
  );
}
