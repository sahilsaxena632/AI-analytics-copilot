"use client";

import { useMemo, useState } from "react";
import type { SchemaExplorerTableDto } from "@analytics-copilot/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { qualifiedTableName } from "@/components/schema-explorer/schema-table-sidebar";
import { cn } from "@/lib/utils";

type Props = {
  tables: SchemaExplorerTableDto[];
  selectedQualified: string[];
  onSelectionChange: (next: string[]) => void;
  disabled?: boolean;
};

export function AskTableContextPicker({ tables, selectedQualified, onSelectionChange, disabled }: Props) {
  const [filter, setFilter] = useState("");

  const sorted = useMemo(
    () => [...tables].sort((a, b) => qualifiedTableName(a).localeCompare(qualifiedTableName(b))),
    [tables],
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return sorted;
    }
    return sorted.filter((t) => {
      const name = qualifiedTableName(t).toLowerCase();
      return name.includes(q) || t.tableName.toLowerCase().includes(q);
    });
  }, [sorted, filter]);

  const toggle = (qualified: string) => {
    if (selectedQualified.includes(qualified)) {
      onSelectionChange(selectedQualified.filter((x) => x !== qualified));
    } else {
      onSelectionChange([...selectedQualified, qualified]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="tbl-search" className="text-xs text-muted-foreground">
            Search tables
          </Label>
          <Input
            id="tbl-search"
            type="search"
            placeholder="Filter by name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={disabled}
            className="h-9 text-sm"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled || selectedQualified.length === 0}
          onClick={() => onSelectionChange([])}
        >
          Clear selection
        </Button>
      </div>
      <div
        className={cn(
          "max-h-52 overflow-y-auto rounded-md border border-border/70 bg-background/35 p-2",
          disabled && "pointer-events-none opacity-50",
        )}
        role="group"
        aria-label="Table context"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tables match your search.</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((t) => {
              const q = qualifiedTableName(t);
              const checked = selectedQualified.includes(q);
              return (
                <li key={q}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-background/55",
                      checked && "bg-primary/10",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
                      checked={checked}
                      onChange={() => toggle(q)}
                      disabled={disabled}
                    />
                    <span className="min-w-0 truncate font-mono text-xs text-foreground">{q}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Leave none checked to use the <span className="font-medium text-foreground/90">full schema</span>. Checking one or
        more tables limits suggestions to those tables only.
      </p>
    </div>
  );
}
