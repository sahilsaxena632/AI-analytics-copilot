-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultDatabaseConnectionId" TEXT,
    "defaultQueryRowLimit" INTEGER NOT NULL DEFAULT 100,
    "defaultSchemaContextMode" TEXT NOT NULL DEFAULT 'selected_tables',
    "showSqlByDefault" BOOLEAN NOT NULL DEFAULT true,
    "showExplanationByDefault" BOOLEAN NOT NULL DEFAULT true,
    "autoRunGeneratedSql" BOOLEAN NOT NULL DEFAULT false,
    "autoChart" BOOLEAN NOT NULL DEFAULT true,
    "defaultChartType" TEXT NOT NULL DEFAULT 'auto',
    "kpiFirst" BOOLEAN NOT NULL DEFAULT true,
    "chartCollapsedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "chartDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "clarificationMode" TEXT NOT NULL DEFAULT 'ask_when_unsure',
    "lowConfidenceWarning" BOOLEAN NOT NULL DEFAULT true,
    "preferredLlmProvider" TEXT NOT NULL DEFAULT 'automatic',
    "preferredLlmModel" TEXT,
    "notifications" JSONB NOT NULL DEFAULT '{"anomalyAlerts":true,"scheduledReports":true,"dashboardRefresh":false,"inApp":true,"email":false}',
    "dashboardDefaults" JSONB NOT NULL DEFAULT '{"defaultLayout":"balanced","refreshInterval":"manual"}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_organizationId_key" ON "WorkspaceSettings"("organizationId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_defaultDatabaseConnectionId_fkey" FOREIGN KEY ("defaultDatabaseConnectionId") REFERENCES "DatabaseConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
