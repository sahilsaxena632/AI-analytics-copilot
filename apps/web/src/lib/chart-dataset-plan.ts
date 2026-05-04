import type { QueryExecuteResultDto } from "@analytics-copilot/shared";

/** Public chart kinds (includes multi-series line). */
export type ChartKind = "none" | "kpi" | "line" | "line_multi" | "bar";

export type ChartConfidence = "high" | "medium" | "low";

export type ColumnRole = "time" | "metric" | "category" | "id_like" | "text" | "unknown";

export type ColumnProfile = {
  column: string;
  role: ColumnRole;
  /** 0..1 portion of sampled non-null cells that parse as finite numbers. */
  numericRatio: number;
  /** 0..1 portion of sampled string/non-null cells that parse to a meaningful time. */
  timeParseRatio: number;
  /** Unique values in full result (capped scan). */
  approxUnique: number;
  /** Human-readable inference note (debug / tooltips). */
  hint: string;
};

export type ChartPlan = {
  kind: ChartKind;
  confidence: ChartConfidence;
  reason: string;
  xKey: string | null;
  yKey: string | null;
  /** Series / legend column for `line_multi`. */
  groupKey: string | null;
  /** Sanitized data keys for Recharts (aligned with legend labels). */
  seriesMeta?: Array<{ rawGroup: string; dataKey: string; label: string }>;
};

const SAMPLE_CAP = 120;
const MAX_UNIQ_SCAN_ROWS = 4000;
/** Inclusive: 2 .. MAX_MULTI_SERIES distinct groups allowed for multi-line. */
const MAX_MULTI_SERIES = 14;
const MIN_MULTI_SERIES = 2;
const MAX_BAR_CATEGORIES = 28;
/** If more columns than this and we cannot isolate a tight chart slice, prefer table. */
const MAX_COLUMNS_FOR_AUTO_CHART = 20;

const TIME_NAME_RE = /(date|time|timestamp|month|year|week|day|quarter|period|_at$|_on$)/i;
const METRIC_NAME_RE = /(count|sum|total|avg|mean|num_|amount|revenue|price|qty|quantity|value|sales|score|rate)/i;
const ID_NAME_RE = /(^|_)(id|uuid|guid|pk|sk|key)($|_)/i;

export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sampleRows<T>(rows: T[]): T[] {
  if (rows.length <= SAMPLE_CAP) {
    return rows;
  }
  const out: T[] = [];
  const step = Math.max(1, Math.floor(rows.length / SAMPLE_CAP));
  for (let i = 0; i < rows.length && out.length < SAMPLE_CAP; i += step) {
    out.push(rows[i]);
  }
  if (out[out.length - 1] !== rows[rows.length - 1]) {
    out.push(rows[rows.length - 1]);
  }
  return out.slice(0, SAMPLE_CAP);
}

function parseTimeMs(v: unknown): number | null {
  if (v == null) {
    return null;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.getTime();
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 1e11 && v < 1e14) {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    }
    if (v > 1e9 && v < 1e11) {
      const d = new Date(v * 1000);
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    }
  }
  const s = String(v).trim();
  if (!s) {
    return null;
  }
  // YYYY-MM or YYYY-MM-DD
  if (/^\d{4}-\d{2}(-\d{2})?/.test(s)) {
    const ms = Date.parse(s.length === 7 ? `${s}-01` : s);
    return Number.isNaN(ms) ? null : ms;
  }
  const ms = Date.parse(s);
  if (!Number.isNaN(ms)) {
    return ms;
  }
  return null;
}

function approxUniqueCount(rows: Record<string, unknown>[], column: string): number {
  const set = new Set<string>();
  const cap = Math.min(rows.length, MAX_UNIQ_SCAN_ROWS);
  for (let i = 0; i < cap; i++) {
    set.add(stableKey(rows[i][column]));
    if (set.size > MAX_BAR_CATEGORIES + 50) {
      break;
    }
  }
  if (cap < rows.length && set.size > MAX_BAR_CATEGORIES + 50) {
    return set.size;
  }
  for (let i = cap; i < rows.length; i++) {
    set.add(stableKey(rows[i][column]));
  }
  return set.size;
}

