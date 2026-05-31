"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@/lib/auth-context";

export function MainShell({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [token, pathname, router]);

  if (!token) {
    return (
      <div className="app-backdrop flex min-h-screen items-center justify-center bg-background">
        <LoadingState bordered label="Opening your workspace…" />
      </div>
    );
  }

  return (
    <div className="app-backdrop flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileNav />
        {children}
      </div>
    </div>
  );
}
