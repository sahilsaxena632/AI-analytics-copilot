import type { QueryExecuteResultDto } from "@analytics-copilot/shared";

export type ChartKind = "none" | "kpi" | "line" | "bar";

export type NumericStats = { column: string; min: number; max: number; sum: number; count: number };

export type InsightSummary = {
  headline: string;
  bullets: string[];
  numericStats?: NumericStats[];
  trend?: "up" | "down" | "flat";
};

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

function isLikelyDateColumn(name: string, sample: unknown): boolean {
  if (/date|time|month|year|day|week|at$|_on$/i.test(name)) {
    return true;
  }
  if (typeof sample === "string" && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
    return true;
  }
  if (sample instanceof Date || (typeof sample === "string" && !Number.isNaN(Date.parse(sample)))) {
    return true;
  }
  return false;
}

export function inferChartKind(result: QueryExecuteResultDto | null): ChartKind {
  if (!result || result.rows.length === 0 || result.columns.length === 0) {
    return "none";
  }
  if (result.rows.length === 1 && result.columns.length === 1) {
    const v = toNumber(result.rows[0][result.columns[0]]);
    if (v != null) {
      return "kpi";
    }
  }
  const sample = result.rows[0];
  let timeCol: string | null = null;
  let numCol: string | null = null;
  for (const c of result.columns) {
    const val = sample[c];
    if (!timeCol && isLikelyDateColumn(c, val)) {
      timeCol = c;
    }
    if (!numCol && toNumber(val) != null) {
      numCol = c;
    }
  }
  if (timeCol && numCol && result.rows.length >= 2) {
    return "line";
  }
  let catCol: string | null = null;
  for (const c of result.columns) {
    if (c === numCol) {
      continue;
    }
    const val = sample[c];
    if (typeof val === "string" || val === null || typeof val === "number") {
      const uniq = new Set(result.rows.map((r) => String(r[c] ?? "")));
      if (uniq.size > 1 && uniq.size <= 24) {
        catCol = c;
        break;
      }
    }
  }
  if (catCol && numCol) {
    return "bar";
  }
  if (numCol && result.columns.length >= 2) {
    return "bar";
  }
  return "none";
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
  const timeCol = result.columns.find((c) => isLikelyDateColumn(c, result.rows[0][c]));
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

export function pickChartSeries(result: QueryExecuteResultDto, kind: ChartKind): { xKey: string; yKey: string } | null {
  if (kind === "none" || kind === "kpi") {
    return null;
  }
  const sample = result.rows[0];
  let xKey = result.columns.find((c) => isLikelyDateColumn(c, sample[c])) ?? null;
  if (kind === "bar" && !xKey) {
    xKey =
      result.columns.find((c) => {
        if (toNumber(sample[c]) != null) {
          return false;
        }
        const uniq = new Set(result.rows.map((r) => String(r[c] ?? "")));
        return uniq.size > 1 && uniq.size <= 32;
      }) ?? result.columns[0];
  }
  const yKey =
    result.columns.find((c) => c !== xKey && toNumber(sample[c]) != null) ??
    result.columns.find((c) => toNumber(sample[c]) != null) ??
    null;
  if (!xKey || !yKey) {
    return null;
  }
  return { xKey, yKey };
}
