"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/app/home";
}

function LoginForm() {
  const { setSession, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      router.replace(next);
    }
  }, [token, router, next]);

  if (token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <LoadingState bordered label="Redirecting…" />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; organizationId: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.accessToken, res.refreshToken, res.user);
      router.replace(next);
    } catch (err) {
      setError(friendlyApiMessage(err, "Sign-in didn’t work. Check your email and password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-backdrop relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl" aria-hidden />

      <div className="animate-fade-up grid w-full max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden flex-col gap-6 lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-gradient shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">Analytics Copilot</p>
              <p className="text-xs text-muted-foreground">AI data workspace</p>
            </div>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Turn questions into <span className="gradient-text">insights</span> in seconds.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Ask in plain language, get safe read-only SQL, instant charts, and shareable dashboards — without writing a line of
            code.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              Natural-language to SQL, reviewed before it runs
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent">
                <BarChart3 className="h-4 w-4" />
              </span>
              Auto-charted results and AI-generated insights
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/12 text-success">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Read-only and secure — write queries are blocked
            </li>
          </ul>
        </div>

        <Card className="w-full bg-card/90 shadow-elevated">
          <CardHeader>
            <div className="mb-1 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-gradient shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-foreground">Analytics Copilot</span>
            </div>
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your workspace to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <FormField label="Email" id="email" error={error ?? undefined}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                />
              </FormField>
              <FormField label="Password" id="password">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                />
              </FormField>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <LoadingState bordered label="Loading sign-in…" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
