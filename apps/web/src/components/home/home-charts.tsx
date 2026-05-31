"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CHART_COLORS,
  DEMO_CATEGORIES,
  DEMO_REVENUE,
  compactCurrency,
} from "@/lib/home-demo-data";

const GRID = "hsl(217 19% 32% / 0.22)";
const AXIS = "hsl(215 16% 58%)";

const tooltipStyle = {
  background: "hsl(222 40% 10%)",
  border: "1px solid hsl(217 19% 24%)",
  borderRadius: 10,
  padding: "10px 12px",
  boxShadow: "0 8px 24px hsl(0 0% 0% / 0.3)",
  fontSize: 12,
} as const;

export function HomeCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="animate-fade-up lg:col-span-3">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Revenue vs. target</CardTitle>
            <CardDescription>Monthly performance over the last 10 months</CardDescription>
          </div>
          <Badge variant="success">+12.4%</Badge>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO_REVENUE} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => compactCurrency(Number(v))}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number | string, name) => [compactCurrency(Number(v)), String(name)]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2.5}
                  fill="url(#rev)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up delay-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Revenue by segment</CardTitle>
          <CardDescription>Where this period&apos;s revenue comes from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_CATEGORIES} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={78}
                />
                <Tooltip
                  cursor={{ fill: "hsl(217 19% 32% / 0.15)" }}
                  contentStyle={tooltipStyle}
                  formatter={(v: number | string) => [compactCurrency(Number(v)), "Revenue"]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {DEMO_CATEGORIES.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
