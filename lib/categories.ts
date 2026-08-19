// lib/categories.ts
//
// The registry that ties the three worlds together, once, for all 27 part
// categories:
//
//   URL slug          "bottom-brackets"        what the API is addressed by
//   Prisma            PartType.BOTTOM_BRACKET  discriminator + 1:1 relation
//   engine            BikeBuild["bottomBracket"]
//
// Everything downstream (query building, mapping, server-side lockout, DTO
// shaping) reads this table rather than re-deriving the relationship, so a
// new category is added in one place and cannot end up half-wired.
//
// The class-table inheritance in the schema means a "part" is always two
// rows: the shared `Part` base and one category detail row joined on
// `partId`. `relation` is the include key that fetches the second.

import {
  filterCompatibleBottomBrackets,
  filterCompatibleBrakeCalipers,
  filterCompatibleBrakeLevers,
  filterCompatibleCassettes,
  filterCompatibleChainGuides,
  filterCompatibleChainrings,
  filterCompatibleChains,
  filterCompatibleCranksets,
  filterCompatibleDerailleurHangers,
  filterCompatibleForks,
  filterCompatibleFrontDerailleurs,
  filterCompatibleFrontTyres,
  filterCompatibleHandlebars,
  filterCompatibleHeadsets,
  filterCompatiblePedals,
  filterCompatibleRearDerailleurs,
  filterCompatibleRearShocks,
  filterCompatibleRearTyres,
  filterCompatibleRotors,
  filterCompatibleSaddles,
  filterCompatibleSeatClamps,
  filterCompatibleSeatposts,
  filterCompatibleShifters,
  filterCompatibleShoes,
  filterCompatibleStems,
  filterCompatibleTubes,
  filterCompatibleWheelsets,
} from "./compatibility/engine";

import type { PartType } from "./generated/prisma/enums";
import {
  mapBottomBracket,
  mapBrakeCaliper,
  mapBrakeLever,
  mapCassette,
  mapChain,
  mapChainGuide,
  mapChainring,
  mapCrankset,
  mapDerailleurHanger,
  mapFork,
  mapFrame,
  mapFrontDerailleur,
  mapHandlebar,
  mapHeadset,
  mapPedal,
  mapRearDerailleur,
  mapRearShock,
  mapRotor,
  mapSaddle,
  mapSeatClamp,
  mapSeatpost,
  mapShifter,
  mapShoe,
  mapStem,
  mapTube,
  mapTyre,
  mapWheelset,
} from "./mappers/parts";
import type { PartIdentityRow } from "./mappers/scalars";
import { DETAIL_FILTERS, type ColumnFilter } from "./partFilters";
import type { BikeBuild } from "./types/parts";

/** A slot on a `BikeBuild`, e.g. "frame", "frontTyre". Never "rider". */
export type BuildSlot = Exclude<keyof BikeBuild, "rider">;

/**
 * Where a part physically sits when the bike carries two of them.
 *
 * These are the values already present in `BikeModelPart.slot` in the live
 * catalogue. `null` means unstated, which is honest for the ~460 rows that
 * predate the slot column being used consistently — and is treated as
 * "unknown", never as "front" or "whichever came back first".
 */
export type PhysicalSlot = "front" | "rear" | "left" | "right";

export const PHYSICAL_SLOTS: readonly PhysicalSlot[] = ["front", "rear", "left", "right"];

export function isPhysicalSlot(value: string): value is PhysicalSlot {
  return (PHYSICAL_SLOTS as readonly string[]).includes(value);
}

/** The shape every mapper produces: the engine's own domain objects. */
export interface DomainPart {
  partId: string;
  brand: string;
  name: string;
}

export type SlotEnd = "front" | "rear";

export interface Category {
  /** URL segment: `/api/parts/<slug>`. */
  readonly slug: string;
  readonly label: string;
  readonly partType: PartType;
  /** The 1:1 include key on `Part`, and the Prisma delegate name. */
  readonly relation: string;
  /** Prisma model name, used to look up this category's column filters. */
  readonly model: string;
  /**
   * The `BikeBuild` slots this category can occupy. Two entries means the
   * bike carries a front and a rear one, in that order.
   */
  readonly slots: readonly BuildSlot[];
  readonly paired: boolean;
  /**
   * Preference order used when several parts of this category compete for a
   * single engine slot. Explicit and fixed, because resolving by whichever
   * row the database returned first is the exact defect ENGINE_SPEC §7 lists
   * as bug class 3.
   */
  readonly slotPreference: readonly (PhysicalSlot | null)[];
  /**
   * Slots a *new* part may be written into.
   *
   * Deliberately narrower than `slotPreference`. Reading has to cope with
   * everything already in the catalogue, including a shifter recorded as
   * "front" when it means "left"; writing should not add more of that.
   */
  readonly acceptedSlots: readonly PhysicalSlot[];
  /** True where a part cannot be placed at all without being told which end. */
  readonly slotRequired: boolean;
  /** Prisma detail row -> engine domain object. */
  toDomain(part: PartIdentityRow, detail: unknown): DomainPart;
  /**
   * Server-side lockout for this category, or `null` where the engine has no
   * filter layer. Only frames have none: a frame is the root of a build, so
   * there is nothing already chosen to narrow it against.
   */
  readonly lockout:
    | ((build: BikeBuild, candidates: DomainPart[], end: SlotEnd) => DomainPart[])
    | null;
  /** Query-parameter definitions for this category's detail columns. */
  readonly filters: readonly ColumnFilter[];
}

