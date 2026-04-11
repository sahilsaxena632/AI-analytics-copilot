"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SchemaExplorerSchemaDto, SchemaExplorerTableDto, SchemaTablePreviewDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { SchemaColumnGrid } from "@/components/schema-explorer/schema-column-grid";
import { SchemaDataPreview } from "@/components/schema-explorer/schema-data-preview";
import { qualifiedTableName, SchemaTableSidebar } from "@/components/schema-explorer/schema-table-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/loading-state";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Database, Table2 } from "lucide-react";

type Connection = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function AppSchemaExplorerPage() {
  const { token } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState("");
  const [schema, setSchema] = useState<SchemaExplorerSchemaDto | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState("");
  const [selectedQualified, setSelectedQualified] = useState<string | null>(null);
  const [preview, setPreview] = useState<SchemaTablePreviewDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const activeConnections = useMemo(() => connections.filter((c) => c.isActive), [connections]);

  const loadConnections = useCallback(async () => {
    if (!token) {
      return;
    }
    setConnectionsLoading(true);
    setConnectionsError(null);
    try {
      const rows = await apiFetch<Connection[]>("/database-connections", { token });
      setConnections(rows);
      setConnectionId((prev) => {
        if (prev && rows.some((r) => r.id === prev && r.isActive)) {
          return prev;
        }
        return rows.find((r) => r.isActive)?.id ?? "";
      });
    } catch {
      setConnectionsError("We could not load your saved connections.");
    } finally {
      setConnectionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadConnections();
    }
  }, [token, loadConnections]);

  const loadSchema = useCallback(async () => {
    if (!token || !connectionId) {
      setSchema(null);
      return;
    }
    setSchemaLoading(true);
    setSchemaError(null);
    setSelectedQualified(null);
    setPreview(null);
    setPreviewError(null);
    try {
      const data = await apiFetch<SchemaExplorerSchemaDto>(`/database-connections/${connectionId}/schema`, { token });
      setSchema(data);
    } catch (err) {
      setSchema(null);
      setSchemaError(err instanceof ApiError ? err.message : "The schema could not be loaded.");
    } finally {
      setSchemaLoading(false);
    }
  }, [token, connectionId]);

  useEffect(() => {
    if (token && connectionId) {
      void loadSchema();
    }
  }, [token, connectionId, loadSchema]);

  const selectedTable: SchemaExplorerTableDto | null = useMemo(() => {
    if (!schema || !selectedQualified) {
      return null;
    }
    return schema.tables.find((t) => qualifiedTableName(t) === selectedQualified) ?? null;
  }, [schema, selectedQualified]);

  const loadPreview = useCallback(
    async (qualified: string) => {
      if (!token || !connectionId) {
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      setPreview(null);
      try {
        const enc = encodeURIComponent(qualified);
        const data = await apiFetch<SchemaTablePreviewDto>(
          `/database-connections/${connectionId}/schema/${enc}/preview`,
          { token },
        );
        setPreview(data);
      } catch (err) {
        setPreviewError(err instanceof ApiError ? err.message : "The row preview could not be loaded.");
      } finally {
        setPreviewLoading(false);
      }
    },
    [token, connectionId],
  );

  useEffect(() => {
    if (selectedQualified) {
      void loadPreview(selectedQualified);
    } else {
      setPreview(null);
      setPreviewError(null);
    }
  }, [selectedQualified, loadPreview]);

  const handleConnectionChange = (id: string) => {
    setConnectionId(id);
    setTableFilter("");
    setSelectedQualified(null);
  };

  return (
    <>
      <AppHeader
        title="Schema explorer"
        subtitle="Browse tables, columns, and sample data from your connected warehouses."
      />
      <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        {!token ? (
          <EmptyState title="Sign in required" description="Sign in to explore database schemas." />
        ) : connectionsError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-6">
              <p className="text-sm text-red-200">{connectionsError}</p>
            </CardContent>
          </Card>
        ) : connectionsLoading && connections.length === 0 ? (
          <Card className="border-border bg-card/50">
            <CardContent className="flex justify-center py-16">
              <LoadingState label="Loading connections…" />
            </CardContent>
          </Card>
        ) : activeConnections.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No active connections"
            description="Add a PostgreSQL or MySQL connection to explore tables and columns here."
          />
        ) : (
          <>
            <Card className="border-border bg-card/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Connection</CardTitle>
                <CardDescription>Choose which database to explore. Only active connections are listed.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-4">
                <div className="min-w-[220px] flex-1">
                  <Label htmlFor="schema-conn" className="text-xs text-muted">
                    Database connection
                  </Label>
                  <select
                    id="schema-conn"
                    className="mt-1.5 flex h-10 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    value={connectionId}
                    onChange={(e) => handleConnectionChange(e.target.value)}
                  >
                    {activeConnections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {schemaLoading ? (
                  <LoadingState label="Loading schema…" />
                ) : null}
              </CardContent>
            </Card>

            {schemaError ? (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="py-6">
                  <p className="text-sm text-red-200">{schemaError}</p>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid min-h-[480px] flex-1 gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
              <SchemaTableSidebar
                tables={schema?.tables ?? []}
                filter={tableFilter}
                onFilterChange={setTableFilter}
                selectedQualified={selectedQualified}
                onSelectTable={setSelectedQualified}
                loading={schemaLoading}
              />

              <div className="flex min-h-0 flex-col gap-6">
                {!connectionId ? (
                  <EmptyState icon={Table2} title="Pick a connection" description="Select a database connection to load its schema." />
                ) : schemaLoading && !schema ? (
                  <Card className="flex flex-1 items-center justify-center border-border bg-card/40 py-20">
                    <LoadingState label="Reading metadata from your database…" />
                  </Card>
                ) : !selectedTable ? (
                  <EmptyState
                    icon={Table2}
                    title="Select a table"
                    description="Choose a table on the left to inspect columns and preview a few read-only rows."
                  />
                ) : (
                  <>
                    <SchemaColumnGrid
                      title={`${selectedTable.tableName}`}
                      description={`Schema: ${selectedTable.tableSchema} · ${schema?.dialect === "mysql" ? "MySQL" : "PostgreSQL"}`}
                      columns={selectedTable.columns}
                    />
                    <SchemaDataPreview preview={preview} loading={previewLoading} error={previewError} />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
