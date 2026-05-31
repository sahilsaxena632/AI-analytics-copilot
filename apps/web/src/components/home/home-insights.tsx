import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_INSIGHTS } from "@/lib/home-demo-data";

const toneToBadge: Record<string, "primary" | "success" | "warning" | "accent"> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  accent: "accent",
};

export function HomeInsights() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DEMO_INSIGHTS.map((insight, i) => {
        const Icon = insight.icon;
        return (
          <Card key={insight.title} interactive className={`animate-fade-up delay-${i + 1}`}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <Badge variant={toneToBadge[insight.tone]}>{insight.tag}</Badge>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold tracking-tight text-foreground">{insight.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
