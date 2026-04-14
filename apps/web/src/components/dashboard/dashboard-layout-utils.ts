import type { Layout } from "react-grid-layout/legacy";

export const DASHBOARD_GRID_COLS = 12;

const DEFAULT_ROW_UNITS = 6;

export function cardsToLayout(
  cards: Array<{ id: string; x: number; y: number; w: number; h: number }>,
): Layout {
  return cards.map((c) => ({
    i: c.id,
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    minW: 2,
    minH: 2,
    maxW: DASHBOARD_GRID_COLS,
  }));
}

export function buildDefaultStackedLayout(cardIds: string[]): Layout {
  return cardIds.map((id, idx) => ({
    i: id,
    x: 0,
    y: idx * DEFAULT_ROW_UNITS,
    w: DASHBOARD_GRID_COLS,
    h: DEFAULT_ROW_UNITS,
    minW: 2,
    minH: 2,
    maxW: DASHBOARD_GRID_COLS,
  }));
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

export function sortCardIdsByLayout(layout: Layout): string[] {
  return [...layout].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)).map((it) => it.i);
}
