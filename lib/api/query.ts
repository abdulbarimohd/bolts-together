// lib/api/query.ts
//
// Strict query-string and JSON-body coercion.
//
// The predecessor shipped a real bug here: `Number(searchParams.get('x'))`
// on a non-numeric value produced `NaN`, which Prisma happily embedded in a
// `WHERE` clause, and the query either threw deep inside the driver or
// silently matched nothing. Nothing in this file ever produces NaN,
// Infinity, or a silently-coerced value: a parameter is either absent,
// valid, or a 400.
//
// Everything here throws `ApiError` (400) rather than returning an error
// value, so a route reads as a straight line and the failure carries the
// parameter name.

import { invalidBody, invalidQuery } from "./http";

/** `123`, `-4`, `0` — nothing else. No exponents, no decimals, no spaces. */
const INTEGER = /^-?\d+$/;
/** `12`, `12.5`, `-0.75`. Deliberately no exponent form. */
const DECIMAL = /^-?\d+(\.\d+)?$/;

function present(raw: string | null): raw is string {
  return raw !== null && raw.trim() !== "";
}

export interface NumberBounds {
  min?: number;
  max?: number;
}

/** Reads an integer query param. Absent -> undefined. Malformed -> 400. */
export function readInt(
  params: URLSearchParams,
  name: string,
  bounds: NumberBounds = {},
): number | undefined {
  const raw = params.get(name);
  if (!present(raw)) return undefined;
  const trimmed = raw.trim();
  if (!INTEGER.test(trimmed)) {
    throw invalidQuery(`\`${name}\` must be a whole number.`, { param: name, received: raw });
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) {
    throw invalidQuery(`\`${name}\` is out of range.`, { param: name, received: raw });
  }
  assertBounds(name, value, bounds, raw);
  return value;
}

/** Reads a decimal query param. Absent -> undefined. Malformed -> 400. */
export function readNumber(
  params: URLSearchParams,
  name: string,
  bounds: NumberBounds = {},
): number | undefined {
  const raw = params.get(name);
  if (!present(raw)) return undefined;
  const trimmed = raw.trim();
  if (!DECIMAL.test(trimmed)) {
    throw invalidQuery(`\`${name}\` must be a number.`, { param: name, received: raw });
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw invalidQuery(`\`${name}\` is out of range.`, { param: name, received: raw });
  }
  assertBounds(name, value, bounds, raw);
  return value;
}

function assertBounds(name: string, value: number, bounds: NumberBounds, raw: string): void {
  if (bounds.min !== undefined && value < bounds.min) {
    throw invalidQuery(`\`${name}\` must be at least ${bounds.min}.`, { param: name, received: raw });
  }
  if (bounds.max !== undefined && value > bounds.max) {
    throw invalidQuery(`\`${name}\` must be at most ${bounds.max}.`, { param: name, received: raw });
  }
}

/**
 * Reads a boolean query param.
 *
 * Only the four spellings below are accepted. `?hookless=yes` is a 400
 * rather than a silent `false`, because a filter that quietly inverts is
 * worse than one that refuses.
 */
export function readBoolean(params: URLSearchParams, name: string): boolean | undefined {
  const raw = params.get(name);
  if (!present(raw)) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw invalidQuery(`\`${name}\` must be true or false.`, { param: name, received: raw });
}

/** Reads a trimmed string param, rejecting anything longer than `maxLength`. */
export function readString(
  params: URLSearchParams,
  name: string,
  maxLength = 200,
): string | undefined {
  const raw = params.get(name);
  if (!present(raw)) return undefined;
  const value = raw.trim();
  if (value.length > maxLength) {
    throw invalidQuery(`\`${name}\` must be ${maxLength} characters or fewer.`, { param: name });
  }
  return value;
}

/**
 * Reads a repeatable/comma-separated param as a list.
 *
 * `?brand=Shimano&brand=SRAM` and `?brand=Shimano,SRAM` are equivalent.
 */
