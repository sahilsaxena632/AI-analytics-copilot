"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  History,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Table2,
  Unplug,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/onboarding/connect-database", label: "Connect database", icon: Unplug },
  { href: "/app/ask", label: "Ask query", icon: MessageSquareText },
  { href: "/queries", label: "Saved queries", icon: Bookmark },
  { href: "/app/schema", label: "Schema", icon: Table2 },
  { href: "/app/dashboards", label: "Dashboards", icon: LayoutDashboard },
  { href: "/app/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card/20">
      <div className="flex items-center gap-2 border-b border-border px-4 py-5">
        <Database className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Analytics Copilot</p>
          <p className="text-xs text-muted">Manager workspace</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/app/home" && href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors",
                active ? "bg-primary/15 font-medium text-foreground" : "text-muted hover:bg-card/80 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
