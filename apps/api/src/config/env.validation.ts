export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing: string[] = [];
  const invalid: string[] = [];

  if (!config.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  if (!config.JWT_SECRET) {
    missing.push("JWT_SECRET");
  }
  if (!config.CREDENTIAL_ENCRYPTION_KEY) {
    missing.push("CREDENTIAL_ENCRYPTION_KEY");
  }

  const jwtSecret = String(config.JWT_SECRET ?? "");
  if (jwtSecret && jwtSecret.length < 32) {
    invalid.push("JWT_SECRET must be at least 32 characters");
  }
  if (jwtSecret === "change-me-use-long-random-string" || jwtSecret === "change-me-in-development-use-long-random-string") {
    if (config.NODE_ENV === "production") {
      invalid.push("JWT_SECRET must not use the example default in production");
    }
  }

  const encryptionKey = String(config.CREDENTIAL_ENCRYPTION_KEY ?? "");
  if (encryptionKey && encryptionKey.length < 32) {
    invalid.push("CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters");
  }

  if (config.NODE_ENV === "production" && !config.CORS_ORIGIN) {
    missing.push("CORS_ORIGIN");
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (invalid.length) {
    throw new Error(invalid.join("; "));
  }

  return config;
}
