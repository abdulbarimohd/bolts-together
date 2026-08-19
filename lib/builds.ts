// lib/builds.ts
//
// Data access for builds.
//
// The governing decision here is that a build is anonymous by default.
// `Build.userId` is nullable and stays null unless someone claims it; the
// build's uuid is the access token, the same trust model as a guest shopping
// cart. Nothing in this file requires an account, and nothing should be added
// that does — "sign in to see whether your parts fit" is the conversion
// failure the rebuild exists to remove.
//
// A slot holds exactly one part. Adding a part to an occupied slot replaces
// what was there rather than stacking a second one, because two parts in one
// slot is precisely the state the engine cannot resolve.

import { invalidBody, notFound } from "./api/http";
import {
  CATEGORIES,
  categoryForPartType,
  findCategory,
  isPhysicalSlot,
  type Category,
  type PhysicalSlot,
} from "./categories";
import type { PrismaClient } from "./generated/prisma/client";
import type { Prisma } from "./generated/prisma/client";
import {
  assembleBikeBuild,
  riderFromBuild,
  type AssembledBuild,
  type SlottedPartRow,
} from "./mappers/build";
import { toPartDto, type PartDto, type PartRecord } from "./parts";

/**
 * Include every category detail relation.
 *
 * A build spans categories, so unlike a part listing there is no single
 * relation to include. 27 left joins on a handful of rows is cheap, and it is
 * the only way to hand the engine a complete build in one round trip.
 */
const ALL_DETAILS = Object.fromEntries(
  CATEGORIES.map((category) => [category.relation, true]),
) as Prisma.PartInclude;

const BUILD_INCLUDE = {
  buildParts: {
    include: { part: { include: ALL_DETAILS } },
    orderBy: [{ addedAt: "asc" }, { id: "asc" }],
  },
} as Prisma.BuildInclude;

export interface BuildRecord {
  id: string;
  name: string;
  userId: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  riderHeightCm: number | null;
  riderInseamCm: number | null;
  riderWeightKg: number | null;
  basedOnModelId: string | null;
  buildParts: {
    id: string;
    partId: string;
    quantity: number;
    slot: string | null;
    addedAt: Date;
    part: PartRecord;
  }[];
}

// ------------------------------------------------------------
// Input validation
// ------------------------------------------------------------

export interface BuildPartInput {
  partId: string;
  slot: PhysicalSlot | null;
  quantity: number;
}

/** Rider measurements, bounded so a typo can't drive the fit rules. */
export const RIDER_BOUNDS = {
  heightCm: { min: 100, max: 250 },
  inseamCm: { min: 40, max: 130 },
  weightKg: { min: 25, max: 250 },
} as const;

function readSlotInput(raw: unknown, field: string): PhysicalSlot | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") throw invalidBody(`\`${field}\` must be a string or null.`);
  const value = raw.trim().toLowerCase();
  if (!isPhysicalSlot(value)) {
    throw invalidBody(`\`${field}\` must be one of front, rear, left, right.`, { received: raw });
  }
  return value;
}

/**
 * Validates the parts in a create/patch payload against the catalogue.
 *
 * Three things are checked, all of them before anything is written:
 *   - every part id exists (unknown ids come back listed, not as a 500)
 *   - the slot is one this category accepts, and is present where required
 *   - no two entries land in the same (category, slot)
 *
 * The slot requirement is the important one. A tyre with no end named cannot
 * be placed: front and rear clearance are different numbers on the same bike,
 * and the predecessor's habit of picking one arbitrarily is bug class 2 in
 * ENGINE_SPEC §7.
 */
