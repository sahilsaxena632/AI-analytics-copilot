import { BadRequestException } from "@nestjs/common";

const SEGMENT = /^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/;
const MAX_QUALIFIED_LEN = 200;

/**
 * Validates a decoded table identifier for read-only previews.
 * Allows `table` or `schema.table` (single dot). Rejects anything that could be SQL injection.
 */
export function assertSafeTableIdentifier(raw: string): { schema?: string; table: string; qualified: string } {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_QUALIFIED_LEN) {
    throw new BadRequestException("Invalid table name.");
  }
  const parts = trimmed.split(".");
  if (parts.length > 2 || parts.some((p) => !p)) {
    throw new BadRequestException("Table name must be a single identifier or schema.table.");
  }
  for (const p of parts) {
    if (!SEGMENT.test(p)) {
      throw new BadRequestException("Table name contains invalid characters.");
    }
  }
  if (parts.length === 1) {
    return { table: parts[0], qualified: parts[0] };
  }
  return { schema: parts[0], table: parts[1], qualified: `${parts[0]}.${parts[1]}` };
}

export function decodeTableNameParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    throw new BadRequestException("Invalid table name encoding.");
  }
}
