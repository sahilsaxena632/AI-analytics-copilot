import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightCard({
  title,
  description,
  value,
  trend,
}: {
  title: string;
  description?: string;
  value: string;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {trend ? <p className="mt-1 text-xs text-muted">{trend}</p> : null}
      </CardContent>
    </Card>
  );
}
