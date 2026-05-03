"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Layout } from "react-grid-layout/legacy";
import type { DashboardCardDto, QueryExecuteResultDto, SaveDashboardLayoutRequestDto } from "@analytics-copilot/shared";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/error-banner";
import { PageMain } from "@/components/page-main";
import { apiFetch } from "@/lib/api";
import { friendlyApiMessage } from "@/lib/friendly-api-message";
import { useAuth } from "@/lib/auth-context";
import { DashboardCardPanel } from "@/components/dashboard/dashboard-card-panel";
import {
  buildDefaultStackedLayout,
  cardsToLayout,
  cloneLayout,
  layoutToSavePayload,
  normalizeLayout,
  sortCardIdsByLayout,
} from "@/components/dashboard/dashboard-layout-utils";
import { useMinWidth } from "@/components/dashboard/use-min-width";

const DashboardGridCanvas = dynamic(
  () => import("@/components/dashboard/dashboard-grid-canvas").then((m) => m.DashboardGridCanvas),
  {
    ssr: false,
    loading: () => <LoadingState label="Preparing workspace…" />,
  },
);

type DashboardDetail = {
  id: string;
  name: string;
  description: string | null;
  cards: DashboardCardDto[];
};

type SafeConnection = {
  id: string;
  name: string;
  type: "postgres" | "mysql";
};

const DASHBOARD_GRID_ROW_HEIGHT_PX = 40;
const DASHBOARD_GRID_MARGIN_Y_PX = 12;
const DASHBOARD_CARD_MIN_H = 4;

function contentHeightToGridRows(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) {
    return DASHBOARD_CARD_MIN_H;
  }
  return Math.max(
    DASHBOARD_CARD_MIN_H,
    Math.ceil((heightPx + DASHBOARD_GRID_MARGIN_Y_PX) / (DASHBOARD_GRID_ROW_HEIGHT_PX + DASHBOARD_GRID_MARGIN_Y_PX)),
  );
}

function sameLayoutGeometry(a: Layout, b: Layout): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let idx = 0; idx < a.length; idx++) {
    const left = a[idx];
    const right = b[idx];
    if (
      !left ||
      !right ||
      left.i !== right.i ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.w !== right.w ||
      left.h !== right.h
    ) {
      return false;
    }
  }

  return true;
}

