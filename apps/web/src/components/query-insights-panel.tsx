"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { buildInsightSummary } from "@/lib/query-result-heuristics";

export function QueryInsightsPanel({ result }: { result: QueryExecuteResultDto | null }) {
  const summary = buildInsightSummary(result);
  if (!summary) {
    return null;
  }
  return (
    <Card className="animate-fade-up flex h-full flex-col bg-card/75">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <CardTitle className="text-base">AI insights</CardTitle>
          </div>
          <Badge variant="primary">Auto-generated</Badge>
        </div>
        <CardDescription className="leading-relaxed">{summary.headline}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
          {summary.bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
