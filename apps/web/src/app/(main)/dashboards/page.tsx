"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type DashboardRow = {
  id: string;
  name: string;
  description: string | null;
  _count?: { cards: number };
};

export default function DashboardsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void apiFetch<DashboardRow[]>("/dashboards", { token })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader title="Dashboards" subtitle="Dashboard shells with cards referencing SQL + chart type." />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {!token ? (
          <EmptyState title="Sign in required" />
        ) : loading ? (
          <LoadingState label="Loading dashboards…" />
        ) : rows.length === 0 ? (
          <EmptyState title="No dashboards" description="Seed data creates a Main dashboard, or POST /dashboards." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle>
                    <Link href={`/dashboards/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </CardTitle>
                  {d.description ? <CardDescription>{d.description}</CardDescription> : null}
                </CardHeader>
                <CardContent className="text-sm text-muted">
                  {d._count ? `${d._count.cards} cards` : "Cards"}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
