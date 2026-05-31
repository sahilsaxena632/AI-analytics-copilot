import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "neutral";

export function InsightCard({
  title,
  description,
  value,
  trend,
  trendDirection,
  icon: Icon,
  accent = "primary",
  className,
}: {
  title: string;
  description?: string;
  value: string;
  trend?: string;
  trendDirection?: TrendDirection;
  icon?: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning";
  className?: string;
}) {
  const accentClasses: Record<string, string> = {
    primary: "bg-primary/12 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };

  const TrendIcon =
    trendDirection === "up" ? ArrowUpRight : trendDirection === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trendDirection === "up"
      ? "text-success"
      : trendDirection === "down"
        ? "text-danger"
        : "text-muted-foreground";

  return (
    <Card interactive className={cn("group overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {description ? (
              <p className="text-xs leading-relaxed text-muted-foreground/80">{description}</p>
            ) : null}
          </div>
          {Icon ? (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                accentClasses[accent],
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.7rem]">
            {value}
          </p>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs font-medium tabular-nums",
                trendColor,
              )}
            >
              {trendDirection ? <TrendIcon className="h-3.5 w-3.5" aria-hidden /> : null}
              {trend}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
