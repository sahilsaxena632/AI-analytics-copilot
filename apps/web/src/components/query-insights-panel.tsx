"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { buildInsightSummary } from "@/lib/query-result-heuristics";

export function QueryInsightsPanel({ result }: { result: QueryExecuteResultDto | null }) {
  const summary = buildInsightSummary(result);
  if (!summary) {
    return null;
  }
  return (
    <Card className="bg-card/75">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary/90" aria-hidden />
          <CardTitle className="text-base">Insights</CardTitle>
        </div>
        <CardDescription className="leading-relaxed">{summary.headline}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
          {summary.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
