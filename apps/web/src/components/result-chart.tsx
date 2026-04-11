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
export function ResultChart({ result }: { result: QueryExecuteResultDto | null }) {
  if (!result || result.rows.length === 0 || result.columns.length < 2) {
    return <p className="text-sm text-muted">Not enough structured data for a chart.</p>;
  }

  const [labelKey, valueKey] = pickSeries(result);
  if (!valueKey) {
    return <p className="text-sm text-muted">No numeric column found for charting.</p>;
  }

  const data = result.rows.map((row, i) => ({
    name: String(row[labelKey] ?? `Row ${i + 1}`),
    value: Number(row[valueKey]),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 20%)" />
          <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
          <YAxis tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "hsl(222 40% 10%)",
              border: "1px solid hsl(217 19% 20%)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
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
