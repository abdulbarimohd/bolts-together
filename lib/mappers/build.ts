// lib/mappers/build.ts
//
// Rows -> `BikeBuild`.
//
// `BuildPart` and `BikeModelPart` are both "a part, optionally with a
// physical slot". `BikeBuild` is "one named slot per thing the engine knows
// how to reason about". Joining the two is where the predecessor's worst bug
// lived: with two shifters on the bike and one `shifter` slot in the engine,
// it took whichever row the query happened to return first, so the same build
// validated differently on different requests.
//
// Nothing here resolves a part by position, insertion order or array index.
// Every choice is made by an explicit, declared preference (see
// `Category.slotPreference`), and when the data genuinely does not say which
// part goes where, the part is left out of the build and reported in
// `unplaced` rather than guessed at. Leaving it out makes the affected rules
// abstain, which is the documented behaviour for unknown data; guessing would
// make them assert something false.

import {
  categoryForPartType,
  isPhysicalSlot,
  type BuildSlot,
  type Category,
  type DomainPart,
  type PhysicalSlot,
} from "../categories";
import type { PartType } from "../generated/prisma/enums";
import type { BikeBuild, RiderProfile } from "../types/parts";
import type { PartIdentityRow } from "./scalars";

/** The minimum a row needs to be placeable. Extra columns are ignored. */
export type PartRow = PartIdentityRow & { type: PartType };

export interface SlottedPartRow {
  slot: string | null;
  part: PartRow;
}

export type UnplacedReason =
  /** Two or more parts compete for one slot with nothing to separate them. */
  | "ambiguous_slot"
  /** A real second part the engine has no slot for, e.g. the left shifter. */
  | "slot_occupied"
  /** The Part row exists but its category detail row is missing. */
  | "missing_detail"
  /** Defensive: a PartType with no registered category. */
  | "unknown_category";

export interface UnplacedPart {
  partId: string;
  partType: PartType;
  brand: string;
  name: string;
  slot: string | null;
  reason: UnplacedReason;
  message: string;
}

export interface AssembledBuild {
  /** What the compatibility engine is actually given. */
  build: BikeBuild;
  /** Which part ended up in which engine slot. */
  assignments: Partial<Record<BuildSlot, string>>;
  /** Parts deliberately left out, with the reason. Never silently dropped. */
  unplaced: UnplacedPart[];
}

function detailOf(part: PartRow, relation: string): unknown {
  return (part as unknown as Record<string, unknown>)[relation];
}

function unplaced(
  row: SlottedPartRow,
  reason: UnplacedReason,
  message: string,
): UnplacedPart {
  return {
    partId: row.part.id,
    partType: row.part.type,
    brand: row.part.brand,
    name: row.part.name,
    slot: row.slot,
    reason,
    message,
  };
}

/** Normalises a stored slot string to the closed vocabulary, or null. */
function readSlot(slot: string | null): PhysicalSlot | null {
  if (slot === null) return null;
  const value = slot.trim().toLowerCase();
  return isPhysicalSlot(value) ? value : null;
}

interface Candidate {
  row: SlottedPartRow;
  slot: PhysicalSlot | null;
  domain: DomainPart;
}

/**
 * Builds the engine's view of a build from its part rows.
 *
 * `rider` is passed through untouched — the fit rules (R-FIT-*) are advisory
 * and only run when a measurement is actually present.
 */
export function assembleBikeBuild(
  rows: readonly SlottedPartRow[],
  rider?: RiderProfile,
): AssembledBuild {
  const build: BikeBuild = {};
  const assignments: Partial<Record<BuildSlot, string>> = {};
  const unplacedParts: UnplacedPart[] = [];

  // Group by category first: every decision below is made within one
  // category, never across the whole part list.
  const byCategory = new Map<Category, Candidate[]>();

  for (const row of rows) {
    let category: Category;
    try {
      category = categoryForPartType(row.part.type);
    } catch {
      unplacedParts.push(
        unplaced(row, "unknown_category", `No category is registered for part type ${row.part.type}.`),
      );
      continue;
    }

    const detail = detailOf(row.part, category.relation);
    if (detail === null || detail === undefined) {
      unplacedParts.push(
        unplaced(
          row,
          "missing_detail",
          `${row.part.brand} ${row.part.name} has no ${category.label.toLowerCase()} spec row, so nothing about it can be checked.`,
        ),
      );
      continue;
    }

    const existing = byCategory.get(category);
    const candidate: Candidate = {
      row,
      slot: readSlot(row.slot),
      domain: category.toDomain(row.part, detail),
    };
    if (existing) existing.push(candidate);
    else byCategory.set(category, [candidate]);
  }

  for (const [category, candidates] of byCategory) {
    if (category.paired) {
      placePaired(category, candidates, build, assignments, unplacedParts);
    } else {
      placeSingle(category, candidates, build, assignments, unplacedParts);
    }
  }

  if (rider) build.rider = rider;

  return { build, assignments, unplaced: unplacedParts };
}