export async function resolvePartInputs(
  db: PrismaClient,
  entries: Record<string, unknown>[],
  field: string,
): Promise<BuildPartInput[]> {
  const inputs: { partId: string; slot: PhysicalSlot | null; quantity: number }[] = [];

  for (const [index, entry] of entries.entries()) {
    const partId = entry.partId;
    if (typeof partId !== "string" || partId.trim() === "") {
      throw invalidBody(`\`${field}[${index}].partId\` is required.`, { field, index });
    }

    const slot = readSlotInput(entry.slot, `${field}[${index}].slot`);

    let quantity = 1;
    if (entry.quantity !== undefined) {
      if (typeof entry.quantity !== "number" || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99) {
        throw invalidBody(`\`${field}[${index}].quantity\` must be a whole number from 1 to 99.`, { field, index });
      }
      quantity = entry.quantity;
    }

    inputs.push({ partId: partId.trim(), slot, quantity });
  }

  if (inputs.length === 0) return [];

  const found = await db.part.findMany({
    where: { id: { in: inputs.map((input) => input.partId) } },
    select: { id: true, type: true },
  });
  const typeById = new Map(found.map((part) => [part.id, part.type]));

  const unknown = inputs.filter((input) => !typeById.has(input.partId)).map((input) => input.partId);
  if (unknown.length > 0) {
    throw invalidBody("Some parts do not exist.", { field, unknownPartIds: [...new Set(unknown)] });
  }

  const occupied = new Map<string, string>();
  const resolved: BuildPartInput[] = [];

  for (const input of inputs) {
    const category = categoryForPartType(typeById.get(input.partId)!);

    if (input.slot === null && category.slotRequired) {
      throw invalidBody(
        `A ${category.label.toLowerCase()} needs an explicit slot (${category.acceptedSlots.join(" or ")}) — front and rear are checked against different parts of the bike.`,
        { field, partId: input.partId, acceptedSlots: category.acceptedSlots },
      );
    }

    if (input.slot !== null && !category.acceptedSlots.includes(input.slot)) {
      throw invalidBody(
        category.acceptedSlots.length === 0
          ? `A ${category.label.toLowerCase()} does not take a slot.`
          : `A ${category.label.toLowerCase()} slot must be ${category.acceptedSlots.join(" or ")}.`,
        { field, partId: input.partId, acceptedSlots: category.acceptedSlots },
      );
    }

    const key = `${category.slug}:${input.slot ?? ""}`;
    const previous = occupied.get(key);
    if (previous && previous !== input.partId) {
      throw invalidBody(
        `Two different ${category.label.toLowerCase()}s were given for the same slot.`,
        { field, slot: input.slot, partIds: [previous, input.partId] },
      );
    }
    if (previous === input.partId) continue;

    occupied.set(key, input.partId);
    resolved.push(input);
  }

  return resolved;
}

/** Groups resolved inputs by the (category, slot) they occupy. */
async function categoriseInputs(
  db: PrismaClient,
  inputs: BuildPartInput[],
): Promise<{ input: BuildPartInput; category: Category }[]> {
  if (inputs.length === 0) return [];
  const found = await db.part.findMany({
    where: { id: { in: inputs.map((input) => input.partId) } },
    select: { id: true, type: true },
  });
  const typeById = new Map(found.map((part) => [part.id, part.type]));
  return inputs.map((input) => ({
    input,
    category: categoryForPartType(typeById.get(input.partId)!),
  }));
}

// ------------------------------------------------------------
// Reads
// ------------------------------------------------------------

export async function getBuildRecord(db: PrismaClient, id: string): Promise<BuildRecord | null> {
  const row = await db.build.findUnique({ where: { id }, include: BUILD_INCLUDE });
  return (row as unknown as BuildRecord) ?? null;
}

export async function requireBuildRecord(db: PrismaClient, id: string): Promise<BuildRecord> {
  const build = await getBuildRecord(db, id);
  if (!build) throw notFound("No build with that id.", { buildId: id });
  return build;
}

/** The engine's view of a stored build, plus the parts it could not place. */
export function assembleFromRecord(build: BuildRecord): AssembledBuild {
  const rows: SlottedPartRow[] = build.buildParts.map((buildPart) => ({
    slot: buildPart.slot,
    part: buildPart.part,
  }));
  return assembleBikeBuild(rows, riderFromBuild(build));
}

// ------------------------------------------------------------
// Writes
// ------------------------------------------------------------

export interface CreateBuildInput {
  name?: string;
  isPublic?: boolean;
  riderHeightCm?: number | null;
  riderInseamCm?: number | null;
  riderWeightKg?: number | null;
  basedOnModelId?: string | null;
  parts: BuildPartInput[];
}

/**
 * Creates a build. No account, no session, no cookie — just a row.
 *
 * When `basedOnModelId` is given and no explicit parts are, the factory
 * bike's part list is copied across with its slots preserved exactly,
 * including the nulls. Filling those in here would be inventing data about
 * a real bike; the read path reports them as unplaced instead.
 */