/** Default order for single-slot categories: an unslotted part is the norm. */
const DEFAULT_PREFERENCE: readonly (PhysicalSlot | null)[] = [null, "rear", "front", "right", "left"];

/**
 * Preference for the categories where the bike has two but `BikeBuild` has
 * one slot.
 *
 * The right-hand control operates the rear derailleur and (in the UK) the
 * rear brake, and nearly every rule that reads `build.shifter` or
 * `build.brakeLever` is a rear-drivetrain or rear-brake rule — speeds against
 * the cassette, cable pull against the rear mech. So the right/rear item is
 * the one that carries the compatibility-relevant spec. `rear` and `right`
 * both appear because the catalogue uses both spellings for shifters.
 */
const REAR_FIRST: readonly (PhysicalSlot | null)[] = ["right", "rear", null, "left", "front"];
const REAR_CALIPER_FIRST: readonly (PhysicalSlot | null)[] = ["rear", null, "front", "right", "left"];

interface CategoryInput<TDetail, TDomain extends DomainPart> {
  slug: string;
  label: string;
  partType: PartType;
  relation: string;
  model: string;
  slots: readonly BuildSlot[];
  slotPreference?: readonly (PhysicalSlot | null)[];
  acceptedSlots?: readonly PhysicalSlot[];
  toDomain: (part: PartIdentityRow, detail: TDetail) => TDomain;
  /**
   * `NoInfer` pins `TDomain` to whatever the mapper produces, so the engine's
   * looser signatures (`Fork[] -> Fork[]`) can be passed straight in without
   * widening the mapped type. The return is only ever a subset of the array
   * handed in, which is why `DomainPart[]` is enough here.
   */
  lockout:
    | ((build: BikeBuild, candidates: NoInfer<TDomain>[], end: SlotEnd) => DomainPart[])
    | null;
}

/**
 * Erases the per-category generics down to one uniform `Category`.
 *
 * The two casts below are the only ones in this layer. They are safe by
 * construction: a category's detail row is only ever fetched through its own
 * `relation`, so the value handed to `toDomain` is always of type `TDetail`,
 * and `lockout` only ever sees objects that `toDomain` produced.
 */
function defineCategory<TDetail, TDomain extends DomainPart>(
  input: CategoryInput<TDetail, TDomain>,
): Category {
  const { toDomain, lockout } = input;
  const paired = input.slots.length > 1;
  return {
    slug: input.slug,
    label: input.label,
    partType: input.partType,
    relation: input.relation,
    model: input.model,
    slots: input.slots,
    paired,
    slotPreference: input.slotPreference ?? DEFAULT_PREFERENCE,
    acceptedSlots: input.acceptedSlots ?? (paired ? (["front", "rear"] as const) : []),
    slotRequired: paired,
    toDomain: (part, detail) => toDomain(part, detail as TDetail),
    lockout: lockout
      ? (build, candidates, end) => lockout(build, candidates as TDomain[], end)
      : null,
    filters: DETAIL_FILTERS[input.model] ?? [],
  };
}

