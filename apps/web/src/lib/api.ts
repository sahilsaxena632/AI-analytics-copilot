const base = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parseResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return { message: trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed };
  }
}

function extractErrorMessage(data: unknown, statusText: string): string {
  if (!data || typeof data !== "object") {
    return statusText || "Request failed";
  }
  const rec = data as Record<string, unknown>;
  const msg = rec.message;
  if (typeof msg === "string" && msg.trim()) {
    return msg.trim();
  }
  if (Array.isArray(msg)) {
    const joined = msg.map((x) => String(x)).filter(Boolean).join(" ");
    return joined || statusText || "Request failed";
  }
  if (typeof rec.error === "string" && rec.error.trim()) {
    return rec.error.trim();
  }
  return statusText || "Request failed";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      "We couldn’t reach the server. Check your connection, or try again in a moment.",
      0,
      undefined,
    );
  }
  const text = await res.text();
  const data = parseResponseBody(text);
  if (!res.ok) {
    const msg = extractErrorMessage(data, res.statusText);
    throw new ApiError(msg || "Request failed", res.status, data);
  }
  return data as T;
}
