export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing: string[] = [];
  if (!config.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  if (!config.JWT_SECRET) {
    missing.push("JWT_SECRET");
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return config;
}