function stableKey(v: unknown): string {
  if (v == null) {
    return "__null__";
  }
  if (typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

function classifyColumn(
  column: string,
  sample: Record<string, unknown>[],
  rows: Record<string, unknown>[],
): Omit<ColumnProfile, "column"> {
  let nonNull = 0;
  let numericHits = 0;
  let timeHits = 0;
  let uuidHits = 0;
  for (const row of sample) {
    const v = row[column];
    if (v == null || v === "") {
      continue;
    }
    nonNull++;
    if (toNumber(v) != null) {
      numericHits++;
    }
    if (parseTimeMs(v) != null) {
      timeHits++;
    }
    if (typeof v === "string" && isUuidLike(v)) {
      uuidHits++;
    }
  }
  const denom = Math.max(1, nonNull);
  const numericRatio = numericHits / denom;
  const timeParseRatio = timeHits / denom;
  const approxUnique = approxUniqueCount(rows, column);

  let role: ColumnRole = "unknown";
  let hint = "";

  if (uuidHits > sample.length * 0.4 || (ID_NAME_RE.test(column) && approxUnique > Math.max(40, rows.length * 0.4))) {
    role = "id_like";
    hint = "High-cardinality identifier-like values.";
  } else if (timeParseRatio >= 0.55 || (TIME_NAME_RE.test(column) && timeParseRatio >= 0.25)) {
    role = "time";
    hint = "Values mostly parse as dates/times.";
  } else if (numericRatio >= 0.85 && METRIC_NAME_RE.test(column)) {
    role = "metric";
    hint = "Numeric column with measure-like name.";
  } else if (numericRatio >= 0.85 && !ID_NAME_RE.test(column)) {
    role = "metric";
    hint = "Mostly numeric.";
  } else if (numericRatio >= 0.85 && ID_NAME_RE.test(column) && approxUnique > MAX_MULTI_SERIES * 3) {
    role = "id_like";
    hint = "Numeric IDs with very high cardinality.";
  } else if (numericRatio >= 0.85) {
    role = "metric";
    hint = "Mostly numeric; treated as measure.";
  } else if (numericRatio > 0.2 && numericRatio < 0.85) {
    role = "text";
    hint = "Mixed types — not a clean measure.";
  } else if (approxUnique <= MAX_MULTI_SERIES * 2 && approxUnique >= MIN_MULTI_SERIES) {
    role = "category";
    hint = "Low/medium cardinality labels.";
  } else if (approxUnique > MAX_MULTI_SERIES * 2) {
    role = "text";
    hint = "High-cardinality text-like column.";
  } else {
    role = approxUnique <= 1 ? "text" : "category";
    hint = approxUnique <= 1 ? "Constant or empty." : "Discrete labels.";
  }

  // Low-cardinality *_id columns behave as categories (e.g. store_id).
  if (ID_NAME_RE.test(column) && approxUnique <= MAX_MULTI_SERIES && approxUnique >= MIN_MULTI_SERIES) {
    role = "category";
    hint = "Identifier-named column with low cardinality — usable as a series key.";
  }

  return { role, numericRatio, timeParseRatio, approxUnique, hint };
}

export function buildColumnProfiles(result: QueryExecuteResultDto): ColumnProfile[] {
  const sample = sampleRows(result.rows);
  return result.columns.map((column) => {
    const base = classifyColumn(column, sample, result.rows);
    return { column, ...base };
  });
}

export function inferPrimaryTimeColumn(result: QueryExecuteResultDto): string | null {
  const profiles = buildColumnProfiles(result);
  return bestTimeColumn(profiles, sampleRows(result.rows));
}

function bestTimeColumn(profiles: ColumnProfile[], sample: Record<string, unknown>[]): string | null {
  const candidates = profiles.filter((p) => p.role === "time" || p.timeParseRatio >= 0.35);
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => {
    const ta = timeSortScore(a.column, sample);
    const tb = timeSortScore(b.column, sample);
    if (tb !== ta) {
      return tb - ta;
    }
    return b.timeParseRatio - a.timeParseRatio;
  });
  return candidates[0].column;
}

function timeSortScore(column: string, sample: Record<string, unknown>[]): number {
  let ok = 0;
  for (const row of sample.slice(0, 40)) {
    if (parseTimeMs(row[column]) != null) {
      ok++;
    }
  }
  return ok + (TIME_NAME_RE.test(column) ? 5 : 0);
}

function bestMetricColumn(
  profiles: ColumnProfile[],
  exclude: Set<string>,
): { column: string; score: number } | null {
  let best: { column: string; score: number } | null = null;
  for (const p of profiles) {
    if (exclude.has(p.column)) {
      continue;
    }
    if (p.role === "id_like" || p.role === "time") {
      continue;
    }
    if (p.numericRatio < 0.5) {
      continue;
    }
    let score = p.numericRatio * 100;
    if (METRIC_NAME_RE.test(p.column)) {
      score += 35;
    }
    if (p.role === "metric") {
      score += 15;
    }
    if (ID_NAME_RE.test(p.column)) {
      score -= 25;
    }
    if (!best || score > best.score) {
      best = { column: p.column, score };
    }
  }
  return best;
}

function bestCategoryForGrouping(
  profiles: ColumnProfile[],
  exclude: Set<string>,
  columnOrder: string[],
): ColumnProfile | null {
  const orderIdx = (c: string) => {
    const i = columnOrder.indexOf(c);
    return i === -1 ? 999 : i;
  };
  const cands = profiles.filter((p) => !exclude.has(p.column) && p.approxUnique >= MIN_MULTI_SERIES);
  cands.sort((a, b) => {
    const ac = a.approxUnique <= MAX_MULTI_SERIES ? 0 : 1;
    const bc = b.approxUnique <= MAX_MULTI_SERIES ? 0 : 1;
    if (ac !== bc) {
      return ac - bc;
    }
    if (a.role === "category" && b.role !== "category") {
      return -1;
    }
    if (b.role === "category" && a.role !== "category") {
      return 1;
    }
    if (a.approxUnique !== b.approxUnique) {
      return a.approxUnique - b.approxUnique;
    }
    return orderIdx(a.column) - orderIdx(b.column);
  });
  const p = cands[0];
  if (!p || p.approxUnique < MIN_MULTI_SERIES) {
    return null;
  }
  return p;
}

function bestCategoryForBar(
  profiles: ColumnProfile[],
  exclude: Set<string>,
  columnOrder: string[],
): ColumnProfile | null {
  const orderIdx = (c: string) => {
    const i = columnOrder.indexOf(c);
    return i === -1 ? 999 : i;
  };
  const cands = profiles.filter(
    (p) => !exclude.has(p.column) && p.role !== "metric" && p.approxUnique >= 2 && p.approxUnique <= MAX_BAR_CATEGORIES,
  );
  cands.sort((a, b) => {
    if (a.role === "category" && b.role !== "category") {
      return -1;
    }
    if (b.role === "category" && a.role !== "category") {
      return 1;
    }
    const at = a.role === "time" ? 1 : 0;
    const bt = b.role === "time" ? 1 : 0;
    if (at !== bt) {
      return at - bt;
    }
    if (b.approxUnique !== a.approxUnique) {
      return b.approxUnique - a.approxUnique;
    }
    return orderIdx(a.column) - orderIdx(b.column);
  });
  return cands[0] ?? null;
}

function countMetricColumns(profiles: ColumnProfile[], exclude: Set<string>): number {
  let n = 0;
  for (const p of profiles) {
    if (exclude.has(p.column)) {
      continue;
    }
    if (p.role === "id_like") {
      continue;
    }
    if (p.numericRatio >= 0.5) {
      n++;
    }
  }
  return n;
}

export function inferChartPlan(result: QueryExecuteResultDto | null): ChartPlan {
  const none = (reason: string, confidence: ChartConfidence = "low"): ChartPlan => ({
    kind: "none",
    confidence,
    reason,
    xKey: null,
    yKey: null,
    groupKey: null,
  });

  if (!result || result.rows.length === 0 || result.columns.length === 0) {
    return none("No rows or columns to chart.");
  }

  if (result.columns.length > MAX_COLUMNS_FOR_AUTO_CHART) {
    return none(`Too many columns (${result.columns.length}) for a safe automatic chart.`, "low");
  }

  const profiles = buildColumnProfiles(result);
  const sample = sampleRows(result.rows);

  // --- KPI ---
  if (result.rows.length === 1) {
    const numericCols = result.columns.filter((c) => toNumber(result.rows[0][c]) != null);
    const nonIdNumeric = numericCols.filter((c) => {
      const p = profiles.find((x) => x.column === c);
      return p && p.role !== "id_like";
    });
    if (result.columns.length === 1 && numericCols.length === 1) {
      return {
        kind: "kpi",
        confidence: "high",
        reason: "Single scalar result.",
        xKey: null,
        yKey: result.columns[0],
        groupKey: null,
      };
    }
    if (nonIdNumeric.length === 1) {
      return {
        kind: "kpi",
        confidence: "medium",
        reason: "One row with a single clear numeric measure.",
        xKey: null,
        yKey: nonIdNumeric[0],
        groupKey: null,
      };
    }
    if (numericCols.length === 1) {
      return {
        kind: "kpi",
        confidence: "medium",
        reason: "One row with one numeric column.",
        xKey: null,
        yKey: numericCols[0],
        groupKey: null,
      };
    }
    return none("One row with multiple numeric columns — ambiguous KPI.", "low");
  }

  const timeCol = bestTimeColumn(profiles, sample);
  const used = new Set<string>();
  if (timeCol) {
    used.add(timeCol);
  }

  const metricPick = bestMetricColumn(profiles, used);
  if (!metricPick || metricPick.score < 18) {
    return none("No clear numeric measure column found.", "low");
  }

  const yKey = metricPick.column;
  used.add(yKey);

  // --- Time + metric: multi vs single vs ambiguous ---
  if (timeCol) {
    const groupProfile = bestCategoryForGrouping(profiles, used, result.columns);
    const hasExtraGroup =
      groupProfile &&
      groupProfile.column !== timeCol &&
      groupProfile.column !== yKey &&
      groupProfile.approxUnique >= MIN_MULTI_SERIES;

    if (hasExtraGroup) {
      if (groupProfile.approxUnique <= MAX_MULTI_SERIES) {
        return {
          kind: "line_multi",
          confidence: "high",
          reason: `Time column, measure, and low-cardinality grouping (${groupProfile.approxUnique} series).`,
          xKey: timeCol,
          yKey,
          groupKey: groupProfile.column,
        };
      }
      return none(
        `Grouping column "${groupProfile.column}" has too many distinct values (${groupProfile.approxUnique}) for a readable multi-series chart.`,
        "low",
      );
    }

    return {
      kind: "line",
      confidence: "high",
      reason: "Time column with a numeric measure and no extra grouping dimension.",
      xKey: timeCol,
      yKey,
      groupKey: null,
    };
  }

  // --- Bar: category + metric (no usable time axis) ---
  const cat = bestCategoryForBar(profiles, used, result.columns);
  if (cat && cat.approxUnique >= 2 && cat.approxUnique <= MAX_BAR_CATEGORIES) {
    return {
      kind: "bar",
      confidence: cat.role === "category" ? "high" : "medium",
      reason: "Categorical axis with a numeric measure.",
      xKey: cat.column,
      yKey,
      groupKey: null,
    };
  }

  if (countMetricColumns(profiles, used) >= 1 && result.columns.length >= 2) {
    return none("Structure is ambiguous — not enough clean category/time pairing.", "low");
  }

  return none("Could not infer a trustworthy chart shape.", "low");
}

/** Sanitize group values for object keys / Recharts dataKeys. */
export function sanitizeSeriesDataKey(raw: string, index: number): string {
  const base = raw.replace(/[^\w]/g, "_").replace(/^(\d)/, "_$1");
  const cleaned = base.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `s${index}_${cleaned || "series"}`;
}

export type LineMultiChartRow = Record<string, string | number | null>;

export function buildLineMultiChartRows(
  result: QueryExecuteResultDto,
  plan: ChartPlan,
): { data: LineMultiChartRow[]; seriesMeta: NonNullable<ChartPlan["seriesMeta"]> } {
  if (!plan.xKey || !plan.yKey || !plan.groupKey) {
    return { data: [], seriesMeta: [] };
  }

  /** x label -> group key -> summed metric */
  const byTime = new Map<string, Map<string, number>>();

  for (const row of result.rows) {
    const tx = parseTimeMs(row[plan.xKey]);
    const xLabel = tx != null ? String(row[plan.xKey] ?? formatXLabel(tx)) : String(row[plan.xKey] ?? "");
    const gRaw = String(row[plan.groupKey] ?? "—");
    const y = toNumber(row[plan.yKey]);
    if (y == null) {
      continue;
    }
    if (!byTime.has(xLabel)) {
      byTime.set(xLabel, new Map());
    }
    const inner = byTime.get(xLabel)!;
    inner.set(gRaw, (inner.get(gRaw) ?? 0) + y);
  }

  const groupTotals = new Map<string, number>();
  for (const inner of byTime.values()) {
    for (const [g, v] of inner) {
      groupTotals.set(g, (groupTotals.get(g) ?? 0) + v);
    }
  }

  let groups = [...groupTotals.keys()].sort((a, b) => groupTotals.get(b)! - groupTotals.get(a)!);
  if (groups.length > MAX_MULTI_SERIES) {
    groups = groups.slice(0, MAX_MULTI_SERIES);
  }

  const seriesMeta = groups.map((rawGroup, index) => ({
    rawGroup,
    dataKey: sanitizeSeriesDataKey(rawGroup, index),
    label: rawGroup,
  }));

  const xKeysSorted = [...byTime.keys()].sort((a, b) => {
    const ta = parseTimeMs(a) ?? Date.parse(a);
    const tb = parseTimeMs(b) ?? Date.parse(b);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
      return ta - tb;
    }
    return String(a).localeCompare(String(b));
  });

  const data: LineMultiChartRow[] = xKeysSorted.map((xLabel) => {
    const point: LineMultiChartRow = { x: xLabel };
    const inner = byTime.get(xLabel)!;
    for (const { rawGroup, dataKey } of seriesMeta) {
      const v = inner.get(rawGroup);
      point[dataKey] = v != null ? v : null;
    }
    return point;
  });

  return { data, seriesMeta };
}

