-- Question captured on each run (Ask flow); optional for legacy rows.
ALTER TABLE "QueryRun" ADD COLUMN "naturalLanguageQuestion" TEXT;

-- Original generated SQL vs user-edited `sqlText` on SavedQuery.
ALTER TABLE "SavedQuery" ADD COLUMN "generatedSqlText" TEXT;
