"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { apiFetch, ApiError } from "@/lib/api";
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
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader
        title="Dashboards"
        subtitle="Lightweight reports built from saved SQL — open one to see every card at a glance."
      />
      <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        {!token ? (
          <EmptyState title="Sign in required" />
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : loading ? (
          <LoadingState label="Loading dashboards…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="No dashboards yet"
            description="Create one when you add a chart from Ask query, or add a starter from your team’s seed data."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((d) => (
              <Link key={d.id} href={`/app/dashboards/${d.id}`} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Card className="h-full border-border bg-card/50 transition-colors group-hover:border-primary/40 group-hover:bg-card/80">
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:underline">{d.name}</CardTitle>
                    {d.description ? <CardDescription className="line-clamp-2">{d.description}</CardDescription> : null}
                  </CardHeader>
                  <CardContent className="text-sm text-muted">
                    {typeof d._count?.cards === "number" ? `${d._count.cards} card${d._count.cards === 1 ? "" : "s"}` : "Cards"}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
