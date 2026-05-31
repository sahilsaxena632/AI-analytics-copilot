"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavLinkActive, navGroups } from "@/components/nav-config";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-border/70 bg-card/50 px-4 py-3 backdrop-blur-xl">
        <Link href="/app/home" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-white" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">Analytics Copilot</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <div className="animate-fade-up absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col border-r border-border/70 bg-card/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-gradient shadow-glow">
                  <Sparkles className="h-4 w-4 text-white" aria-hidden />
                </span>
                <span className="text-sm font-semibold tracking-tight text-foreground">Analytics Copilot</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
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
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-primary/12 font-medium text-foreground"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
