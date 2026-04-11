"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type DashboardDetail = {
  id: string;
  name: string;
  description: string | null;
  cards: Array<{
    id: string;
    title: string;
    chartType: string;
    sqlText: string;
    connectionId: string;
  }>;
};

export default function DashboardDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { token } = useAuth();
  const [data, setData] = useState<DashboardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    void apiFetch<DashboardDetail>(`/dashboards/${id}`, { token })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <>
      <AppHeader title={data?.name ?? "Dashboard"} subtitle={data?.description ?? ""} />
      <main className="flex flex-1 flex-col gap-6 p-8">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {loading ? <LoadingState /> : null}
        {!loading && data ? (
          <div className="grid gap-4">
            {data.cards.length === 0 ? (
              <p className="text-sm text-muted">No cards yet. Add one from Ask query.</p>
            ) : (
              data.cards.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <CardDescription>
                      {c.chartType} · connection {c.connectionId.slice(0, 8)}…
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-x-auto rounded-md bg-background/60 p-3 text-xs text-foreground">
                      {c.sqlText}
                    </pre>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}
      </main>
    </>
  );
}
