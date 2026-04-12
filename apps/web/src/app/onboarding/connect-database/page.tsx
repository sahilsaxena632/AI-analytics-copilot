"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Database, ShieldCheck } from "lucide-react";
import { ErrorBanner } from "@/components/error-banner";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingState } from "@/components/loading-state";

type DbType = "postgres" | "mysql";

type SaveResponse = {
  success: boolean;
  message?: string;
  connection?: { id: string; name: string; type?: DbType };
};

type DryRunResponse = {
  success: boolean;
  message?: string;
};

export default function OnboardingConnectDatabasePage() {
  const { token } = useAuth();
  const router = useRouter();

  const [dbType, setDbType] = useState<DbType>("postgres");
  const [name, setName] = useState("Analytics warehouse");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("5432");
  const [database, setDatabase] = useState("postgres");
  const [username, setUsername] = useState("postgres");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(false);

  useEffect(() => {
    setPort(dbType === "mysql" ? "3306" : "5432");
    setUsername(dbType === "mysql" ? "root" : "postgres");
    setDatabase(dbType === "mysql" ? "mysql" : "postgres");
  }, [dbType]);

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const busy = testing || saving;

  function buildPayload(dryRun: boolean) {
    return {
      type: dbType,
      name: name.trim(),
      host: host.trim(),
      port: Number(port),
      database: database.trim(),
      username: username.trim(),
      password,
      ssl,
      ...(dryRun ? { dryRun: true } : {}),
    };
  }

  async function onTest() {
    if (!token) {
      return;
    }
    setTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch<DryRunResponse>("/database-connections", {
        method: "POST",
        token,
        body: JSON.stringify(buildPayload(true)),
      });
      if (res.success) {
        setSuccessMsg(res.message ?? "Connection looks good.");
      }
    } catch (e) {
      setErrorMsg(friendlyApiMessage(e, "We couldn’t reach the database with these settings."));
    } finally {
      setTesting(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch<SaveResponse>("/database-connections", {
        method: "POST",
        token,
        body: JSON.stringify(buildPayload(false)),
      });
      if (res.success && res.connection?.id) {
        setPassword("");
        router.push("/app/home");
      } else {
        setSuccessMsg(res.message ?? "Saved.");
      }
    } catch (e) {
      setErrorMsg(friendlyApiMessage(e, "This connection could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex items-center gap-3 text-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Database className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Connect your database</h1>
            <p className="text-sm text-muted">Sign in to add a secure, read-only analytics connection.</p>
          </div>
        </div>
        <Card className="border-border/80 bg-card/90 backdrop-blur">
          <CardContent className="pt-6">
            <Link href="/login?next=/onboarding/connect-database" className={cn(buttonVariants(), "flex w-full justify-center")}>
              Sign in to continue
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2 text-center sm:text-left">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 sm:mx-0">
          <Database className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Connect your database</h1>
        <p className="text-sm leading-relaxed text-muted">
          Choose PostgreSQL or MySQL. We validate access with a quick check, then store credentials for read-only analytics—your
          operational data stays on your servers.
        </p>
      </header>

      {errorMsg ? <ErrorBanner title="Connection issue" message={errorMsg} /> : null}
      {successMsg && !errorMsg ? (
        <Alert variant="success">
          <AlertTitle>All set</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/80 bg-card/95 shadow-xl shadow-black/20 backdrop-blur">
        <CardHeader className="space-y-1 border-b border-border/60 pb-4">
          <CardTitle className="text-lg">Connection details</CardTitle>
          <CardDescription>Credentials are stored for your workspace only and never shown again after you save.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={onSave}>
            <div className="space-y-2">
              <Label>Database type</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/80 bg-background/30 p-1">
                <button
                  type="button"
                  onClick={() => setDbType("postgres")}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    dbType === "postgres" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground",
                  )}
                >
                  PostgreSQL
                </button>
                <button
                  type="button"
                  onClick={() => setDbType("mysql")}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    dbType === "mysql" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground",
                  )}
                >
                  MySQL
                </button>
              </div>
              <p className="text-xs text-muted">More engines (e.g. SQL Server) can plug in later via the same connection API.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Connection name</Label>
              <Input
                id="name"
                placeholder="e.g. North America sales"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
              />
              <p className="text-xs text-muted">A label your managers will recognize in menus and dashboards.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="host">Host</Label>
                <Input id="host" placeholder="db.company.com" value={host} onChange={(e) => setHost(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="database">Database name</Label>
                <Input id="database" placeholder="analytics" value={database} onChange={(e) => setDatabase(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/40 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="ssl" className="text-foreground">
                  Use SSL
                </Label>
                <p className="text-xs text-muted">Turn on for managed cloud databases that require encryption.</p>
              </div>
              <Switch id="ssl" checked={ssl} onCheckedChange={setSsl} />
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void onTest()} className="sm:min-w-[140px]">
                {testing ? <LoadingState label="Testing…" /> : "Test connection"}
              </Button>
              <Button type="submit" disabled={busy} className="sm:min-w-[140px]">
                {saving ? <LoadingState label="Saving…" /> : "Save & continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p>
          Analytics queries from this app are <span className="font-medium text-foreground">read-only</span>. Write operations are
          blocked at the API layer.
        </p>
      </div>
    </div>
  );
}
