import { createCipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";
const SALT = "analytics-copilot-credential-v1";

function buildKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

function encryptValue(key: Buffer, plaintext: string): string {
  if (plaintext.startsWith(PREFIX)) {
    return plaintext;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW !== "true") {
    console.log("Skipping seed in production. Set SEED_ALLOW=true to override.");
    return;
  }

  const { PrismaClient, AuditAction, ExternalDbProvider } = await import("@prisma/client");
  const bcrypt = await import("bcrypt");
  const prisma = new PrismaClient();

  const encryptionSecret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionSecret || encryptionSecret.length < 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be set and at least 32 characters before seeding");
  }
  const encryptionKey = buildKey(encryptionSecret);

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

  const rawConnectionString =
    process.env.SEED_DEMO_CONNECTION_STRING ??
    "postgresql://copilot:copilot@localhost:5432/copilot_app?schema=public";

  const conn = await prisma.databaseConnection.upsert({
    where: { id: "seed-conn-local-app-db" },
    update: {
      databaseType: ExternalDbProvider.postgres,
      connectionString: encryptValue(encryptionKey, rawConnectionString),
    },
    create: {
      id: "seed-conn-local-app-db",
      organizationId: org.id,
      name: "Local app PostgreSQL (Docker)",
      databaseType: ExternalDbProvider.postgres,
      connectionString: encryptValue(encryptionKey, rawConnectionString),
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
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
