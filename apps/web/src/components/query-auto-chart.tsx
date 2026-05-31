"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildLineMultiChartRows,
  buildSimpleChartRows,
  inferChartPlan,
  lineColorAt,
  toNumber,
  type ChartPlan,
} from "@/lib/chart-dataset-plan";

/** Recharts-friendly tokens aligned with app theme (no logic impact). */
const CHART = {
  grid: "hsl(217 19% 32% / 0.28)",
  axis: "hsl(215 16% 58%)",
  axisLine: "hsl(217 19% 28% / 0.55)",
  tooltipBg: "hsl(222 40% 10%)",
  tooltipBorder: "hsl(217 19% 24%)",
} as const;

const tooltipContentStyle = {
  background: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 10,
  padding: "10px 12px",
  boxShadow: "0 8px 24px hsl(0 0% 0% / 0.25)",
} as const;

const axisTickProps = { fill: CHART.axis, fontSize: 11 };

function formatKpi(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(n) >= 10_000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function chartSubtitle(plan: ChartPlan): string {
  if (plan.kind === "line_multi") {
    return "One line per series, sorted by time.";
  }
  if (plan.kind === "line") {
    return "Trend from your time column and measure.";
  }
  if (plan.kind === "bar") {
    return "Comparison across categories.";
  }
  return "";
}

export function QueryAutoChart({
  result,
  preferredChartType,
}: {
  result: QueryExecuteResultDto | null;
  preferredChartType?: "bar" | "line" | "table";
}) {
  if (!result) {
    return null;
  }
  if (preferredChartType === "table") {
    return null;
  }
  if (result.rows.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-background/25">
        <CardContent className="space-y-1.5 px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Nothing to chart</p>
          <p className="text-sm leading-relaxed text-muted-foreground">This result has no rows. Try adjusting your question or filters.</p>
        </CardContent>
      </Card>
    );
  }

  let plan = inferChartPlan(result);

  if (preferredChartType === "bar" && plan.xKey && plan.yKey) {
    plan = { ...plan, kind: "bar", confidence: "high", reason: "Using the saved bar chart preference for this card." };
  } else if (preferredChartType === "line" && plan.xKey && plan.yKey) {
    plan = {
      ...plan,
      kind: plan.kind === "line_multi" ? "line_multi" : "line",
      confidence: "high",
      reason: "Using the saved line chart preference for this card.",
    };
  }

  if (plan.kind === "none" || (plan.confidence === "low" && plan.kind !== "kpi")) {
    return (
      <Card className="border-dashed border-border/70 bg-background/25">
        <CardContent className="space-y-2 px-5 py-10 text-center sm:text-left">
          <p className="text-sm font-medium text-foreground">Chart not suggested</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This result reads best as a table — the column layout isn’t ideal for a quick chart.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground/85">{plan.reason}</p>
        </CardContent>
      </Card>
    );
  }

  if (plan.kind === "kpi") {
    const col = plan.yKey ?? result.columns[0];
    const raw = result.rows[0][col];
    const n = toNumber(raw);
    const label = col.replace(/_/g, " ");
    return (
      <Card className="animate-fade-up bg-card/75">
        <CardHeader className="space-y-1 pb-3">
          <CardDescription className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Key figure
          </CardDescription>
          <CardTitle className="text-4xl font-semibold tabular-nums text-foreground sm:text-[2.5rem]">
            {n != null ? formatKpi(n) : String(raw ?? "—")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 border-t border-border/50 pt-4">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xs leading-relaxed text-muted-foreground/80">{plan.reason}</p>
        </CardContent>
      </Card>
    );
  }

  if (plan.kind === "line_multi") {
    const { data, seriesMeta } = buildLineMultiChartRows(result, plan);
    if (!seriesMeta.length || data.length === 0) {
      return (
        <Card className="border-dashed border-border/70 bg-background/25">
          <CardContent className="space-y-1.5 px-5 py-10 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">Not enough data for this chart</p>
            <p className="text-sm text-muted-foreground">Use the table for the full view.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="animate-fade-up flex h-full flex-col bg-card/75">
        <CardHeader className="space-y-1 pb-0 pt-1">
          <CardTitle className="text-base font-semibold tracking-tight">Trend</CardTitle>
          <CardDescription className="space-y-1 leading-relaxed">
            <span>{chartSubtitle(plan)}</span>
            <span className="block text-xs text-muted-foreground/85">{plan.reason}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-5 pt-4 sm:px-5">
          <div className="h-full min-h-[300px] w-full flex-1 rounded-lg border border-border/45 bg-background/35 p-4 sm:min-h-[320px] sm:p-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 44 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="x"
                  tick={axisTickProps}
                  tickLine={{ stroke: CHART.axisLine }}
                  axisLine={{ stroke: CHART.axisLine }}
                  interval="preserveStartEnd"
                  angle={-16}
                  textAnchor="end"
                  height={56}
                  dy={6}
                />
                <YAxis
                  tick={axisTickProps}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    ...tooltipContentStyle,
                    maxHeight: 280,
                    overflowY: "auto",
                  }}
                  formatter={(value, _name, item) => {
                    const dk = item.dataKey != null ? String(item.dataKey) : "";
                    const meta = seriesMeta.find((s) => s.dataKey === dk);
                    const label = meta?.label ?? String(_name);
                    if (value == null || value === "") {
                      return [null, label];
                    }
                    return [
                      typeof value === "number" ? value.toLocaleString() : String(value),
                      label,
                    ];
                  }}
                  labelFormatter={(label) => String(label)}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="line"
                  iconSize={14}
                  wrapperStyle={{
                    fontSize: 12,
                    paddingTop: 20,
                    lineHeight: 1.5,
                    color: CHART.axis,
                  }}
                  formatter={(value) => {
                    const meta = seriesMeta.find((s) => s.dataKey === value);
                    return meta?.label ?? value;
                  }}
                />
                {seriesMeta.map((s, i) => (
                  <Line
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.label}
                    stroke={lineColorAt(i)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan.xKey || !plan.yKey) {
    return (
      <Card className="border-dashed border-border/70 bg-background/25">
        <CardContent className="space-y-1 px-5 py-10 text-center sm:text-left">
          <p className="text-sm font-medium text-foreground">No chart mapping</p>
          <p className="text-sm text-muted-foreground">We couldn’t pick sensible columns for a quick chart. Use the table below.</p>
        </CardContent>
      </Card>
    );
  }

  const data = buildSimpleChartRows(result, plan, plan.kind === "line" ? "line" : "bar");

  const chartTitle = plan.kind === "line" ? "Trend" : "Comparison";

  const ChartBody =
    plan.kind === "line" ? (
      <LineChart data={data} margin={{ top: 14, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="x"
          tick={axisTickProps}
          tickLine={{ stroke: CHART.axisLine }}
          axisLine={{ stroke: CHART.axisLine }}
          interval="preserveStartEnd"
        />
        <YAxis tick={axisTickProps} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(v) => [typeof v === "number" ? v.toLocaleString() : String(v), plan.yKey!.replace(/_/g, " ")]}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
          dot={false}
          name={plan.yKey.replace(/_/g, " ")}
        />
      </LineChart>
    ) : (
      <BarChart data={data} margin={{ top: 14, right: 16, left: 4, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="x"
          tick={axisTickProps}
          tickLine={false}
          axisLine={{ stroke: CHART.axisLine }}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={64}
        />
        <YAxis tick={axisTickProps} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(v) => [typeof v === "number" ? v.toLocaleString() : String(v), plan.yKey!.replace(/_/g, " ")]}
        />
        <Bar dataKey="y" fill="hsl(217 91% 58%)" radius={[5, 5, 0, 0]} name={plan.yKey.replace(/_/g, " ")} />
      </BarChart>
    );

  return (
    <Card className="animate-fade-up flex h-full flex-col bg-card/75">
      <CardHeader className="space-y-1 pb-0 pt-1">
        <CardTitle className="text-base font-semibold tracking-tight">{chartTitle}</CardTitle>
        <CardDescription className="space-y-1 leading-relaxed">
          <span>{chartSubtitle(plan)}</span>
          <span className="block text-xs text-muted-foreground/85">{plan.reason}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-5 pt-4 sm:px-5">
        <div className="h-full min-h-[280px] w-full flex-1 rounded-lg border border-border/45 bg-background/35 p-4 sm:min-h-[300px] sm:p-5">
          <ResponsiveContainer width="100%" height="100%">
            {ChartBody}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
