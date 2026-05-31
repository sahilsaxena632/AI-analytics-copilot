function resolveApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_API_URL is required in production builds");
    }
    return "http://localhost:4000";
  }
  return url.replace(/\/$/, "");
}

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

type SessionBridge = {
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
};

let sessionBridge: SessionBridge | null = null;

export function configureApiSession(bridge: SessionBridge) {
  sessionBridge = bridge;
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

async function refreshAccessToken(): Promise<string | null> {
  if (!sessionBridge) {
    return null;
  }
  const refreshToken = sessionBridge.getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    const res = await fetch(`${resolveApiBase()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const text = await res.text();
    const data = parseResponseBody(text) as { accessToken?: string; refreshToken?: string } | null;
    if (!res.ok || !data?.accessToken || !data.refreshToken) {
      return null;
    }
    sessionBridge.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  async function performRequest(bearer: string | null | undefined): Promise<Response> {
    return fetch(`${resolveApiBase()}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
    });
  }

  let res: Response;
  try {
    res = await performRequest(token);
  } catch {
    throw new ApiError(
      "We couldn’t reach the server. Check your connection, or try again in a moment.",
      0,
      undefined,
    );
  }

  if (res.status === 401 && token && sessionBridge) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      res = await performRequest(nextToken);
    } else {
      sessionBridge.clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
  }

  const text = await res.text();
  const data = parseResponseBody(text);
  if (!res.ok) {
    const msg = extractErrorMessage(data, res.statusText);
    throw new ApiError(msg || "Request failed", res.status, data);
  }
  return data as T;
}
