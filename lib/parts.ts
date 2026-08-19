// lib/parts.ts
//
// Data access for parts: turning validated query parameters into a Prisma
// query, and turning Prisma rows into the JSON the API returns.
//
// Two things worth knowing before reading on.
//
// 1. A "part" is always two rows. The schema uses class-table inheritance:
//    the shared `Part` base plus one detail row per category joined on
//    `partId`. Every query here includes the detail relation for the category
//    being asked about, and requires it to exist — a `Part` row typed FRAME
//    with no `Frame` row has no spec to check, so it is excluded from both
//    the items and the total rather than appearing as a part with no data.
//
// 2. Numeric filters are ranges and they exclude unknowns. `?minMaxRotorMm=180`
//    returns forks that publish a maximum rotor size of at least 180 — not
//    forks that publish nothing. That follows the same instinct as the
//    engine: never let missing data read as a match.

import type { Category, DomainPart } from "./categories";
import type { PrismaClient } from "./generated/prisma/client";
import type { Prisma } from "./generated/prisma/client";
import type { Currency, DataSource, Discipline, PartType, VendorName } from "./generated/prisma/enums";
import { enumValues, type ColumnFilter } from "./partFilters";
import {
  readBoolean,
  readEnumList,
  readList,
  readNumber,
  readString,
} from "./api/query";

/** The `Part` base columns this layer reads. Extra columns are ignored. */
export interface PartRecord {
  id: string;
  type: PartType;
  brand: string;
  name: string;
  imageUrl: string | null;
  basePricePence: number | null;
  weightGrams: number;
  releaseDate: Date | null;
  createdAt: Date;
  disciplines: Discipline[];
  dataSource: DataSource;
  sourceUrl: string | null;
  dataNotes: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
}

export interface PriceRecord {
  id: string;
  pricePence: number;
  currency: Currency;
  includesVat: boolean;
  vatRatePercent: number;
  inStock: boolean;
  productUrl: string;
  recordedAt: Date;
  vendor: { id: string; name: VendorName; siteUrl: string };
}

// ------------------------------------------------------------
// Query building
// ------------------------------------------------------------

/**
 * Numeric filters are `min<Column>` / `max<Column>`.
 *
 * Capitalising the column rather than inventing a friendlier alias per field
 * keeps the rule mechanical: given any column in the schema, a caller can
 * work out the parameter name without a lookup table.
 */
export function minParam(column: string): string {
  return `min${column.charAt(0).toUpperCase()}${column.slice(1)}`;
}

export function maxParam(column: string): string {
  return `max${column.charAt(0).toUpperCase()}${column.slice(1)}`;
}

type Condition = Record<string, unknown>;

function applyColumnFilters(
  params: URLSearchParams,
  filters: readonly ColumnFilter[],
  target: Condition,
): number {
  let applied = 0;

  for (const filter of filters) {
    switch (filter.kind) {
      case "number": {
        const min = readNumber(params, minParam(filter.column));
        const max = readNumber(params, maxParam(filter.column));
        if (min === undefined && max === undefined) break;
        const range: Condition = {};
        if (min !== undefined) range.gte = min;
        if (max !== undefined) range.lte = max;
        target[filter.column] = range;
        applied += 1;
        break;
      }
      case "boolean": {
        const value = readBoolean(params, filter.column);
        if (value === undefined) break;
        target[filter.column] = value;
        applied += 1;
        break;
      }
      case "enum": {
        const values = readEnumList(params, filter.column, enumValues(filter.enumName));
        if (!values) break;
        target[filter.column] = { in: values };
        applied += 1;
        break;
      }
      case "text": {
        const value = readString(params, filter.column);
        if (value === undefined) break;
        target[filter.column] = { equals: value, mode: "insensitive" };
        applied += 1;
        break;
      }
    }
  }

  return applied;
}

export interface PartQuery {
  where: Prisma.PartWhereInput;
  orderBy: Prisma.PartOrderByWithRelationInput[];
}

const SORT_COLUMNS: Record<string, { column: string; nullable: boolean }> = {
  brand: { column: "brand", nullable: false },
  name: { column: "name", nullable: false },
  price: { column: "basePricePence", nullable: true },
  weight: { column: "weightGrams", nullable: false },
  newest: { column: "createdAt", nullable: false },
};

export const SORT_KEYS: readonly string[] = Object.keys(SORT_COLUMNS);

/**
 * Builds the `where` and `orderBy` for a part listing.
 *
 * Throws `ApiError` (400) on any malformed parameter — see lib/api/query.ts.
 * Unknown parameter names are ignored rather than rejected, so a client can
 * keep unrelated state (`?page=`, `?tab=`) in the URL.
 */
