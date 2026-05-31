"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CHART_COLORS, DEMO_METRICS, type DemoMetric } from "@/lib/home-demo-data";

function MetricCard({ metric, index }: { metric: DemoMetric; index: number }) {
  const Icon = metric.icon;
  const up = metric.direction === "up";
  const color = CHART_COLORS[index % CHART_COLORS.length];
  const data = metric.spark.map((y, i) => ({ i, y }));
  const gradientId = `spark-${metric.key}`;

  return (
    <Card interactive className="animate-fade-up group overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{metric.value}</p>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-xs font-medium tabular-nums",
                up ? "text-success" : "text-danger",
              )}
            >
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {metric.delta}
              <span className="text-muted-foreground/70">vs last month</span>
            </span>
          </div>
          <div className="h-10 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeMetrics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {DEMO_METRICS.map((metric, i) => (
        <MetricCard key={metric.key} metric={metric} index={i} />
      ))}
    </div>
  );
}
