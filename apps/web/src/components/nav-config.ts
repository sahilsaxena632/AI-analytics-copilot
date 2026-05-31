import {
  History,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Table2,
  Unplug,
  Bookmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

export const navGroups: { label: string; links: NavLink[] }[] = [
  {
    label: "Overview",
    links: [
      { href: "/app/home", label: "Home", icon: Home },
      { href: "/app/ask", label: "Ask copilot", icon: MessageSquareText },
    ],
  },
  {
    label: "Workspace",
    links: [
      { href: "/app/dashboards", label: "Dashboards", icon: LayoutDashboard },
      { href: "/queries", label: "Saved queries", icon: Bookmark },
      { href: "/app/schema", label: "Schema", icon: Table2 },
      { href: "/app/history", label: "History", icon: History },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/onboarding/connect-database", label: "Connect database", icon: Unplug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function isNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/app/home" && href !== "/" && pathname.startsWith(href));
}