export default function AppDashboardDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { token } = useAuth();
  const wideLayout = useMinWidth(768);

  const [data, setData] = useState<DashboardDetail | null>(null);
  const [connections, setConnections] = useState<SafeConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLayout, setSavingLayout] = useState(false);
  const [preview, setPreview] = useState<Record<string, QueryExecuteResultDto | null | "loading" | "error">>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});

  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [savedLayout, setSavedLayout] = useState<Layout>([]);
  const [draftLayout, setDraftLayout] = useState<Layout>([]);
  const [chartReflowKey, setChartReflowKey] = useState(0);

  useEffect(() => {
    setLayoutEditMode(false);
    setSavedLayout([]);
    setDraftLayout([]);
    setPreview({});
    setPreviewErrors({});
    setLayoutError(null);
  }, [id]);

  useEffect(() => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<DashboardDetail>(`/dashboards/${id}`, { token }),
      apiFetch<SafeConnection[]>("/database-connections", { token }),
    ])
      .then(([dash, conns]) => {
        setData(dash);
        setConnections(conns);
        // Initialize stable saved layout from API once per load.
        const ids = dash.cards.map((c) => c.id);
        setSavedLayout(normalizeLayout(cardsToLayout(dash.cards), ids));
      })
      .catch((e) => setError(friendlyApiMessage(e, "This dashboard could not be loaded.")))
      .finally(() => setLoading(false));
  }, [token, id]);

  const connMap = useMemo(() => {
    const m = new Map<string, SafeConnection>();
    for (const c of connections) {
      m.set(c.id, c);
    }
    return m;
  }, [connections]);

  const cardMap = useMemo(() => {
    const m = new Map<string, DashboardCardDto>();
    if (!data) {
      return m;
    }
    for (const c of data.cards) {
      m.set(c.id, c);
    }
    return m;
  }, [data]);

  const cardIds = useMemo(() => (data ? data.cards.map((c) => c.id) : []), [data]);

  const activeLayout = layoutEditMode ? draftLayout : savedLayout;

  const layoutDirty = useMemo(() => {
    if (!layoutEditMode || !data?.cards.length) {
      return false;
    }
    return (
      JSON.stringify(layoutToSavePayload(draftLayout)) !== JSON.stringify(layoutToSavePayload(savedLayout))
    );
  }, [layoutEditMode, draftLayout, savedLayout, data?.cards.length]);

  useEffect(() => {
    if (!layoutDirty || !layoutEditMode) {
      return;
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [layoutDirty, layoutEditMode]);

  const runPreview = useCallback(
    async (cardId: string, connectionId: string, sql: string) => {
      if (!token) {
        return;
      }
      setPreview((p) => ({ ...p, [cardId]: "loading" }));
      setPreviewErrors((m) => {
        const next = { ...m };
        delete next[cardId];
        return next;
      });
      try {
        const res = await apiFetch<QueryExecuteResultDto>("/queries/execute", {
          method: "POST",
          token,
          body: JSON.stringify({ databaseConnectionId: connectionId, sql }),
        });
        setPreview((p) => ({ ...p, [cardId]: res }));
      } catch (e) {
        setPreview((p) => ({ ...p, [cardId]: "error" }));
        setPreviewErrors((m) => ({
          ...m,
          [cardId]: friendlyApiMessage(e, "This card could not be refreshed right now."),
        }));
      }
    },
    [token],
  );

  const enterLayoutEdit = useCallback(() => {
    setLayoutError(null);
    // Normalize once when edit starts to keep render path stable.
    setDraftLayout(cloneLayout(normalizeLayout(savedLayout, cardIds)));
    setLayoutEditMode(true);
  }, [savedLayout, cardIds]);

  const cancelLayoutEdit = useCallback(() => {
    if (layoutDirty) {
      const ok = window.confirm("Discard your layout changes?");
      if (!ok) {
        return;
      }
    }
    setLayoutEditMode(false);
    setLayoutError(null);
  }, [layoutDirty]);

  const resetDraftLayout = useCallback(() => {
    if (!data?.cards.length) {
      return;
    }
    setDraftLayout(buildDefaultStackedLayout(cardIds));
  }, [data?.cards, cardIds]);

  const saveLayout = useCallback(async () => {
    if (!token || !id || !data?.cards.length) {
      return;
    }
    setSavingLayout(true);
    setLayoutError(null);
    const body: SaveDashboardLayoutRequestDto = { items: layoutToSavePayload(draftLayout) };
    try {
      const updated = await apiFetch<DashboardDetail>(`/dashboards/${id}/layout`, {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      });
      setData(updated);
      const ids = updated.cards.map((c) => c.id);
      setSavedLayout(normalizeLayout(cardsToLayout(updated.cards), ids));
      setLayoutEditMode(false);
    } catch (e) {
      setLayoutError(friendlyApiMessage(e, "We couldn’t save this layout. Try again in a moment."));
    } finally {
      setSavingLayout(false);
    }
  }, [token, id, data?.cards.length, draftLayout]);

  const bumpChartReflow = useCallback(() => {
    setChartReflowKey((k) => k + 1);
  }, []);

  const updateCardContentHeight = useCallback(
    (cardId: string, heightPx: number) => {
      if (!wideLayout) {
        return;
      }

      const nextH = contentHeightToGridRows(heightPx);
      const updateLayout = (layout: Layout): Layout => {
        let changed = false;
        const next = layout.map((item) => {
          if (item.i !== cardId || item.h === nextH) {
            return item;
          }
          changed = true;
          return { ...item, h: nextH };
        });
        return changed ? next : layout;
      };

      if (layoutEditMode) {
        setDraftLayout(updateLayout);
      } else {
        setSavedLayout(updateLayout);
      }
    },
    [layoutEditMode, wideLayout],
  );

  const orderedCardIds = useMemo(() => sortCardIdsByLayout(activeLayout), [activeLayout]);

  const toolbar = data && data.cards.length > 0 && (
    <div
      className={`rounded-xl border px-4 py-3 sm:px-5 ${
        layoutEditMode ? "border-primary/25 bg-primary/5" : "border-border bg-card/30"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {layoutEditMode ? (
          <p className="text-sm leading-relaxed text-muted">
            Drag and resize cards to arrange your dashboard. Drag from the title strip (grip icon). Changes are not
            saved until you choose <span className="font-medium text-foreground">Save layout</span>.
          </p>
        ) : (
          <p className="text-sm text-muted">Arrange cards to match how you read your numbers.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {layoutEditMode ? (
            <>
              <Button type="button" variant="secondary" size="sm" className="whitespace-nowrap" onClick={resetDraftLayout}>
                Reset layout
              </Button>
              <Button type="button" variant="secondary" size="sm" className="whitespace-nowrap" onClick={cancelLayoutEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="whitespace-nowrap"
                disabled={savingLayout || !layoutDirty}
                onClick={() => void saveLayout()}
              >
                {savingLayout ? "Saving…" : "Save layout"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" className="whitespace-nowrap" onClick={enterLayoutEdit}>
              Edit layout
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderCard = useCallback(
    (cardId: string) => {
      const c = cardMap.get(cardId);
      if (!c) {
        return null;
      }
      const conn = connMap.get(c.connectionId);
      const state = preview[c.id];
      return (
        <DashboardCardPanel
          card={c}
          connection={conn}
          editMode={layoutEditMode}
          preview={state}
          previewError={previewErrors[c.id]}
          chartReflowKey={chartReflowKey}
          onRefresh={() => void runPreview(c.id, c.connectionId, c.sqlText)}
          onContentHeightChange={updateCardContentHeight}
        />
      );
    },
    [cardMap, connMap, preview, previewErrors, layoutEditMode, chartReflowKey, runPreview, updateCardContentHeight],
  );

  return (
    <>
      <AppHeader title={data?.name ?? "Dashboard"} subtitle={data?.description ?? ""} />
      <PageMain gapClassName="gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {layoutError ? <ErrorBanner message={layoutError} /> : null}
        {loading ? <LoadingState label="Loading dashboard…" /> : null}
        {!loading && data ? (
          <div className="space-y-6">
            {toolbar}
            {data.cards.length === 0 ? (
              <Card className="border-dashed border-border bg-card/30">
                <CardContent className="py-10 text-center text-sm leading-relaxed text-muted">
                  No cards yet. Use <span className="font-medium text-foreground">Ask query</span> and choose{" "}
                  <span className="font-medium text-foreground">Add to dashboard</span> to pin a result here.
                </CardContent>
              </Card>
            ) : wideLayout ? (
              <DashboardGridCanvas
                layout={activeLayout}
                editMode={layoutEditMode}
                cardIds={cardIds}
                renderCard={renderCard}
                onLayoutChange={(next) => {
                  const nextLayout = cloneLayout(next);
                  if (layoutEditMode) {
                    setDraftLayout((current) => (sameLayoutGeometry(current, nextLayout) ? current : nextLayout));
                  }
                }}
                onLayoutInteractionEnd={bumpChartReflow}
              />
            ) : (
              <div className="space-y-4">
                {layoutEditMode ? (
                  <p className="rounded-lg border border-border/70 bg-card/20 px-3 py-2 text-xs text-muted">
                    On smaller screens cards are shown in order. For drag and resize, use a wider window.
                  </p>
                ) : null}
                {orderedCardIds.map((cardId) => (
                  <div key={cardId}>{renderCard(cardId)}</div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </PageMain>
    </>
  );
}
