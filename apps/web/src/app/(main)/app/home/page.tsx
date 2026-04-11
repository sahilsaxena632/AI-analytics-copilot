import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { InsightCard } from "@/components/insight-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AppHomePage() {
  return (
    <>
      <AppHeader
        title="Home"
        subtitle="Connect a database, explore schema, and run read-only analytics queries."
      />
      <main className="flex flex-1 flex-col gap-8 p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard
            title="MVP flow"
            description="End-to-end path is wired on Ask query"
            value="Connect → Schema → Ask → Run"
          />
          <InsightCard
            title="Security"
            description="Execution path enforces SELECT / WITH only"
            value="Read-only SQL"
          />
          <InsightCard
            title="Next"
            description="Swap rule-based SQL for an LLM behind the same API"
            value="Generator service"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Use seed credentials or register a new organization.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/onboarding/connect-database" className={cn(buttonVariants())}>
              Connect database
            </Link>
            <Link href="/app/ask" className={cn(buttonVariants({ variant: "secondary" }))}>
              Open Ask query
            </Link>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
