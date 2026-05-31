import Link from "next/link";
import { Database, MessageSquareText, Table2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PageMain } from "@/components/page-main";
import { buttonVariants } from "@/components/ui/button";
import { CopilotHero } from "@/components/home/copilot-hero";
import { HomeMetrics } from "@/components/home/home-metrics";
import { HomeCharts } from "@/components/home/home-charts";
import { HomeInsights } from "@/components/home/home-insights";
import { RecentActivity } from "@/components/home/recent-activity";
import { cn } from "@/lib/utils";

export default function AppHomePage() {
  return (
    <>
      <AppHeader
        title="Command center"
        subtitle="Your live analytics overview — ask the copilot, track the metrics that matter, and pick up where your team left off."
        actions={
          <Link href="/onboarding/connect-database" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Connect database</span>
          </Link>
        }
      />
      <PageMain>
        <CopilotHero />

        <section className="space-y-4">
          <SectionLabel title="Key metrics" hint="Demo data — connect a database to see live numbers" />
          <HomeMetrics />
        </section>

        <section className="space-y-4">
          <SectionLabel title="Performance" />
          <HomeCharts />
        </section>

        <section className="space-y-4">
          <SectionLabel title="AI insights" hint="Generated from recent trends" />
          <HomeInsights />
        </section>

        <section className="space-y-4">
          <SectionLabel title="Recent activity" />
          <RecentActivity />
        </section>

        <section className="surface-elevated flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">Ready to explore your own data?</h3>
            <p className="text-sm text-muted-foreground">
              Connect a warehouse, browse the schema, then ask the copilot anything.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/app/ask" className={cn(buttonVariants())}>
              <MessageSquareText className="h-4 w-4" />
              Ask a question
            </Link>
            <Link href="/app/schema" className={cn(buttonVariants({ variant: "secondary" }))}>
              <Table2 className="h-4 w-4" />
              Browse schema
            </Link>
          </div>
        </section>
      </PageMain>
    </>
  );
}

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</h2>
      {hint ? <span className="text-xs text-muted-foreground/70">{hint}</span> : null}
    </div>
  );
}
