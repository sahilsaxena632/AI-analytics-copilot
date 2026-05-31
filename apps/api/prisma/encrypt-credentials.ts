import { PrismaClient } from "@prisma/client";
import { scryptSync, createCipheriv, randomBytes } from "crypto";

const PREFIX = "enc:v1:";
const SALT = "analytics-copilot-credential-v1";

function buildKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

function encryptValue(key: Buffer, plaintext: string): string {
  if (isEncrypted(plaintext)) {
    return plaintext;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

async function main() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be set and at least 32 characters");
  }

  const key = buildKey(secret);
  const prisma = new PrismaClient();
  const rows = await prisma.databaseConnection.findMany({
    select: { id: true, password: true, connectionString: true },
  });

  let updated = 0;
  for (const row of rows) {
    const nextPassword =
      row.password && !isEncrypted(row.password) ? encryptValue(key, row.password) : row.password;
    const nextConnectionString =
      row.connectionString && !isEncrypted(row.connectionString)
        ? encryptValue(key, row.connectionString)
        : row.connectionString;

    if (nextPassword !== row.password || nextConnectionString !== row.connectionString) {
      await prisma.databaseConnection.update({
        where: { id: row.id },
        data: {
          password: nextPassword,
          connectionString: nextConnectionString ?? "",
        },
      });
      updated += 1;
    }
  }

  console.log(`Encrypted credentials for ${updated} connection(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