export function readList(params: URLSearchParams, name: string, maxItems = 50): string[] | undefined {
  const raw = params.getAll(name);
  if (raw.length === 0) return undefined;
  const values = raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
  if (values.length === 0) return undefined;
  if (values.length > maxItems) {
    throw invalidQuery(`\`${name}\` accepts at most ${maxItems} values.`, { param: name });
  }
  return values;
}

/**
 * Reads a list param and checks every entry against a closed set.
 *
 * Every compatibility-relevant column in this schema is an enum, and an
 * unrecognised value must not be quietly dropped: silently ignoring
 * `?bbShellStandard=BSA_86` would return the unfiltered list, which reads to
 * the rider as "all of these fit".
 */
export function readEnumList<T extends string>(
  params: URLSearchParams,
  name: string,
  allowed: readonly T[],
): T[] | undefined {
  const values = readList(params, name);
  if (!values) return undefined;
  const allowedSet = new Set<string>(allowed);
  const unknown = values.filter((value) => !allowedSet.has(value));
  if (unknown.length > 0) {
    throw invalidQuery(`\`${name}\` contains unrecognised values.`, {
      param: name,
      unknown,
      allowed,
    });
  }
  return values as T[];
}

export interface Pagination {
  limit: number;
  offset: number;
}

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export function readPagination(params: URLSearchParams): Pagination {
  const limit = readInt(params, "limit", { min: 1, max: MAX_LIMIT }) ?? DEFAULT_LIMIT;
  const offset = readInt(params, "offset", { min: 0 }) ?? 0;
  return { limit, offset };
}

// ------------------------------------------------------------
// JSON body readers
//
// Same contract as the query readers, but the errors say `invalid_body`
// so a caller can tell a bad URL from a bad payload.
// ------------------------------------------------------------

export function bodyString(
  body: Record<string, unknown>,
  name: string,
  { maxLength = 200 }: { maxLength?: number } = {},
): string | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalidBody(`\`${name}\` must be a string.`, { field: name });
  const trimmed = value.trim();
  if (trimmed === "") throw invalidBody(`\`${name}\` must not be empty.`, { field: name });
  if (trimmed.length > maxLength) {
    throw invalidBody(`\`${name}\` must be ${maxLength} characters or fewer.`, { field: name });
  }
  return trimmed;
}

export function bodyBoolean(body: Record<string, unknown>, name: string): boolean | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw invalidBody(`\`${name}\` must be true or false.`, { field: name });
  return value;
}

/**
 * Reads an optional nullable integer.
 *
 * `undefined` means "not mentioned, leave it alone"; an explicit `null`
 * means "clear it". The two are different operations on a PATCH and must
 * not be collapsed — clearing a rider's height is how the advisory fit
 * rules get switched back off.
 */
export function bodyNullableInt(
  body: Record<string, unknown>,
  name: string,
  bounds: NumberBounds = {},
): number | null | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw invalidBody(`\`${name}\` must be a whole number or null.`, { field: name });
  }
  if (bounds.min !== undefined && value < bounds.min) {
    throw invalidBody(`\`${name}\` must be at least ${bounds.min}.`, { field: name });
  }
  if (bounds.max !== undefined && value > bounds.max) {
    throw invalidBody(`\`${name}\` must be at most ${bounds.max}.`, { field: name });
  }
  return value;
}

export function bodyArray(
  body: Record<string, unknown>,
  name: string,
  maxItems = 100,
): Record<string, unknown>[] | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw invalidBody(`\`${name}\` must be an array.`, { field: name });
  if (value.length > maxItems) {
    throw invalidBody(`\`${name}\` accepts at most ${maxItems} entries.`, { field: name });
  }
  return value.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw invalidBody(`\`${name}[${index}]\` must be an object.`, { field: name, index });
    }
    return entry as Record<string, unknown>;
  });
}

/** A uuid v1-v8, matching Prisma's `@default(uuid())` ids. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Validates a path segment that is supposed to be a build/part id.
 *
 * Checked before it reaches Prisma so a junk id is a clean 404 rather than
 * a driver-level error that would surface as a 500.
 */
export function assertUuid(value: string, what: string): string {
  if (!isUuid(value)) {
    throw invalidQuery(`\`${what}\` is not a valid id.`, { received: value });
  }
  return value;
}
