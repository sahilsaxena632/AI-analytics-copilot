import { PrismaClient, AuditAction, ExternalDbProvider } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo123", 10);

  const org = await prisma.organization.upsert({
    where: { id: "seed-org-demo" },
    update: {},
    create: {
      id: "seed-org-demo",
      name: "Demo Organization",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { passwordHash, organizationId: org.id },
    create: {
      email: "demo@example.com",
      passwordHash,
      name: "Demo Manager",
      organizationId: org.id,
    },
  });

  const conn = await prisma.databaseConnection.upsert({
    where: { id: "seed-conn-local-app-db" },
    update: { databaseType: ExternalDbProvider.postgres },
    create: {
      id: "seed-conn-local-app-db",
      organizationId: org.id,
      name: "Local app PostgreSQL (Docker)",
      databaseType: ExternalDbProvider.postgres,
      connectionString:
        process.env.SEED_DEMO_CONNECTION_STRING ??
        "postgresql://copilot:copilot@localhost:5432/copilot_app?schema=public",
    },
  });

  await prisma.dashboard.upsert({
    where: { id: "seed-dashboard-main" },
    update: {},
    create: {
      id: "seed-dashboard-main",
      organizationId: org.id,
      name: "Main",
      description: "Starter dashboard from seed data",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      action: AuditAction.CONNECTION_CREATED,
      resourceType: "DatabaseConnection",
      resourceId: conn.id,
      metadata: { source: "seed" },
    },
  });

  console.log("Seed complete. Login: demo@example.com / demo123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