export async function createBuild(
  db: PrismaClient,
  input: CreateBuildInput,
): Promise<BuildRecord> {
  let parts = input.parts;

  if (parts.length === 0 && input.basedOnModelId) {
    const modelParts = await db.bikeModelPart.findMany({
      where: { bikeModelId: input.basedOnModelId },
      select: { partId: true, slot: true },
    });
    const seen = new Set<string>();
    parts = [];
    for (const modelPart of modelParts) {
      const key = `${modelPart.partId}:${modelPart.slot ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push({
        partId: modelPart.partId,
        slot: modelPart.slot !== null && isPhysicalSlot(modelPart.slot.toLowerCase())
          ? (modelPart.slot.toLowerCase() as PhysicalSlot)
          : null,
        quantity: 1,
      });
    }
  }

  if (input.basedOnModelId) {
    const model = await db.bikeModel.findUnique({
      where: { id: input.basedOnModelId },
      select: { id: true },
    });
    if (!model) throw invalidBody("No bike model with that id.", { basedOnModelId: input.basedOnModelId });
  }

  const created = await db.build.create({
    data: {
      name: input.name ?? "Untitled Build",
      // Left null on purpose: anonymous is the default, not a fallback.
      userId: null,
      isPublic: input.isPublic ?? false,
      riderHeightCm: input.riderHeightCm ?? null,
      riderInseamCm: input.riderInseamCm ?? null,
      riderWeightKg: input.riderWeightKg ?? null,
      basedOnModelId: input.basedOnModelId ?? null,
      buildParts: {
        create: parts.map((part) => ({
          partId: part.partId,
          slot: part.slot,
          quantity: part.quantity,
        })),
      },
    },
    include: BUILD_INCLUDE,
  });

  return created as unknown as BuildRecord;
}

export interface UpdateBuildInput {
  name?: string;
  isPublic?: boolean;
  riderHeightCm?: number | null;
  riderInseamCm?: number | null;
  riderWeightKg?: number | null;
  add?: BuildPartInput[];
  remove?: RemoveTarget[];
}

export interface RemoveTarget {
  partId?: string;
  categorySlug?: string;
  /** `undefined` means any slot; `null` means specifically the unslotted one. */
  slot?: PhysicalSlot | null;
}

export function readRemoveTargets(entries: Record<string, unknown>[]): RemoveTarget[] {
  return entries.map((entry, index) => {
    const target: RemoveTarget = {};

    if (entry.partId !== undefined) {
      if (typeof entry.partId !== "string" || entry.partId.trim() === "") {
        throw invalidBody(`\`remove[${index}].partId\` must be a non-empty string.`, { index });
      }
      target.partId = entry.partId.trim();
    }

    if (entry.category !== undefined) {
      if (typeof entry.category !== "string") {
        throw invalidBody(`\`remove[${index}].category\` must be a string.`, { index });
      }
      const category = findCategory(entry.category);
      if (!category) {
        throw invalidBody(`\`remove[${index}].category\` is not a known part category.`, {
          index,
          received: entry.category,
        });
      }
      target.categorySlug = category.slug;
    }

    if ("slot" in entry) {
      target.slot = readSlotInput(entry.slot, `remove[${index}].slot`);
    }

    if (target.partId === undefined && target.categorySlug === undefined) {
      throw invalidBody(`\`remove[${index}]\` needs either a partId or a category.`, { index });
    }

    return target;
  });
}

/**
 * Applies a patch.
 *
 * Reads first, then writes once. The deletes that clear a slot and the
 * creates that fill it go in a single `$transaction` so a failed write can
 * never leave a build with an empty slot it used to have filled.
 */
export async function updateBuild(
  db: PrismaClient,
  buildId: string,
  input: UpdateBuildInput,
): Promise<BuildRecord> {
  const scalarData: Prisma.BuildUpdateInput = {};
  if (input.name !== undefined) scalarData.name = input.name;
  if (input.isPublic !== undefined) scalarData.isPublic = input.isPublic;
  if (input.riderHeightCm !== undefined) scalarData.riderHeightCm = input.riderHeightCm;
  if (input.riderInseamCm !== undefined) scalarData.riderInseamCm = input.riderInseamCm;
  if (input.riderWeightKg !== undefined) scalarData.riderWeightKg = input.riderWeightKg;

  const additions = await categoriseInputs(db, input.add ?? []);

  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const target of input.remove ?? []) {
    const where: Prisma.BuildPartWhereInput = { buildId };
    if (target.partId) where.partId = target.partId;
    if (target.categorySlug) {
      const category = findCategory(target.categorySlug);
      if (category) where.part = { is: { type: category.partType } };
    }
    if ("slot" in target) where.slot = target.slot;
    operations.push(db.buildPart.deleteMany({ where }));
  }

  // Adding to an occupied slot replaces the occupant. Two parts in one slot
  // is unresolvable for the engine, so it is not a state the API can create.
  for (const { input: part, category } of additions) {
    operations.push(
      db.buildPart.deleteMany({
        where: { buildId, slot: part.slot, part: { is: { type: category.partType } } },
      }),
    );
  }

  if (additions.length > 0) {
    operations.push(
      db.buildPart.createMany({
        data: additions.map(({ input: part }) => ({
          buildId,
          partId: part.partId,
          slot: part.slot,
          quantity: part.quantity,
        })),
        skipDuplicates: true,
      }),
    );
  }

  // Set `updatedAt` explicitly rather than relying on `@updatedAt`. A patch
  // that only adds or removes parts leaves `scalarData` empty, and Prisma
  // does not stamp the column on an update with no other changes — so the
  // build's own timestamp would sit still while its contents changed, and
  // anything polling on `updatedAt` would never see the edit.
  operations.push(
    db.build.update({ where: { id: buildId }, data: { ...scalarData, updatedAt: new Date() } }),
  );

  await db.$transaction(operations);

  return requireBuildRecord(db, buildId);
}

