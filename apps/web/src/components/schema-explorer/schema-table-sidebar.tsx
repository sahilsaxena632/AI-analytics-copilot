"use client";

import type { SchemaExplorerTableDto } from "@analytics-copilot/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/loading-state";
import { cn } from "@/lib/utils";

export function qualifiedTableName(t: SchemaExplorerTableDto): string {
  return `${t.tableSchema}.${t.tableName}`;
}

type Props = {
  tables: SchemaExplorerTableDto[];
  filter: string;
  onFilterChange: (value: string) => void;
  selectedQualified: string | null;
  onSelectTable: (qualified: string) => void;
  loading?: boolean;
};

export function SchemaTableSidebar({
  tables,
  filter,
  onFilterChange,
  selectedQualified,
  onSelectTable,
  loading,
}: Props) {
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? tables.filter((t) => {
        const label = qualifiedTableName(t).toLowerCase();
        return label.includes(q) || t.tableName.toLowerCase().includes(q);
      })
    : tables;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border/70 bg-card/55">
      <div className="border-b border-border/60 p-3">
        <Label htmlFor="table-filter" className="text-xs text-muted-foreground">
          Search tables
        </Label>
        <Input
          id="table-filter"
          className="mt-1.5 h-9"
          placeholder="Filter by name…"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingState label="Loading tables…" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {tables.length === 0 ? "No tables found for this connection." : "No tables match your search."}
          </p>
        ) : (
          <ul className="space-y-0.5" role="listbox" aria-label="Database tables">
            {filtered.map((t) => {
              const qualified = qualifiedTableName(t);
              const active = selectedQualified === qualified;
              return (
                <li key={qualified}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onSelectTable(qualified)}
                    className={cn(
                      "flex w-full flex-col rounded-md px-2 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/12 text-foreground shadow-sm shadow-black/10"
                        : "text-muted-foreground hover:bg-background/45 hover:text-foreground",
                    )}
                  >
                    <span className="font-medium text-foreground">{t.tableName}</span>
                    <span className="text-xs text-muted-foreground">{t.tableSchema}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