export const CATEGORIES: readonly Category[] = [
  defineCategory({
    slug: "frames",
    label: "Frame",
    partType: "FRAME",
    relation: "frame",
    model: "Frame",
    slots: ["frame"],
    toDomain: mapFrame,
    // No `filterCompatibleFrames` exists, by design: the frame is what
    // everything else is filtered against. `?compatibleWith=` on this
    // category returns the unfiltered list and says so in the response.
    lockout: null,
  }),
  defineCategory({
    slug: "forks",
    label: "Fork",
    partType: "FORK",
    relation: "fork",
    model: "Fork",
    slots: ["fork"],
    toDomain: mapFork,
    lockout: filterCompatibleForks,
  }),
  defineCategory({
    slug: "bottom-brackets",
    label: "Bottom bracket",
    partType: "BOTTOM_BRACKET",
    relation: "bottomBracket",
    model: "BottomBracket",
    slots: ["bottomBracket"],
    toDomain: mapBottomBracket,
    lockout: filterCompatibleBottomBrackets,
  }),
  defineCategory({
    slug: "cranksets",
    label: "Crankset",
    partType: "CRANKSET",
    relation: "crankset",
    model: "Crankset",
    slots: ["crankset"],
    toDomain: mapCrankset,
    lockout: filterCompatibleCranksets,
  }),
  defineCategory({
    slug: "chainrings",
    label: "Chainring",
    partType: "CHAINRING",
    relation: "chainring",
    model: "Chainring",
    slots: ["chainring"],
    toDomain: mapChainring,
    lockout: filterCompatibleChainrings,
  }),
  defineCategory({
    slug: "wheelsets",
    label: "Wheelset",
    partType: "WHEELSET",
    relation: "wheelset",
    model: "Wheelset",
    slots: ["wheelset"],
    toDomain: mapWheelset,
    lockout: filterCompatibleWheelsets,
  }),
  defineCategory({
    slug: "tyres",
    label: "Tyre",
    partType: "TYRE",
    relation: "tyre",
    model: "Tyre",
    slots: ["frontTyre", "rearTyre"],
    toDomain: mapTyre,
    // Front and rear clearance are different numbers on the same bike (fork
    // vs rear triangle), so the end being asked about decides the rule set.
    lockout: (build, candidates, end) =>
      end === "front"
        ? filterCompatibleFrontTyres(build, candidates)
        : filterCompatibleRearTyres(build, candidates),
  }),
  defineCategory({
    slug: "tubes",
    label: "Inner tube",
    partType: "TUBE",
    relation: "tube",
    model: "Tube",
    slots: ["frontTube", "rearTube"],
    // The engine exposes one tube filter that resolves the tyre internally,
    // so `end` is not forwarded here.
    toDomain: mapTube,
    lockout: (build, candidates) => filterCompatibleTubes(build, candidates),
  }),
  defineCategory({
    slug: "brake-calipers",
    label: "Brake caliper",
    partType: "BRAKE_CALIPER",
    relation: "brakeCaliper",
    model: "BrakeCaliper",
    slots: ["brakeCaliper"],
    slotPreference: REAR_CALIPER_FIRST,
    acceptedSlots: ["front", "rear"],
    toDomain: mapBrakeCaliper,
    lockout: filterCompatibleBrakeCalipers,
  }),
  defineCategory({
    slug: "brake-levers",
    label: "Brake lever",
    partType: "BRAKE_LEVER",
    relation: "brakeLever",
    model: "BrakeLever",
    slots: ["brakeLever"],
    slotPreference: REAR_FIRST,
    // Left/right, because that is how a rider buys and fits them. The engine
    // has one lever slot; `slotPreference` decides which of the two fills it.
    acceptedSlots: ["left", "right"],
    toDomain: mapBrakeLever,
    lockout: filterCompatibleBrakeLevers,
  }),
  defineCategory({
    slug: "rotors",
    label: "Rotor",
    partType: "ROTOR",
    relation: "rotor",
    model: "Rotor",
    slots: ["frontRotor", "rearRotor"],
    toDomain: mapRotor,
    lockout: (build, candidates, end) => filterCompatibleRotors(build, candidates, end),
  }),
  defineCategory({
    slug: "shifters",
    label: "Shifter",
    partType: "SHIFTER",
    relation: "shifter",
    model: "Shifter",
    slots: ["shifter"],
    slotPreference: REAR_FIRST,
    acceptedSlots: ["left", "right"],
    toDomain: mapShifter,
    lockout: filterCompatibleShifters,
  }),
  defineCategory({
    slug: "rear-derailleurs",
    label: "Rear derailleur",
    partType: "REAR_DERAILLEUR",
    relation: "rearDerailleur",
    model: "RearDerailleur",
    slots: ["rearDerailleur"],
    toDomain: mapRearDerailleur,
    lockout: filterCompatibleRearDerailleurs,
  }),
  defineCategory({
    slug: "front-derailleurs",
    label: "Front derailleur",
    partType: "FRONT_DERAILLEUR",
    relation: "frontDerailleur",
    model: "FrontDerailleur",
    slots: ["frontDerailleur"],
    toDomain: mapFrontDerailleur,
    lockout: filterCompatibleFrontDerailleurs,
  }),
  defineCategory({
    slug: "cassettes",
    label: "Cassette",
    partType: "CASSETTE",
    relation: "cassette",
    model: "Cassette",
    slots: ["cassette"],
    toDomain: mapCassette,
    lockout: filterCompatibleCassettes,
  }),
  defineCategory({
    slug: "chains",
    label: "Chain",
    partType: "CHAIN",
    relation: "chain",
    model: "Chain",
    slots: ["chain"],
    toDomain: mapChain,
    lockout: filterCompatibleChains,
  }),
  defineCategory({
    slug: "headsets",
    label: "Headset",
    partType: "HEADSET",
    relation: "headset",
    model: "Headset",
    slots: ["headset"],
    toDomain: mapHeadset,
    lockout: filterCompatibleHeadsets,
  }),
  defineCategory({
    slug: "rear-shocks",
    label: "Rear shock",
    partType: "REAR_SHOCK",
    relation: "rearShock",
    model: "RearShock",
    slots: ["rearShock"],
    toDomain: mapRearShock,
    lockout: filterCompatibleRearShocks,
  }),
  defineCategory({
    slug: "handlebars",
    label: "Handlebar",
    partType: "HANDLEBAR",
    relation: "handlebar",
    model: "Handlebar",
    slots: ["handlebar"],
    toDomain: mapHandlebar,
    lockout: filterCompatibleHandlebars,
  }),
  defineCategory({
    slug: "stems",
    label: "Stem",
    partType: "STEM",
    relation: "stem",
    model: "Stem",
    slots: ["stem"],
    toDomain: mapStem,
    lockout: filterCompatibleStems,
  }),
  defineCategory({
    slug: "seatposts",
    label: "Seatpost",
    partType: "SEATPOST",
    relation: "seatpost",
    model: "Seatpost",
    slots: ["seatpost"],
    toDomain: mapSeatpost,
    lockout: filterCompatibleSeatposts,
  }),
  defineCategory({
    slug: "seat-clamps",
    label: "Seat clamp",
    partType: "SEAT_CLAMP",
    relation: "seatClamp",
    model: "SeatClamp",
    slots: ["seatClamp"],
    toDomain: mapSeatClamp,
    lockout: filterCompatibleSeatClamps,
  }),
  defineCategory({
    slug: "saddles",
    label: "Saddle",
    partType: "SADDLE",
    relation: "saddle",
    model: "Saddle",
    slots: ["saddle"],
    toDomain: mapSaddle,
    lockout: filterCompatibleSaddles,
  }),
  defineCategory({
    slug: "pedals",
    label: "Pedal",
    partType: "PEDAL",
    relation: "pedal",
    model: "Pedal",
    slots: ["pedal"],
    toDomain: mapPedal,
    lockout: filterCompatiblePedals,
  }),
  defineCategory({
    slug: "shoes",
    label: "Shoe",
    partType: "SHOE",
    relation: "shoe",
    model: "Shoe",
    slots: ["shoe"],
    toDomain: mapShoe,
    lockout: filterCompatibleShoes,
  }),
  defineCategory({
    slug: "chain-guides",
    label: "Chain guide",
    partType: "CHAIN_GUIDE",
    relation: "chainGuide",
    model: "ChainGuide",
    slots: ["chainGuide"],
    toDomain: mapChainGuide,
    lockout: filterCompatibleChainGuides,
  }),
  defineCategory({
    slug: "derailleur-hangers",
    label: "Derailleur hanger",
    partType: "DERAILLEUR_HANGER",
    relation: "derailleurHanger",
    model: "DerailleurHanger",
    slots: ["derailleurHanger"],
    toDomain: mapDerailleurHanger,
    lockout: filterCompatibleDerailleurHangers,
  }),
];