function assign(
  build: BikeBuild,
  assignments: Partial<Record<BuildSlot, string>>,
  slot: BuildSlot,
  candidate: Candidate,
): void {
  // The registry guarantees the domain object matches the slot's type; the
  // cast is the same erasure `defineCategory` already performs.
  (build as Record<string, unknown>)[slot] = candidate.domain;
  assignments[slot] = candidate.row.part.id;
}

/**
 * Front/rear categories: tyres, tubes, rotors.
 *
 * Explicit slots win outright. A single unslotted part then fills whichever
 * ends are still empty — that is not a guess: one tyre spec listed against a
 * bike with no front/rear distinction has exactly one reading, and it is the
 * common case in the catalogue (11 of 31 tyre links). Two unslotted parts
 * have no single reading, so neither is placed.
 */
function placePaired(
  category: Category,
  candidates: Candidate[],
  build: BikeBuild,
  assignments: Partial<Record<BuildSlot, string>>,
  unplacedParts: UnplacedPart[],
): void {
  const [frontSlot, rearSlot] = category.slots;
  const ends: { end: PhysicalSlot; slot: BuildSlot }[] = [
    { end: "front", slot: frontSlot },
    { end: "rear", slot: rearSlot },
  ];

  const leftovers: Candidate[] = [];
  for (const { end, slot } of ends) {
    const matching = candidates.filter((c) => c.slot === end);
    if (matching.length === 1) {
      assign(build, assignments, slot, matching[0]);
    } else if (matching.length > 1) {
      for (const candidate of matching) {
        unplacedParts.push(
          unplaced(
            candidate.row,
            "ambiguous_slot",
            `More than one ${category.label.toLowerCase()} is recorded in the ${end} slot, so neither was used.`,
          ),
        );
      }
    }
  }

  for (const candidate of candidates) {
    if (candidate.slot === "front" || candidate.slot === "rear") continue;
    leftovers.push(candidate);
  }

  const empty = ends.filter(({ slot }) => assignments[slot] === undefined);

  if (leftovers.length === 1 && empty.length > 0) {
    for (const { slot } of empty) assign(build, assignments, slot, leftovers[0]);
    return;
  }

  for (const candidate of leftovers) {
    unplacedParts.push(
      unplaced(
        candidate.row,
        leftovers.length > 1 ? "ambiguous_slot" : "slot_occupied",
        leftovers.length > 1
          ? `${leftovers.length} ${category.label.toLowerCase()}s carry no front/rear slot, so none could be placed without guessing.`
          : `Both ${category.label.toLowerCase()} slots are already filled.`,
      ),
    );
  }
}

/**
 * Categories with one engine slot.
 *
 * The winner is the candidate with the best `slotPreference` rank. If two
 * candidates tie at the best rank the data does not say which is which, so
 * neither is used.
 */
function placeSingle(
  category: Category,
  candidates: Candidate[],
  build: BikeBuild,
  assignments: Partial<Record<BuildSlot, string>>,
  unplacedParts: UnplacedPart[],
): void {
  const slot = category.slots[0];

  const rankOf = (candidate: Candidate): number => {
    const index = category.slotPreference.indexOf(candidate.slot);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  let bestRank = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) bestRank = Math.min(bestRank, rankOf(candidate));

  const best = candidates.filter((c) => rankOf(c) === bestRank);

  if (best.length === 1) {
    assign(build, assignments, slot, best[0]);
  } else {
    for (const candidate of best) {
      unplacedParts.push(
        unplaced(
          candidate.row,
          "ambiguous_slot",
          `${best.length} ${category.label.toLowerCase()}s are equally eligible for the ${slot} slot and nothing distinguishes them, so none was used.`,
        ),
      );
    }
  }

  for (const candidate of candidates) {
    if (best.includes(candidate)) continue;
    unplacedParts.push(
      unplaced(
        candidate.row,
        "slot_occupied",
        `The build model has a single ${slot} slot, already filled by a higher-priority part.`,
      ),
    );
  }
}

/**
 * Rider measurements from a Build row.
 *
 * Returns `undefined` when nothing is recorded, so the fit rules stay
 * silent rather than comparing against zeroes.
 */
export function riderFromBuild(row: {
  riderHeightCm: number | null;
  riderInseamCm: number | null;
  riderWeightKg: number | null;
}): RiderProfile | undefined {
  if (row.riderHeightCm === null && row.riderInseamCm === null && row.riderWeightKg === null) {
    return undefined;
  }
  return {
    heightCm: row.riderHeightCm,
    inseamCm: row.riderInseamCm,
    weightKg: row.riderWeightKg,
  };
}
