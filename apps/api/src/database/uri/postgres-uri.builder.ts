/**
 * Builds a PostgreSQL connection URI for `pg`.
 * TODO: KMS-decrypted password — keep URI construction in this module.
 */
export type PostgresConnectionParts = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
};

export function buildPostgresConnectionUri(parts: PostgresConnectionParts): string {
  const user = encodeURIComponent(parts.username);
  const pass = encodeURIComponent(parts.password);
  const db = encodeURIComponent(parts.database);
  const q = parts.ssl ? "sslmode=require" : "sslmode=disable";
  return `postgresql://${user}:${pass}@${parts.host}:${parts.port}/${db}?${q}`;
}
