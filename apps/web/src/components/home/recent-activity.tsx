"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueryRunHistoryDto, SavedQueryDto } from "@analytics-copilot/shared";
import { ArrowRight, Bookmark, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/skeleton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RecentActivity() {
  const { token } = useAuth();
  const [saved, setSaved] = useState<SavedQueryDto[]>([]);
  const [runs, setRuns] = useState<QueryRunHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void Promise.allSettled([
      apiFetch<SavedQueryDto[]>("/saved-queries", { token }),
      apiFetch<QueryRunHistoryDto[]>("/query-runs", { token }),
    ]).then(([savedRes, runsRes]) => {
      if (!active) return;
      if (savedRes.status === "fulfilled") setSaved(savedRes.value.slice(0, 4));
      if (runsRes.status === "fulfilled") setRuns(runsRes.value.slice(0, 5));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="animate-fade-up delay-2">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Saved queries</CardTitle>
            <CardDescription>Reusable questions for your team</CardDescription>
          </div>
          <Link
            href="/queries"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <ActivitySkeleton rows={3} />
          ) : saved.length === 0 ? (
            <EmptyRow text="No saved queries yet. Save a question from the copilot to reuse it later." />
          ) : (
            saved.map((q) => (
              <Link
                key={q.id}
                href={`/queries/${q.id}`}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/30 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/70"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bookmark className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{q.title}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{q.sqlText}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(q.updatedAt)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="animate-fade-up delay-3">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>Latest queries executed in your workspace</CardDescription>
          </div>
          <Link
            href="/app/history"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <ActivitySkeleton rows={4} />
          ) : runs.length === 0 ? (
            <EmptyRow text="No query runs yet. Ask the copilot a question to get started." />
          ) : (
            runs.map((r) => {
              const label =
                r.naturalLanguageQuestion?.trim() || r.savedQueryTitle?.trim() || r.sqlText.slice(0, 60);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/30 px-3 py-2.5"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      r.success ? "bg-success/12 text-success" : "bg-danger/12 text-danger"
                    }`}
                  >
                    {r.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.connectionName}
                      {r.rowCount != null ? ` · ${r.rowCount} rows` : ""}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivitySkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
