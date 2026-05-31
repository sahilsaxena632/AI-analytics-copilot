-- Add REGISTER audit action
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REGISTER';

-- QueryRun organization scoping + indexes
ALTER TABLE "QueryRun" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "QueryRun_organizationId_idx" ON "QueryRun"("organizationId");
CREATE INDEX IF NOT EXISTS "QueryRun_createdAt_idx" ON "QueryRun"("createdAt");

-- User organization lookup
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

-- Dashboard card connection lookup
CREATE INDEX IF NOT EXISTS "DashboardCard_connectionId_idx" ON "DashboardCard"("connectionId");

-- Audit log time-range queries
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- Backfill QueryRun.organizationId from connection
UPDATE "QueryRun" qr
SET "organizationId" = dc."organizationId"
FROM "DatabaseConnection" dc
WHERE qr."connectionId" = dc.id
  AND qr."organizationId" IS NULL;
