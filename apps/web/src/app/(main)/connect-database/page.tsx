"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectDatabaseRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/onboarding/connect-database");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">
      Redirecting…
    </div>
  );
}
