"use client";

import type { SchemaExplorerColumnDto } from "@analytics-copilot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  columns: SchemaExplorerColumnDto[];
};

export function SchemaColumnGrid({ title, description, columns }: Props) {
  return (
    <Card className="bg-card/75">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background/25">
          <div className="max-h-[420px] overflow-auto overscroll-contain">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 font-medium">Column</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Nullable</th>
                <th className="px-3 py-2 font-medium">Key</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {columns.map((c) => (
                  <tr key={c.columnName} className="even:bg-background/5">
                    <td className="px-3 py-2.5 font-medium text-foreground">{c.columnName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.dataType}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.isNullable ? "Yes" : "No"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {c.isPrimaryKey ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          <KeyRound className="h-3 w-3" aria-hidden />
                          Primary
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
