/** Ensures preview cells are JSON-serializable for HTTP responses. */
export function previewRowsToJsonSafe(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = normalizePreviewValue(v);
    }
    return out;
  });
}

function normalizePreviewValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return `[binary ${value.length} bytes]`;
  }
  if (value && typeof value === "object" && "type" in value && (value as { type?: string }).type === "Buffer") {
    return "[binary]";
  }
  return value;
}
