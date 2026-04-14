"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import GridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import { memo, type ReactNode } from "react";
import { DASHBOARD_GRID_COLS } from "./dashboard-layout-utils";

const ReactGridLayout = WidthProvider(GridLayout);

export type { Layout };

export type DashboardGridCanvasProps = {
  layout: Layout;
  editMode: boolean;
  cardIds: string[];
  renderCard: (cardId: string) => ReactNode;
  onLayoutChange: (layout: Layout) => void;
  onLayoutInteractionEnd?: () => void;
};

function DashboardGridCanvasInner({
  layout,
  editMode,
  cardIds,
  renderCard,
  onLayoutChange,
  onLayoutInteractionEnd,
}: DashboardGridCanvasProps) {
  return (
    <div className="dashboard-grid-canvas">
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={DASHBOARD_GRID_COLS}
        rowHeight={40}
        margin={[12, 12]}
        containerPadding={[4, 4]}
        draggableHandle=".dashboard-card-drag-handle"
        draggableCancel=".dashboard-card-no-drag,button,a,input,textarea,select,details,summary"
        isDraggable={editMode}
        isResizable={editMode}
        isBounded
        compactType={null}
        preventCollision={false}
        onLayoutChange={(next) => onLayoutChange(next)}
        onDragStop={() => onLayoutInteractionEnd?.()}
        onResizeStop={() => onLayoutInteractionEnd?.()}
        autoSize
      >
        {cardIds.map((id) => (
          <div key={id} className="h-full">
            {renderCard(id)}
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
}

export const DashboardGridCanvas = memo(DashboardGridCanvasInner);
