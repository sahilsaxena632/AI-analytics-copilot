"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardCardDto, SavedQueryDto } from "@analytics-copilot/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api";

type DashboardListRow = {
  id: string;
  name: string;
  description: string | null;
  _count?: { cards: number };
};

function ModalShell({
  title,
  description,
  children,
  onClose,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="space-y-4 px-4 py-4">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

export function SaveQueryModal(props: {
  open: boolean;
  token: string;
  connectionId: string;
  question: string;
  sql: string;
  generatedSql: string | null;
  onClose: () => void;
  onSaved: (row: SavedQueryDto) => void;
}) {
  const { open, token, connectionId, question, sql, generatedSql, onClose, onSaved } = props;
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const guess = question.trim().slice(0, 80) || "My saved query";
      setTitle((t) => (t.trim() ? t : guess));
      setError(null);
    }
  }, [open, question]);

  const submit = useCallback(async () => {
    if (!sql.trim()) {
      setError("There is no SQL to save yet.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a short name for this query.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const gen = generatedSql?.trim() ?? "";
      const body: Record<string, string> = {
        connectionId,
        title: title.trim(),
        sqlText: sql,
        ...(question.trim() ? { naturalLanguageQuestion: question.trim() } : {}),
      };
      if (gen && gen !== sql.trim()) {
        body.generatedSqlText = gen;
      }
      const row = await apiFetch<SavedQueryDto>("/saved-queries", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      onSaved(row);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save query.");
    } finally {
      setBusy(false);
    }
  }, [connectionId, generatedSql, onClose, onSaved, question, sql, title, token]);

  if (!open) {
    return null;
  }

  return (
    <ModalShell
      title="Save query"
      description="Managers can reopen this from Saved queries. We store your question, the SQL you ran, and the original suggestion when it differs."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="space-y-2">
        <Label htmlFor="sq-title">Name</Label>
        <Input id="sq-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly revenue" />
      </div>
      <div className="space-y-2">
        <Label>Question (read-only)</Label>
        <p className="rounded-md border border-border/80 bg-background/60 px-3 py-2 text-sm text-muted">
          {question.trim() || "—"}
        </p>
      </div>
    </ModalShell>
  );
}

export function AddToDashboardModal(props: {
  open: boolean;
  token: string;
  connectionId: string;
  sql: string;
  defaultTitle: string;
  defaultChartType: "bar" | "line" | "table";
  onClose: () => void;
  onAdded?: (card: DashboardCardDto) => void;
}) {
  const { open, token, connectionId, sql, defaultTitle, defaultChartType, onClose, onAdded } = props;
  const [dashboards, setDashboards] = useState<DashboardListRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line" | "table">(defaultChartType);
  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboards = useCallback(async () => {
    setLoadErr(null);
    try {
      const rows = await apiFetch<DashboardListRow[]>("/dashboards", { token });
      setDashboards(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) {
          return prev;
        }
        return rows[0]?.id ?? "";
      });
    } catch {
      setLoadErr("Could not load dashboards.");
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      void loadDashboards();
      setCardTitle(defaultTitle.slice(0, 200));
      setChartType(defaultChartType);
      setMode("pick");
      setNewName("");
      setNewDescription("");
      setError(null);
    }
  }, [open, defaultTitle, defaultChartType, loadDashboards]);

  const ensureDashboardId = async (): Promise<string | null> => {
    if (mode === "new") {
      if (!newName.trim()) {
        setError("Enter a name for the new dashboard.");
        return null;
      }
      const created = await apiFetch<{ id: string }>("/dashboards", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      return created.id;
    }
    if (!selectedId) {
      setError("Select a dashboard or create a new one.");
      return null;
    }
    return selectedId;
  };

  const submit = async () => {
    if (!sql.trim()) {
      setError("There is no SQL to pin yet. Run a query first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dashId = await ensureDashboardId();
      if (!dashId) {
        setBusy(false);
        return;
      }
      const card = await apiFetch<DashboardCardDto>(`/dashboards/${dashId}/cards`, {
        method: "POST",
        token,
        body: JSON.stringify({
          connectionId,
          title: cardTitle.trim() || defaultTitle.slice(0, 200),
          chartType,
          sqlText: sql,
        }),
      });
      onAdded?.(card);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add card.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <ModalShell
      title="Add to dashboard"
      description="Pin this result to a lightweight report. You can change how it is visualized later from the dashboard."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Adding…" : "Add card"}
          </Button>
        </>
      }
    >
      {loadErr ? <p className="text-sm text-amber-200">{loadErr}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "pick" ? "default" : "secondary"} onClick={() => setMode("pick")}>
          Existing dashboard
        </Button>
        <Button type="button" size="sm" variant={mode === "new" ? "default" : "secondary"} onClick={() => setMode("new")}>
          New dashboard
        </Button>
      </div>
      {mode === "pick" ? (
        <div className="space-y-2">
          <Label htmlFor="dash-pick">Dashboard</Label>
          <select
            id="dash-pick"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {dashboards.length === 0 ? <option value="">No dashboards yet — use “New dashboard”</option> : null}
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d._count ? ` (${d._count.cards} cards)` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="dash-new-name">Dashboard name</Label>
            <Input id="dash-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sales overview" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dash-new-desc">Description (optional)</Label>
            <Textarea
              id="dash-new-desc"
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="text-sm"
              placeholder="Short note for your team"
            />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="card-title">Card title</Label>
        <Input id="card-title" value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder="Shown on the dashboard" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="chart-type">Chart style</Label>
        <select
          id="chart-type"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={chartType}
          onChange={(e) => setChartType(e.target.value as "bar" | "line" | "table")}
        >
          <option value="table">Table</option>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
        </select>
      </div>
    </ModalShell>
  );
}
