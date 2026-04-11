/** Maps driver errors to user-facing copy (never log raw credentials). */
export function mapConnectionErrorMessage(raw: string, dialect: "postgres" | "mysql"): string {
  const r = raw.toLowerCase();
  if (r.includes("password authentication failed") || r.includes("28p01") || r.includes("er_access_denied_error")) {
    return "The database rejected the username or password. Check your credentials and try again.";
  }
  if (r.includes("timeout") || r.includes("etimedout") || r.includes("connect timeout")) {
    return "The server did not respond in time. Check the host, port, and your network.";
  }
  if (r.includes("does not exist") || r.includes("3d000") || r.includes("unknown database")) {
    return "The database name could not be found on this server.";
  }
  if (r.includes("could not translate host") || r.includes("enotfound") || r.includes("getaddrinfo")) {
    return "We could not resolve the host name. Check spelling and DNS.";
  }
  if (r.includes("econnrefused") || r.includes("connection refused")) {
    return "The connection was refused. Confirm the host, port, and that the server accepts remote connections.";
  }
  const label = dialect === "mysql" ? "MySQL" : "PostgreSQL";
  return `We could not connect to ${label}. Verify host, port, database name, and firewall rules.`;
}
