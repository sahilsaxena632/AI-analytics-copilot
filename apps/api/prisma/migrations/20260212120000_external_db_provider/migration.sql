-- Extensible external DB kind (add new enum values + adapters later, e.g. sqlserver).
CREATE TYPE "ExternalDbProvider" AS ENUM ('postgres', 'mysql');

ALTER TABLE "DatabaseConnection" ADD COLUMN "databaseType" "ExternalDbProvider" NOT NULL DEFAULT 'postgres';
