import type { Layout } from "react-grid-layout/legacy";

export const DASHBOARD_GRID_COLS = 12;

const DEFAULT_ROW_UNITS = 6;
const MIN_W = 2;
const MIN_H = 2;
const DEFAULT_SMALL_W = 4;
const DEFAULT_MEDIUM_W = 6;
const DEFAULT_LARGE_W = 12;
const DEFAULT_H = 4;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  const n = Math.round(value);
  return Math.min(max, Math.max(min, n));
}

function sanitizeBaseItem(item: { i: string; x: number; y: number; w: number; h: number }) {
  const w = clampInt(item.w, MIN_W, DASHBOARD_GRID_COLS);
  const x = clampInt(item.x, 0, Math.max(0, DASHBOARD_GRID_COLS - w));
  return {
    i: item.i,
    x,
    y: clampInt(item.y, 0, 2000),
    w,
    h: clampInt(item.h, MIN_H, 40),
    minW: MIN_W,
    minH: MIN_H,
    maxW: DASHBOARD_GRID_COLS,
  };
}

export function cardsToLayout(
  cards: Array<{ id: string; x: number; y: number; w: number; h: number }>,
): Layout {
  // Legacy migrations may produce full-width stacked cards; rebalance for a business-style grid.
  const looksFullyStacked =
    cards.length > 1 &&
    cards.every((c) => c.x === 0 && c.w >= DASHBOARD_GRID_COLS);
  if (looksFullyStacked) {
    return buildDefaultStackedLayout(cards.map((c) => c.id));
  }

  return normalizeLayout(
    cards.map((c) => ({
      i: c.id,
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
    })),
    cards.map((c) => c.id),
  );
}

export function buildDefaultStackedLayout(cardIds: string[]): Layout {
  const defaultWidths = [DEFAULT_MEDIUM_W, DEFAULT_SMALL_W, DEFAULT_SMALL_W];
  let x = 0;
  let y = 0;
  let rowBottom = 0;

  const out: Array<Layout[number]> = [];
  for (let idx = 0; idx < cardIds.length; idx++) {
    const id = cardIds[idx];
    const preferredW = defaultWidths[idx % defaultWidths.length] ?? DEFAULT_SMALL_W;
    const w = clampInt(preferredW, MIN_W, DEFAULT_LARGE_W);
    if (x + w > DASHBOARD_GRID_COLS) {
      x = 0;
      y = rowBottom;
    }
    out.push(
      sanitizeBaseItem({
        i: id,
        x,
        y,
        w,
        h: DEFAULT_H,
      }),
    );
    rowBottom = Math.max(rowBottom, y + DEFAULT_H);
    x += w;
    if (x >= DASHBOARD_GRID_COLS) {
      x = 0;
      y = rowBottom;
    }
  }

  return out;
}

export function layoutToSavePayload(layout: Layout) {
  return layout.map((it) => ({
    id: it.i,
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
  }));
}

export function cloneLayout(layout: Layout): Layout {
  return layout.map((it) => ({ ...it }));
}

export function normalizeLayout(layout: Layout, cardIds: string[]): Layout {
  const byId = new Map<string, Layout[number]>();
  for (const item of layout) {
    if (!item?.i || byId.has(item.i)) {
      continue;
    }
    byId.set(item.i, sanitizeBaseItem(item));
  }
  const normalized: Array<Layout[number]> = [];
  let fallbackY = 0;
  for (const id of cardIds) {
    const existing = byId.get(id);
    if (existing) {
      normalized.push(existing);
      fallbackY = Math.max(fallbackY, existing.y + existing.h);
      continue;
    }
    normalized.push(
      sanitizeBaseItem({
        i: id,
        x: 0,
        y: fallbackY,
        w: DEFAULT_MEDIUM_W,
        h: DEFAULT_H,
      }),
    );
    fallbackY += DEFAULT_H;
  }
  return normalized;
}

export function sortCardIdsByLayout(layout: Layout): string[] {
  return [...layout].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)).map((it) => it.i);
}
