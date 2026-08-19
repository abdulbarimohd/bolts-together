// lib/bikes.ts
//
// Data access for the factory-bike catalogue.
//
// A complete bike as sold is modelled as a build with every slot filled, so
// this list feeds two different sections of the site: "buy a complete bike"
// and "I already own this one, what fits it". Both need the same rows.
//
// `discipline` is a free-text column here rather than the `Discipline` enum
// used on `Part` — the catalogue holds "xc", "endurance" and "trail"
// alongside "road" and "gravel". It is filtered as text and passed through
// as stored; normalising it into three buckets in this layer would quietly
// relabel bikes.

import { readList, readNumber, readString } from "./api/query";
import type { PrismaClient } from "./generated/prisma/client";
import type { Prisma } from "./generated/prisma/client";

export interface BikeModelRecord {
  id: string;
  brand: string;
  model: string;
  year: number;
  variant: string | null;
  slug: string;
  msrpPence: number | null;
  discipline: string | null;
  createdAt: Date;
  _count?: { parts: number };
}

export interface BikeQuery {
  where: Prisma.BikeModelWhereInput;
  orderBy: Prisma.BikeModelOrderByWithRelationInput[];
}

const SORT_COLUMNS: Record<string, { column: string; nullable: boolean }> = {
  brand: { column: "brand", nullable: false },
  model: { column: "model", nullable: false },
  year: { column: "year", nullable: false },
  price: { column: "msrpPence", nullable: true },
  newest: { column: "createdAt", nullable: false },
};

export const BIKE_SORT_KEYS: readonly string[] = Object.keys(SORT_COLUMNS);

export function buildBikeQuery(params: URLSearchParams): BikeQuery {
  const where: Prisma.BikeModelWhereInput = {};

  const search = readString(params, "q", 120);
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { variant: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const brands = readList(params, "brand");
  if (brands) where.brand = { in: brands };

  const disciplines = readList(params, "discipline");
  if (disciplines) where.discipline = { in: disciplines.map((value) => value.toLowerCase()) };

  const minYear = readNumber(params, "minYear", { min: 1900, max: 2200 });
  const maxYear = readNumber(params, "maxYear", { min: 1900, max: 2200 });
  if (minYear !== undefined || maxYear !== undefined) {
    where.year = {
      ...(minYear !== undefined ? { gte: Math.round(minYear) } : {}),
      ...(maxYear !== undefined ? { lte: Math.round(maxYear) } : {}),
    };
  }

  const minPrice = readNumber(params, "minPrice", { min: 0 });
  const maxPrice = readNumber(params, "maxPrice", { min: 0 });
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.msrpPence = {
      ...(minPrice !== undefined ? { gte: Math.round(minPrice) } : {}),
      ...(maxPrice !== undefined ? { lte: Math.round(maxPrice) } : {}),
    };
  }

  return { where, orderBy: buildOrderBy(params) };
}

function buildOrderBy(params: URLSearchParams): Prisma.BikeModelOrderByWithRelationInput[] {
  const raw = readString(params, "sort", 40);
  const orderBy: Prisma.BikeModelOrderByWithRelationInput[] = [];

  const spec = raw ? SORT_COLUMNS[raw.startsWith("-") ? raw.slice(1) : raw] : undefined;
  if (raw && spec) {
    const direction = raw.startsWith("-") ? "desc" : "asc";
    orderBy.push(
      (spec.nullable
        ? { [spec.column]: { sort: direction, nulls: "last" } }
        : { [spec.column]: direction }) as Prisma.BikeModelOrderByWithRelationInput,
    );
  } else {
    orderBy.push({ brand: "asc" }, { model: "asc" }, { year: "desc" });
  }

  orderBy.push({ id: "asc" });
  return orderBy;
}

export interface BikePage {
  items: BikeModelRecord[];
  total: number;
}

export async function listBikeModels(
  db: PrismaClient,
  query: BikeQuery,
  page: { limit: number; offset: number },
): Promise<BikePage> {
  const [items, total] = await Promise.all([
    db.bikeModel.findMany({
      where: query.where,
      orderBy: query.orderBy,
      take: page.limit,
      skip: page.offset,
      include: { _count: { select: { parts: true } } },
    }),
    db.bikeModel.count({ where: query.where }),
  ]);

  return { items: items as unknown as BikeModelRecord[], total };
}

export interface BikeModelDto {
  id: string;
  brand: string;
  model: string;
  year: number;
  variant: string | null;
  slug: string;
  msrpPence: number | null;
  discipline: string | null;
  /**
   * How many parts of this bike's spec are actually recorded.
   *
   * Surfaced rather than hidden because coverage is uneven and the UI is
   * meant to say so honestly — a bike with 3 linked parts is not a bike
   * whose upgrade list can be trusted to be complete.
   */
  partCount: number;
  createdAt: string;
}

export function toBikeModelDto(row: BikeModelRecord): BikeModelDto {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    variant: row.variant,
    slug: row.slug,
    msrpPence: row.msrpPence,
    discipline: row.discipline,
    partCount: row._count?.parts ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}