const BY_SLUG = new Map<string, Category>();
for (const category of CATEGORIES) {
  // A category answers to its URL slug, its PartType, and its relation name.
  // Three spellings of the same thing exist in the codebase already; making
  // all three resolve costs nothing and removes a class of 404.
  BY_SLUG.set(category.slug, category);
  BY_SLUG.set(category.partType.toLowerCase(), category);
  BY_SLUG.set(category.relation.toLowerCase(), category);
}

const BY_PART_TYPE = new Map<PartType, Category>(CATEGORIES.map((c) => [c.partType, c]));

/** Resolves a URL segment to a category, or `undefined` if unknown. */
export function findCategory(slug: string): Category | undefined {
  return BY_SLUG.get(slug.trim().toLowerCase());
}

export function categoryForPartType(type: PartType): Category {
  const category = BY_PART_TYPE.get(type);
  if (!category) throw new Error(`categoryForPartType: no category for PartType "${type}"`);
  return category;
}

export const CATEGORY_SLUGS: readonly string[] = CATEGORIES.map((c) => c.slug);

/** The engine slot a physical slot maps to, for a paired category. */
export function slotForEnd(category: Category, end: SlotEnd): BuildSlot {
  if (!category.paired) return category.slots[0];
  return end === "front" ? category.slots[0] : category.slots[1];
}
