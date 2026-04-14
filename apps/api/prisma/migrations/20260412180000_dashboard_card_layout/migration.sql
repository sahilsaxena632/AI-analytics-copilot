-- Dashboard card positions for react-grid-layout (12-column grid).

ALTER TABLE "DashboardCard" ADD COLUMN "layoutX" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DashboardCard" ADD COLUMN "layoutY" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DashboardCard" ADD COLUMN "layoutW" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "DashboardCard" ADD COLUMN "layoutH" INTEGER NOT NULL DEFAULT 6;

-- Stack existing cards per dashboard (full width), preserving creation order.
WITH numbered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY "dashboardId" ORDER BY "createdAt" ASC) - 1) AS idx
  FROM "DashboardCard"
)
UPDATE "DashboardCard" AS d
SET
  "layoutX" = 0,
  "layoutW" = 12,
  "layoutH" = 6,
  "layoutY" = n.idx * 6
FROM numbered AS n
WHERE d.id = n.id;