function formatXLabel(ms: number): string {
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return String(ms);
  }
}

export type SimpleChartRow = { x: string; y: number };

export function buildSimpleChartRows(
  result: QueryExecuteResultDto,
  plan: ChartPlan,
  kind: "line" | "bar",
): SimpleChartRow[] {
  if (!plan.xKey || !plan.yKey) {
    return [];
  }
  const rows = result.rows.map((row, i) => ({
    x: String(row[plan.xKey!] ?? `Item ${i + 1}`),
    y: toNumber(row[plan.yKey!]) ?? 0,
  }));
  if (kind === "line") {
    return [...rows].sort((a, b) => {
      const ta = parseTimeMs(a.x) ?? Date.parse(a.x);
      const tb = parseTimeMs(b.x) ?? Date.parse(b.x);
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
        return ta - tb;
      }
      return a.x.localeCompare(b.x);
    });
  }
  return rows;
}

const LINE_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(280 65% 60%)",
  "hsl(160 55% 45%)",
  "hsl(35 90% 55%)",
  "hsl(340 75% 55%)",
  "hsl(200 80% 50%)",
  "hsl(25 85% 55%)",
  "hsl(130 45% 45%)",
  "hsl(300 55% 55%)",
  "hsl(190 70% 50%)",
  "hsl(50 90% 50%)",
  "hsl(250 60% 60%)",
  "hsl(10 80% 55%)",
  "hsl(220 60% 65%)",
];

export function lineColorAt(i: number): string {
  return LINE_COLORS[i % LINE_COLORS.length];
}
