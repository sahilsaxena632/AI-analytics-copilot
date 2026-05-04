"use client";

import type { QueryExecuteResultDto } from "@analytics-copilot/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Picks first string-like column as label and first numeric column as value. */
const GRID = "hsl(217 19% 32% / 0.28)";
const AXIS = "hsl(215 16% 58%)";

export function ResultChart({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result || result.rows.length === 0 || result.columns.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-border/65 bg-background/25 px-4 py-6 text-center text-sm text-muted-foreground">
        Not enough structured data for a chart.
      </p>
    );
  }

  const [labelKey, valueKey] = pickSeries(result);
  if (!valueKey) {
    return (
      <p className="rounded-lg border border-dashed border-border/65 bg-background/25 px-4 py-6 text-center text-sm text-muted-foreground">
        No numeric column found for charting.
      </p>
    );
  }

  const data = result.rows.map((row, i) => ({
    name: String(row[labelKey] ?? `Row ${i + 1}`),
    value: Number(row[valueKey]),
  }));

  return (
    <div className="h-72 w-full rounded-lg border border-border/45 bg-background/35 p-4 sm:h-80 sm:p-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(217 19% 28% / 0.55)" }}
          />
          <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={{
              background: "hsl(222 40% 10%)",
              border: "1px solid hsl(217 19% 24%)",
              borderRadius: 10,
              padding: "10px 12px",
              boxShadow: "0 8px 24px hsl(0 0% 0% / 0.25)",
            }}
          />
          <Bar dataKey="value" fill="hsl(217 91% 58%)" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function pickSeries(result: QueryExecuteResultDto): [string, string | null] {
  const cols = result.columns;
  const sample = result.rows[0];
  let valueKey: string | null = null;
  for (const c of cols) {
    const v = sample[c];
    if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))) {
      valueKey = c;
      break;
    }
  }
  const labelKey = cols.find((c) => c !== valueKey) ?? cols[0];
  return [labelKey, valueKey];
}