// ------------------------------------------------------------
// DTOs
// ------------------------------------------------------------

export interface BuildPartDto {
  partId: string;
  slot: string | null;
  quantity: number;
  /** The `BikeBuild` slot this part actually filled, if any. */
  engineSlot: string | null;
  part: PartDto;
}

export interface BuildTotalsDto {
  partCount: number;
  weightGrams: number;
  pricePence: number | null;
  /** How many parts carry no published price. `pricePence` excludes them. */
  partsWithoutPrice: number;
}

export interface BuildDto {
  id: string;
  name: string;
  /** Null for an anonymous build. The build id is the access token. */
  userId: string | null;
  isPublic: boolean;
  basedOnModelId: string | null;
  createdAt: string;
  updatedAt: string;
  rider: { heightCm: number | null; inseamCm: number | null; weightKg: number | null } | null;
  parts: BuildPartDto[];
  /** Engine slot -> part id, i.e. exactly what the rules were run against. */
  slots: Record<string, string>;
  /** Parts stored on the build that no engine slot could take. */
  unplaced: AssembledBuild["unplaced"];
  totals: BuildTotalsDto;
}

export function toBuildDto(build: BuildRecord, assembled: AssembledBuild): BuildDto {
  const engineSlotByPartId = new Map<string, string>();
  for (const [slot, partId] of Object.entries(assembled.assignments)) {
    if (partId) engineSlotByPartId.set(partId, slot);
  }

  let weightGrams = 0;
  let pricePence = 0;
  let pricedParts = 0;
  let partsWithoutPrice = 0;

  const parts: BuildPartDto[] = build.buildParts.map((buildPart) => {
    const category = categoryForPartType(buildPart.part.type);
    weightGrams += buildPart.part.weightGrams * buildPart.quantity;
    if (buildPart.part.basePricePence === null) {
      partsWithoutPrice += 1;
    } else {
      pricePence += buildPart.part.basePricePence * buildPart.quantity;
      pricedParts += 1;
    }

    return {
      partId: buildPart.partId,
      slot: buildPart.slot,
      quantity: buildPart.quantity,
      engineSlot: engineSlotByPartId.get(buildPart.partId) ?? null,
      part: toPartDto(buildPart.part, category),
    };
  });

  const rider =
    build.riderHeightCm === null && build.riderInseamCm === null && build.riderWeightKg === null
      ? null
      : {
          heightCm: build.riderHeightCm,
          inseamCm: build.riderInseamCm,
          weightKg: build.riderWeightKg,
        };

  return {
    id: build.id,
    name: build.name,
    userId: build.userId,
    isPublic: build.isPublic,
    basedOnModelId: build.basedOnModelId,
    createdAt: build.createdAt.toISOString(),
    updatedAt: build.updatedAt.toISOString(),
    rider,
    parts,
    slots: Object.fromEntries(
      Object.entries(assembled.assignments).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
    unplaced: assembled.unplaced,
    totals: {
      partCount: build.buildParts.length,
      weightGrams,
      // Null when nothing on the build has a published price — a total of
      // zero would read as "free". Where some parts are priced, the partial
      // sum is returned alongside `partsWithoutPrice` so the UI can say what
      // it excludes rather than pretend the gaps are zero.
      pricePence: pricedParts === 0 ? null : pricePence,
      partsWithoutPrice,
    },
  };
}
