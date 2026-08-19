// lib/mappers/scalars.ts
//
// The two places where a Prisma column type and the engine's domain type
// genuinely disagree, and nowhere else. Everything else in lib/mappers is a
// straight field-for-field copy.
//
// Both conversions below are deliberately loud about what they assume,
// because a quiet fudge here produces a wrong compatibility verdict — which
// is the worst failure this product has.

import type { AxleType as PrismaAxleType } from "../generated/prisma/enums";
import type { AxleType as EngineAxleType } from "../types/parts";

/**
 * Anything Prisma might hand back for a `Decimal` column.
 *
 * The driver adapters return a decimal.js instance (`toNumber()`), but a raw
 * SQL result or a JSON round-trip can produce a string or a number for the
 * same column, so all three are accepted.
 */
export type DecimalLike = { toNumber(): number } | string | number;

/**
 * `Decimal` -> `number`, preserving null.
 *
 * `null` stays `null`. That is not a formality: the engine reads `null` as
 * "this spec was never published" and abstains, so substituting `0` here
 * would turn an unknown bottom-bracket shell width into a claim that the
 * shell is 0mm wide, and R-BB-03 would report a mismatch against every real
 * bottom bracket.
 *
 * An unreadable Decimal throws rather than degrading to null. A value that
 * exists but cannot be parsed is a bug in this layer, not missing data, and
 * silently converting it into an abstention would hide exactly the class of
 * mismatch this file exists to prevent.
 */
export function decimalToNumber(value: DecimalLike | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`decimalToNumber: received a non-finite number (${value})`);
    }
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`decimalToNumber: could not parse "${value}" as a number`);
    }
    return parsed;
  }

  if (typeof value.toNumber === "function") {
    const parsed = value.toNumber();
    if (!Number.isFinite(parsed)) {
      throw new Error("decimalToNumber: Decimal.toNumber() produced a non-finite number");
    }
    return parsed;
  }

  throw new Error("decimalToNumber: unsupported Decimal representation");
}

/**
 * `AxleType` (Prisma) -> `AxleType` (engine).
 *
 * These two enums are NOT the same set. The schema carries
 * `THRU_AXLE_100x12` — the 12mm/100mm front thru-axle on essentially every
 * modern disc road and gravel bike, and the value used by 25 of the 31
 * fork and wheelset rows currently in the catalogue — and
 * `lib/types/parts.ts` does not list it.
 *
 * The value is passed through unchanged, because that is the only option
 * that produces correct verdicts:
 *
 *   - Every rule that reads an axle type compares it either by string
 *     equality (R-AXL-01/02) or with `.startsWith('THRU_AXLE')` (R-AXL-04).
 *     An unlisted-but-consistent string behaves correctly in both:
 *     a THRU_AXLE_100x12 fork matches a THRU_AXLE_100x12 hub and matches
 *     nothing else, which is exactly right.
 *   - Dropping it is not available: `Frame.rearAxleType`, `Fork.frontAxleType`
 *     and both `Wheelset` axle fields are required in the engine's own types,
 *     so there is no "unknown" to fall back to.
 *   - Substituting a neighbouring value (THRU_AXLE_100x15, say) would be a
 *     fabrication, and would pair a 12mm hub with a 15mm fork.
 *
 * So the cast stands, and this comment is the record of it. If
 * `lib/types/parts.ts` ever gains the value, this function becomes an
 * identity function and nothing else changes.
 */
export function toEngineAxleType(value: PrismaAxleType): EngineAxleType {
  return value as unknown as EngineAxleType;
}

/** The Part columns every category mapper needs to build a `PartIdentity`. */
export interface PartIdentityRow {
  id: string;
  brand: string;
  name: string;
}
