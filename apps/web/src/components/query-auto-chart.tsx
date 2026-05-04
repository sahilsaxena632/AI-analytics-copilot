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

export function QueryAutoChart({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result) {
    return null;
  }
  if (result.rows.length === 0) {
    return (
      <Card className="border-dashed border-border bg-card/30">
        <CardContent className="py-6 text-sm leading-relaxed text-muted">
          There are no rows to chart for this result.
        </CardContent>
      </Card>
    );
  }

  const plan = inferChartPlan(result);

  if (plan.kind === "none" || (plan.confidence === "low" && plan.kind !== "kpi")) {
    return (
      <Card className="border-dashed border-border bg-card/30">
        <CardContent className="space-y-2 py-6 text-sm leading-relaxed text-muted">
          <p>This result is safest to read as a table — the column layout is ambiguous for a quick chart.</p>
          <p className="text-xs text-muted/80">{plan.reason}</p>
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
      <Card className="border-border bg-gradient-to-br from-primary/10 to-card">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs uppercase tracking-wide text-muted">Key figure</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums text-foreground">
            {n != null ? formatKpi(n) : String(raw ?? "—")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted">{label}</p>
          <p className="text-xs text-muted/70">{plan.reason}</p>
        </CardContent>
      </Card>
    );
  }

  if (plan.kind === "line_multi") {
    const { data, seriesMeta } = buildLineMultiChartRows(result, plan);
    if (!seriesMeta.length || data.length === 0) {
      return (
        <Card className="border-dashed border-border bg-card/30">
          <CardContent className="py-6 text-sm text-muted">
            Not enough valid points to draw a multi-series chart. Use the table for the full view.
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="flex h-full flex-col border-border bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chart</CardTitle>
          <CardDescription className="space-y-1">
            <span>{chartSubtitle(plan)}</span>
            <span className="block text-xs text-muted/80">{plan.reason}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="h-full min-h-[260px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
                <XAxis
                  dataKey="x"
                  tick={{ fill: "hsl(215 20% 65%)", fontSize: 10 }}
                  interval="preserveStartEnd"
                  angle={-18}
                  textAnchor="end"
                  height={52}
                />
                <YAxis tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 40% 10%)",
                    border: "1px solid hsl(217 19% 20%)",
                    borderRadius: 8,
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
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
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
      <Card className="border-dashed border-border bg-card/30">
        <CardContent className="py-6 text-sm text-muted">We couldn’t pick sensible columns for a quick chart.</CardContent>
      </Card>
    );
  }

  const data = buildSimpleChartRows(result, plan, plan.kind === "line" ? "line" : "bar");

  const ChartBody =
    plan.kind === "line" ? (
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
        <XAxis dataKey="x" tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(222 40% 10%)",
            border: "1px solid hsl(217 19% 20%)",
            borderRadius: 8,
          }}
          formatter={(v) => [typeof v === "number" ? v.toLocaleString() : String(v), plan.yKey!.replace(/_/g, " ")]}
        />
        <Line type="monotone" dataKey="y" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} name={plan.yKey.replace(/_/g, " ")} />
      </LineChart>
    ) : (
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
        <XAxis dataKey="x" tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} interval={0} angle={-20} height={56} />
        <YAxis tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(222 40% 10%)",
            border: "1px solid hsl(217 19% 20%)",
            borderRadius: 8,
          }}
          formatter={(v) => [typeof v === "number" ? v.toLocaleString() : String(v), plan.yKey!.replace(/_/g, " ")]}
        />
        <Bar dataKey="y" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name={plan.yKey.replace(/_/g, " ")} />
      </BarChart>
    );

  return (
    <Card className="flex h-full flex-col border-border bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chart</CardTitle>
        <CardDescription className="space-y-1">
          <span>{chartSubtitle(plan)}</span>
          <span className="block text-xs text-muted/80">{plan.reason}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="h-full min-h-[240px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            {ChartBody}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
