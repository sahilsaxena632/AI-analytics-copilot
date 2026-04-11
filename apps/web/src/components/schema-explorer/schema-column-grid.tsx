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
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Column</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Nullable</th>
                <th className="px-3 py-2 font-medium">Key</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.columnName} className="border-t border-border/60 odd:bg-background/30">
                  <td className="px-3 py-2 font-medium text-foreground">{c.columnName}</td>
                  <td className="px-3 py-2 text-muted">{c.dataType}</td>
                  <td className="px-3 py-2 text-muted">{c.isNullable ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-muted">
                    {c.isPrimaryKey ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
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
      </CardContent>
    </Card>
  );
}