export function buildPartQuery(category: Category, params: URLSearchParams): PartQuery {
  const where: Prisma.PartWhereInput = { type: category.partType };
  const conditions: Condition = where as Condition;

  // The detail row must exist: a part with no spec row cannot be checked
  // against anything, so it is not a listable part.
  const detail: Condition = {};
  applyColumnFilters(params, category.filters, detail);

  conditions[category.relation] =
    Object.keys(detail).length > 0 ? { is: detail } : { isNot: null };

  const brands = readList(params, "brand");
  if (brands) conditions.brand = { in: brands };

  // Each independent "any of these" group goes into its own AND entry.
  // Assigning both to a single top-level `OR` would turn "matches the search
  // AND is a gravel part" into "matches the search OR is a gravel part",
  // which silently widens the result rather than narrowing it.
  const anyOfGroups: Prisma.PartWhereInput[] = [];

  const search = readString(params, "q", 120);
  if (search) {
    anyOfGroups.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const minPrice = readNumber(params, "minPrice", { min: 0 });
  const maxPrice = readNumber(params, "maxPrice", { min: 0 });
  if (minPrice !== undefined || maxPrice !== undefined) {
    const range: Condition = {};
    if (minPrice !== undefined) range.gte = Math.round(minPrice);
    if (maxPrice !== undefined) range.lte = Math.round(maxPrice);
    conditions.basePricePence = range;
  }

  const minWeight = readNumber(params, "minWeight", { min: 0 });
  const maxWeight = readNumber(params, "maxWeight", { min: 0 });
  if (minWeight !== undefined || maxWeight !== undefined) {
    const range: Condition = {};
    if (minWeight !== undefined) range.gte = Math.round(minWeight);
    if (maxWeight !== undefined) range.lte = Math.round(maxWeight);
    conditions.weightGrams = range;
  }

  const disciplines = readEnumList(params, "discipline", enumValues("Discipline"));
  if (disciplines) {
    // An empty `disciplines` array means "not yet classified", not "fits
    // nothing" — the schema comment is explicit about that — so unclassified
    // parts stay visible under any discipline filter.
    anyOfGroups.push({
      OR: [
        { disciplines: { hasSome: disciplines as Discipline[] } },
        { disciplines: { isEmpty: true } },
      ],
    });
  }

  const dataSources = readEnumList(params, "dataSource", enumValues("DataSource"));
  if (dataSources) conditions.dataSource = { in: dataSources };

  const verified = readBoolean(params, "verified");
  if (verified !== undefined) {
    conditions.verifiedAt = verified ? { not: null } : null;
  }

  if (anyOfGroups.length > 0) where.AND = anyOfGroups;

  return { where, orderBy: buildOrderBy(params) };
}

function buildOrderBy(params: URLSearchParams): Prisma.PartOrderByWithRelationInput[] {
  const raw = readString(params, "sort", 40);
  const orderBy: Prisma.PartOrderByWithRelationInput[] = [];

  if (raw) {
    const descending = raw.startsWith("-");
    const key = descending ? raw.slice(1) : raw;
    const spec = SORT_COLUMNS[key];
    if (!spec) {
      // Deliberately not a 400: an unknown sort is a display preference, and
      // falling back to the default order is harmless. Filters are different
      // — those change which parts a rider is told will fit.
      orderBy.push({ brand: "asc" }, { name: "asc" });
    } else {
      const direction = descending ? "desc" : "asc";
      orderBy.push(
        (spec.nullable
          ? { [spec.column]: { sort: direction, nulls: "last" } }
          : { [spec.column]: direction }) as Prisma.PartOrderByWithRelationInput,
      );
    }
  } else {
    orderBy.push({ brand: "asc" }, { name: "asc" });
  }

  // Stable tiebreak. Without it, two parts with the same brand and name can
  // swap places between pages and one of them is never shown.
  orderBy.push({ id: "asc" });
  return orderBy;
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

/** Ceiling on an unpaginated fetch, so a lockout query can never run away. */
export const LOCKOUT_SCAN_LIMIT = 2000;

function includeDetail(category: Category): Prisma.PartInclude {
  return { [category.relation]: true } as Prisma.PartInclude;
}

export interface PartPage {
  items: PartRecord[];
  total: number;
}

export async function listParts(
  db: PrismaClient,
  category: Category,
  query: PartQuery,
  page: { limit: number; offset: number },
): Promise<PartPage> {
  const [items, total] = await Promise.all([
    db.part.findMany({
      where: query.where,
      include: includeDetail(category),
      orderBy: query.orderBy,
      take: page.limit,
      skip: page.offset,
    }),
    db.part.count({ where: query.where }),
  ]);

  return { items: items as unknown as PartRecord[], total };
}

/**
 * Fetches every part matching the filters, for server-side lockout.
 *
 * Lockout has to run before pagination: filtering page 1 of 50 would leave
 * holes in the list and a `total` that counts parts the rider can't have.
 * The catalogue is small enough (773 parts across 27 categories) that the
 * whole category fits comfortably in one query.
 */
export async function listAllParts(
  db: PrismaClient,
  category: Category,
  query: PartQuery,
): Promise<PartRecord[]> {
  const items = await db.part.findMany({
    where: query.where,
    include: includeDetail(category),
    orderBy: query.orderBy,
    take: LOCKOUT_SCAN_LIMIT,
  });
  return items as unknown as PartRecord[];
}

export interface PartWithPrices {
  part: PartRecord;
  prices: PriceRecord[];
}

export async function getPartById(
  db: PrismaClient,
  category: Category,
  id: string,
): Promise<PartWithPrices | null> {
  const row = await db.part.findFirst({
    where: { id, type: category.partType },
    include: {
      ...includeDetail(category),
      prices: {
        include: { vendor: true },
        orderBy: [{ recordedAt: "desc" }],
      },
    } as Prisma.PartInclude,
  });

  if (!row) return null;

  const record = row as unknown as PartRecord & { prices?: PriceRecord[] };
  return { part: record, prices: record.prices ?? [] };
}

/** Reads the category detail row off an included Part row. */
export function detailFor(part: PartRecord, category: Category): unknown {
  return (part as unknown as Record<string, unknown>)[category.relation];
}

/** Maps a Part row to the engine's domain object, or null if the spec row is absent. */
export function toDomainPart(part: PartRecord, category: Category): DomainPart | null {
  const detail = detailFor(part, category);
  if (detail === null || detail === undefined) return null;
  return category.toDomain(part, detail);
}

// ------------------------------------------------------------
// DTOs
// ------------------------------------------------------------

/**
 * A category's spec, flattened.
 *
 * This is literally what the engine is handed, minus the identity trio —
 * `Decimal` already converted, `AxleType` already resolved. Returning the
 * engine's own view rather than the raw row means a mismatch between what the
 * API shows and what the rules used is not possible.
 */
export type PartSpec = Record<string, string | number | boolean | null>;

export interface PartDto {
  id: string;
  category: string;
  type: PartType;
  brand: string;
  name: string;
  imageUrl: string | null;
  basePricePence: number | null;
  weightGrams: number;
  disciplines: Discipline[];
  releaseDate: string | null;
  provenance: {
    dataSource: DataSource;
    sourceUrl: string | null;
    dataNotes: string | null;
    verifiedAt: string | null;
    verifiedBy: string | null;
  };
  spec: PartSpec | null;
}

export interface PriceDto {
  id: string;
  vendor: { id: string; name: VendorName; siteUrl: string };
  pricePence: number;
  currency: Currency;
  includesVat: boolean;
  vatRatePercent: number;
  inStock: boolean;
  productUrl: string;
  recordedAt: string;
}

export interface PartDetailDto extends PartDto {
  prices: PriceDto[];
}

function toSpec(domain: DomainPart): PartSpec {
  const { partId: _partId, brand: _brand, name: _name, ...rest } = domain as DomainPart &
    Record<string, unknown>;
  void _partId;
  void _brand;
  void _name;
  return rest as PartSpec;
}

export function toPartDto(part: PartRecord, category: Category): PartDto {
  const domain = toDomainPart(part, category);
  return {
    id: part.id,
    category: category.slug,
    type: part.type,
    brand: part.brand,
    name: part.name,
    imageUrl: part.imageUrl,
    basePricePence: part.basePricePence,
    weightGrams: part.weightGrams,
    disciplines: part.disciplines,
    releaseDate: part.releaseDate ? part.releaseDate.toISOString() : null,
    provenance: {
      dataSource: part.dataSource,
      sourceUrl: part.sourceUrl,
      dataNotes: part.dataNotes,
      verifiedAt: part.verifiedAt ? part.verifiedAt.toISOString() : null,
      verifiedBy: part.verifiedBy,
    },
    spec: domain ? toSpec(domain) : null,
  };
}

export function toPriceDto(price: PriceRecord): PriceDto {
  return {
    id: price.id,
    vendor: price.vendor,
    pricePence: price.pricePence,
    currency: price.currency,
    includesVat: price.includesVat,
    vatRatePercent: price.vatRatePercent,
    inStock: price.inStock,
    productUrl: price.productUrl,
    recordedAt: price.recordedAt.toISOString(),
  };
}
