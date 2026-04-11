-- Structured PostgreSQL fields + isolated password (MVP plaintext; replace with encryption later).
ALTER TABLE "DatabaseConnection" ADD COLUMN "host" TEXT,
ADD COLUMN "port" INTEGER,
ADD COLUMN "databaseName" TEXT,
ADD COLUMN "username" TEXT,
ADD COLUMN "password" TEXT,
ADD COLUMN "ssl" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DatabaseConnection" ALTER COLUMN "connectionString" SET DEFAULT '';
