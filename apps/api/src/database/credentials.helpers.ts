import type { DatabaseConnection } from "@prisma/client";

/** True when structured fields are complete (password isolated in DB row). */
export function hasStructuredCredentials(
  row: Pick<DatabaseConnection, "host" | "port" | "databaseName" | "username" | "password">,
): boolean {
  return (
    !!row.host &&
    row.port != null &&
    typeof row.port === "number" &&
    !!row.databaseName &&
    !!row.username &&
    !!row.password
  );
}
