"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { ListSkeleton } from "@/components/skeleton";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard } from "lucide-react";

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
            description="Pin a chart from Ask query to create your first board, or ask your team to share one."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((d) => (
              <Link
                key={d.id}
                href={`/app/dashboards/${d.id}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors group-hover:border-primary/35 group-hover:bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:underline">{d.name}</CardTitle>
                    {d.description ? <CardDescription className="line-clamp-2">{d.description}</CardDescription> : null}
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {typeof d._count?.cards === "number"
                      ? `${d._count.cards} insight${d._count.cards === 1 ? "" : "s"}`
                      : "Insights"}
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
