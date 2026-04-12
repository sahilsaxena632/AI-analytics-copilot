import { ApiError } from "./api";

const READ_ONLY_HINT =
  "For your security, only read-only SELECT queries can run here. Start the statement with SELECT (or WITH for a CTE).";

const SINGLE_STMT_HINT = "Please run one SQL statement at a time. Remove extra semicolons between statements.";

/**
 * Turns API/network errors into short copy suitable for managers.
 */
export function friendlyApiMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    const m = error.message.trim();
    if (!m) {
      return fallback;
    }
    if (m.includes("Only SELECT or WITH queries are allowed")) {
      return READ_ONLY_HINT;
    }
    if (m.includes("Only a single SQL statement is allowed")) {
      return SINGLE_STMT_HINT;
    }
    if (m.includes("disallowed keywords for read-only")) {
      return "This statement includes commands we don’t allow for read-only analytics. Stick to SELECT-style queries.";
    }
    if (m.includes("SQL must not be empty")) {
      return "Add a SQL query before running.";
    }
    if (error.status === 401) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.status === 403) {
      return "You don’t have access to that resource.";
    }
    if (error.status === 404) {
      return "That item could not be found. It may have been removed.";
    }
    if (error.status >= 500) {
      return "The service had a problem on our side. Please try again in a moment.";
    }
    return m;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}
