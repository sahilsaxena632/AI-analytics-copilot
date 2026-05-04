import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import { inferChartPlan, inferPrimaryTimeColumn, toNumber, type ChartKind } from "@/lib/chart-dataset-plan";

export type { ChartKind, ChartPlan, ChartConfidence, ColumnProfile, ColumnRole } from "@/lib/chart-dataset-plan";
export { inferChartPlan, buildColumnProfiles, inferPrimaryTimeColumn } from "@/lib/chart-dataset-plan";

export type NumericStats = { column: string; min: number; max: number; sum: number; count: number };

export type InsightSummary = {
  headline: string;
  bullets: string[];
  numericStats?: NumericStats[];
  trend?: "up" | "down" | "flat";
};

/** Maps heuristic chart shape to dashboard card chart types. */
export function inferDashboardCardChartType(result: QueryExecuteResultDto | null): "bar" | "line" | "table" {
  const k = inferChartPlan(result).kind;
  if (k === "line" || k === "line_multi") {
    return "line";
  }
  if (k === "bar") {
    return "bar";
  }
  return "table";
}

export function inferChartKind(result: QueryExecuteResultDto | null): ChartKind {
  return inferChartPlan(result).kind;
}

export function buildInsightSummary(result: QueryExecuteResultDto | null): InsightSummary | null {
  if (!result || result.rows.length === 0) {
    return null;
  }
  const bullets: string[] = [];
  const stats: NumericStats[] = [];
  for (const col of result.columns) {
    const nums = result.rows.map((r) => toNumber(r[col])).filter((n): n is number => n != null);
    if (nums.length === 0) {
      continue;
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const sum = nums.reduce((a, b) => a + b, 0);
    stats.push({ column: col, min, max, sum, count: nums.length });
    if (stats.length >= 3) {
      break;
    }
  }
  for (const s of stats.slice(0, 2)) {
    bullets.push(`${s.column}: high ${formatNum(s.max)}, low ${formatNum(s.min)}, total ${formatNum(s.sum)}`);
  }
  if (bullets.length === 0) {
    bullets.push(`${result.rowCount} row${result.rowCount === 1 ? "" : "s"} returned.`);
  }

  let trend: "up" | "down" | "flat" | undefined;
  const timeCol = inferPrimaryTimeColumn(result);
  const measureCol = stats[0]?.column;
  if (timeCol && measureCol && result.rows.length >= 4) {
    const ordered = [...result.rows].sort((a, b) => {
      const ta = Date.parse(String(a[timeCol] ?? ""));
      const tb = Date.parse(String(b[timeCol] ?? ""));
      return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
    });
    const mid = Math.floor(ordered.length / 2);
    const first = ordered.slice(0, mid);
    const second = ordered.slice(mid);
    const avg = (rows: Record<string, unknown>[]) => {
      const vals = rows.map((r) => toNumber(r[measureCol])).filter((n): n is number => n != null);
      if (!vals.length) {
        return 0;
      }
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const a1 = avg(first);
    const a2 = avg(second);
    if (a2 > a1 * 1.05) {
      trend = "up";
    } else if (a2 < a1 * 0.95) {
      trend = "down";
    } else {
      trend = "flat";
    }
    if (trend === "up") {
      bullets.push("Recent values in the time series trend higher than earlier values.");
    } else if (trend === "down") {
      bullets.push("Recent values in the time series trend lower than earlier values.");
    } else if (trend === "flat") {
      bullets.push("The time series is relatively stable across the window shown.");
    }
  }

  const headline =
    result.rows.length === 1 && result.columns.length === 1
      ? "Single metric"
      : result.rowCount <= 10
        ? "Snapshot"
        : "Results overview";

  return { headline, bullets, numericStats: stats.length ? stats : undefined, trend };
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 10_000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  if (Number.isInteger(n)) {
    return String(n);
  }
  return n.toFixed(2);
}

export function pickChartSeries(
  result: QueryExecuteResultDto,
  kind: ChartKind,
): { xKey: string; yKey: string; groupKey?: string | null } | null {
  if (kind === "none" || kind === "kpi") {
    return null;
  }
  const plan = inferChartPlan(result);
  if (plan.kind === "none" || plan.kind === "kpi") {
    return null;
  }
  if (plan.kind !== kind) {
    return null;
  }
  if (!plan.xKey || !plan.yKey) {
    return null;
  }
  return { xKey: plan.xKey, yKey: plan.yKey, groupKey: plan.groupKey };
}
