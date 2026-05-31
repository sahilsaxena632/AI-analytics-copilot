"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavLinkActive, navGroups } from "@/components/nav-config";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/70 bg-card/40 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-gradient shadow-glow">
          <Sparkles className="h-5 w-5 text-white" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">Analytics Copilot</p>
          <p className="text-[11px] text-muted-foreground">AI data workspace</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              {group.label}
            </p>
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = isNavLinkActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/12 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-gradient" />
                  ) : null}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border/60 px-4 py-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">Read-only & secure</p>
            <p className="truncate text-[11px] text-muted-foreground">Write queries are blocked</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
