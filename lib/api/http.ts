// lib/api/http.ts
//
// One place where an HTTP response is built, so every route in app/api
// answers with the same envelope and no route can accidentally leak a stack
// trace. Two shapes only:
//
//   success  -> the payload, as-is
//   failure  -> { error: { code, message, details? } }
//
// `code` is a stable machine-readable string (the UI switches on it),
// `message` is prose for a human. Anything that isn't a deliberately thrown
// ApiError becomes a flat 500 with a generic message: the real error is
// logged server-side and never crosses the wire, because a Prisma failure
// message can carry table names, column names and connection strings.

export type ApiErrorCode =
  | "invalid_query"
  | "invalid_body"
  | "unknown_category"
  | "not_found"
  | "conflict"
  | "internal_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: ApiErrorCode, message: string, details?: unknown): ApiError {
  return new ApiError(400, code, message, details);
}

export function invalidQuery(message: string, details?: unknown): ApiError {
  return new ApiError(400, "invalid_query", message, details);
}

export function invalidBody(message: string, details?: unknown): ApiError {
  return new ApiError(400, "invalid_body", message, details);
}

export function notFound(message: string, details?: unknown): ApiError {
  return new ApiError(404, "not_found", message, details);
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

export function jsonOk<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

/**
 * Turn any thrown value into a safe response.
 *
 * Deliberate ApiErrors pass their own message through — they were written to
 * be read by a caller. Everything else collapses to a generic 500. The
 * original is logged, not returned: `console.error` in a Worker goes to
 * `wrangler tail` / Workers Logs, which is where it belongs.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) },
    };
    return Response.json(body, { status: error.status });
  }

  console.error("[api] unhandled error", error);
  const body: ApiErrorBody = {
    error: { code: "internal_error", message: "Something went wrong handling this request." },
  };
  return Response.json(body, { status: 500 });
}

/** Wraps a handler so no route has to repeat the try/catch. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Parse a request body as JSON, rejecting anything that isn't a plain object.
 *
 * A bare array or string body would otherwise reach the field readers and
 * produce confusing per-field errors instead of one clear one.
 */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw invalidBody("Request body must be valid JSON.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw invalidBody("Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}
