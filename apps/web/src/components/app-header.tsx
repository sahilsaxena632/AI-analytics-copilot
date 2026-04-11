"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, clearSession } = useAuth();
  const router = useRouter();

  return (
    <header className="flex items-start justify-between gap-4 border-b border-border bg-background/80 px-8 py-6 backdrop-blur">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-muted">
          <p className="font-medium text-foreground">{user?.email}</p>
          <p className="truncate max-w-[200px]" title={user?.organizationId}>
            Org: {user?.organizationId?.slice(0, 8)}…
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
