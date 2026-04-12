"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, clearSession } = useAuth();
  const router = useRouter();

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-card/20 px-6 py-5 backdrop-blur-sm sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="text-left text-xs text-muted sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted/80">Signed in</p>
          <p className="truncate font-medium text-foreground sm:max-w-[220px]" title={user?.email ?? undefined}>
            {user?.email}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="whitespace-nowrap"
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
