"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ConnectDatabasePage() {
  const { token } = useAuth();
  const [name, setName] = useState("My analytics database");
  const [connectionString, setConnectionString] = useState(
    "postgresql://copilot:copilot@localhost:5432/copilot_app?schema=public",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{ id: string; name: string }>("/connections", {
        method: "POST",
        token,
        body: JSON.stringify({ name, connectionString }),
      });
      setMessage(`Connection saved: ${res.name} (${res.id})`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader
        title="Connect database"
        subtitle="Store a PostgreSQL connection string for your organization. TODO: encrypt at rest in production."
      />
      <main className="flex flex-1 flex-col gap-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle>New connection</CardTitle>
            <CardDescription>
              The API runs read-only SELECT/WITH queries against this database through a pooled client per request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="max-w-xl space-y-4" onSubmit={onSubmit}>
              <FormField
                label="Display name"
                id="name"
                hint="Shown in the UI when picking a connection."
              >
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </FormField>
              <FormField
                label="Connection string"
                id="conn"
                hint="postgresql://user:pass@host:5432/dbname"
                error={error ?? undefined}
              >
                <Input
                  id="conn"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  required
                />
              </FormField>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save connection"}
              </Button>
              {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
