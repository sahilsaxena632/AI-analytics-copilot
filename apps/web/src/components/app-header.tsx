"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { user, clearSession } = useAuth();
  const router = useRouter();

  const initial = user?.email?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-border/60 bg-background/70 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {actions}
        <ThemeSwitcher />
        <div className="hidden items-center gap-2.5 rounded-lg border border-border/70 bg-card/60 py-1 pl-1 pr-3 sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-gradient text-xs font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/85">Signed in</p>
            <p className="max-w-[160px] truncate text-xs font-medium text-foreground" title={user?.email ?? undefined}>
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
