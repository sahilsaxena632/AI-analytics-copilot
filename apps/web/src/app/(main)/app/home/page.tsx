import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { InsightCard } from "@/components/insight-card";
import { PageMain } from "@/components/page-main";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AppHomePage() {
  return (
    <>
      <AppHeader
        title="Home"
        subtitle="Connect your warehouse, explore what’s inside, and get answers with read-only analytics."
      />
      <PageMain>
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard
            title="Typical flow"
            description="From connection to answers in a few guided steps"
            value="Connect → Explore → Ask → Run"
          />
          <InsightCard
            title="Safe by design"
            description="Queries are checked before they reach your database"
            value="Read-only SQL"
          />
          <InsightCard
            title="Share what matters"
            description="Save questions, revisit history, pin views to dashboards"
            value="Save · History · Dashboards"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Add a database your team already uses, then try a question on sample or real data.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/onboarding/connect-database" className={cn(buttonVariants())}>
              Connect database
            </Link>
            <Link href="/app/ask" className={cn(buttonVariants({ variant: "secondary" }))}>
              Ask a question
            </Link>
            <Link href="/app/schema" className={cn(buttonVariants({ variant: "secondary" }))}>
              Browse schema
            </Link>
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}
