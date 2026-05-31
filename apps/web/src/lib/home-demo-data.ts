import {
  Activity,
  BarChart3,
  DollarSign,
  LineChart,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Recharts-friendly palette aligned with theme accent colors. */
export const CHART_COLORS = [
  "hsl(217 91% 62%)",
  "hsl(262 83% 66%)",
  "hsl(167 76% 46%)",
  "hsl(38 92% 58%)",
  "hsl(330 82% 64%)",
] as const;

export type DemoMetric = {
  key: string;
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down";
  icon: LucideIcon;
  spark: number[];
};

export const DEMO_METRICS: DemoMetric[] = [
  {
    key: "revenue",
    label: "Total revenue",
    value: "$1.28M",
    delta: "12.4%",
    direction: "up",
    icon: DollarSign,
    spark: [42, 48, 45, 53, 58, 56, 64, 69, 72, 78],
  },
  {
    key: "users",
    label: "Active users",
    value: "18,492",
    delta: "8.1%",
    direction: "up",
    icon: Users,
    spark: [120, 132, 128, 140, 138, 150, 162, 158, 170, 184],
  },
  {
    key: "conversion",
    label: "Conversion rate",
    value: "3.94%",
    delta: "0.6%",
    direction: "down",
    icon: Activity,
    spark: [5.1, 4.8, 4.6, 4.7, 4.4, 4.3, 4.1, 4.2, 4.0, 3.9],
  },
  {
    key: "aov",
    label: "Avg order value",
    value: "$86.40",
    delta: "4.2%",
    direction: "up",
    icon: TrendingUp,
    spark: [70, 72, 71, 74, 76, 78, 80, 82, 84, 86],
  },
];

export type RevenuePoint = { month: string; revenue: number; target: number };

export const DEMO_REVENUE: RevenuePoint[] = [
  { month: "Jan", revenue: 82000, target: 80000 },
  { month: "Feb", revenue: 91000, target: 86000 },
  { month: "Mar", revenue: 99000, target: 92000 },
  { month: "Apr", revenue: 94000, target: 98000 },
  { month: "May", revenue: 112000, target: 104000 },
  { month: "Jun", revenue: 121000, target: 110000 },
  { month: "Jul", revenue: 134000, target: 118000 },
  { month: "Aug", revenue: 128000, target: 124000 },
  { month: "Sep", revenue: 146000, target: 132000 },
  { month: "Oct", revenue: 158000, target: 140000 },
];

export type CategoryPoint = { name: string; value: number };

export const DEMO_CATEGORIES: CategoryPoint[] = [
  { name: "Enterprise", value: 486000 },
  { name: "Mid-market", value: 372000 },
  { name: "SMB", value: 251000 },
  { name: "Self-serve", value: 138000 },
  { name: "Partner", value: 94000 },
];

export type DemoInsight = {
  icon: LucideIcon;
  tag: string;
  tone: "primary" | "success" | "warning" | "accent";
  title: string;
  body: string;
};

export const DEMO_INSIGHTS: DemoInsight[] = [
  {
    icon: TrendingUp,
    tag: "Trend",
    tone: "success",
    title: "Revenue is accelerating",
    body: "Q3 revenue is up 18% vs. the prior quarter, led by Enterprise expansion in North America.",
  },
  {
    icon: Sparkles,
    tag: "Anomaly",
    tone: "warning",
    title: "Conversion dipped on mobile",
    body: "Mobile checkout conversion fell 0.6 pts last week — worth a funnel review before month-end.",
  },
  {
    icon: BarChart3,
    tag: "Top driver",
    tone: "primary",
    title: "Enterprise leads growth",
    body: "Enterprise accounts now drive 38% of revenue, the largest single segment for the third month running.",
  },
];

export type SuggestedPrompt = { label: string; question: string; icon: LucideIcon };

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { label: "Revenue trend", question: "Show total revenue by month for the last year", icon: LineChart },
  { label: "Top customers", question: "Who are the top 10 customers by total spend?", icon: Users },
  { label: "Detect anomalies", question: "Where did we see unusual changes in orders last month?", icon: Sparkles },
  { label: "Segment comparison", question: "Compare revenue by customer segment this quarter vs last", icon: BarChart3 },
];

export function compactCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}
