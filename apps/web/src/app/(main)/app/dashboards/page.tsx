"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { ListSkeleton } from "@/components/skeleton";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { cards: number };
};

export default function AppDashboardsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void apiFetch<DashboardRow[]>("/dashboards", { token })
      .then(setRows)
      .catch((e) => setError(friendlyApiMessage(e, "Dashboards could not be loaded.")))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader
        title="Dashboards"
        subtitle="Lightweight reports—each card refreshes live from your own database when you choose."
      />
      <PageMain gapClassName="gap-6">
        {!token ? (
          <EmptyState title="Sign in required" description="Sign in to open dashboards for your workspace." />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : loading ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="No dashboards yet"
            description="Pin a chart from the copilot to create your first board, then arrange live insights your team can revisit anytime."
            action={
              <Link href="/app/ask" className={cn(buttonVariants())}>
                Create your first insight
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((d) => (
              <Link
                key={d.id}
                href={`/app/dashboards/${d.id}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card interactive className="flex h-full flex-col">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
                        <LayoutDashboard className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base group-hover:text-primary">{d.name}</CardTitle>
                        {d.description ? (
                          <CardDescription className="mt-1 line-clamp-2">{d.description}</CardDescription>
                        ) : null}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Badge variant="primary">
                      {typeof d._count?.cards === "number"
                        ? `${d._count.cards} insight${d._count.cards === 1 ? "" : "s"}`
                        : "Insights"}
                    </Badge>
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
