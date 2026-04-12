"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inferChartKind, pickChartSeries } from "@/lib/query-result-heuristics";

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function QueryAutoChart({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result || result.rows.length === 0) {
    return null;
  }
  const kind = inferChartKind(result);
  if (kind === "none") {
    return (
      <Card className="border-dashed border-border bg-card/30">
        <CardContent className="py-6 text-sm leading-relaxed text-muted">
          This result works best as a table. Use the results grid above for the full view.
        </CardContent>
      </Card>
    );
  }
  if (kind === "kpi") {
    const col = result.columns[0];
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
        <CardContent>
          <p className="text-sm text-muted">{label}</p>
        </CardContent>
      </Card>
    );
  }
  const series = pickChartSeries(result, kind);
  if (!series) {
    return (
      <Card className="border-dashed border-border bg-card/30">
        <CardContent className="py-6 text-sm text-muted">We couldn’t pick sensible columns for a quick chart.</CardContent>
      </Card>
    );
  }
  const { xKey, yKey } = series;
  const data = result.rows.map((row, i) => ({
    x: String(row[xKey] ?? `Item ${i + 1}`),
    y: toNumber(row[yKey]) ?? 0,
  }));

  const ChartBody =
    kind === "line" ? (
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
        <XAxis dataKey="x" tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
        <YAxis tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(222 40% 10%)",
            border: "1px solid hsl(217 19% 20%)",
            borderRadius: 8,
          }}
        />
        <Line type="monotone" dataKey="y" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
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
        />
        <Bar dataKey="y" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    );

  return (
    <Card className="border-border bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chart</CardTitle>
        <CardDescription>
          {kind === "line" ? "Trend-style view from your time column and main number." : "Comparison across categories."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {ChartBody}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

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
