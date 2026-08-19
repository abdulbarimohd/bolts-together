// GET /api/parts/[category]
//
// The list behind every dropdown in the builder.
//
// The parameter that matters is `?compatibleWith=<buildId>`. With it, the
// list is narrowed by the engine's own lockout layer before it is paginated,
// so a part that physically cannot fit is not on page 3 either — it is not in
// the result at all, and `total` reflects that. This is the "true lockout"
// promise, enforced on the server so it holds no matter what the client does.
//
// Query parameters
//   compatibleWith  build id; applies server-side lockout
//   slot            front|rear, for categories the bike carries two of
//   limit / offset  pagination (limit 1-200, default 50)
//   sort            brand|name|price|weight|newest, prefix "-" to reverse
//   q               matches brand or name
//   brand           repeatable / comma-separated, exact
//   minPrice / maxPrice, minWeight / maxWeight
//   discipline, dataSource, verified
//   min<Column> / max<Column>, <enumColumn>, <boolColumn>, <textColumn>
//     for every column of this category's spec table — see lib/partFilters.ts
//
// force-dynamic because this route reads the database. Without it Next tries
// to evaluate it during `next build`, where there is no DATABASE_URL and no
// Worker runtime, and the build fails for reasons unrelated to the route.
export const dynamic = "force-dynamic";

import { ApiError, handle, jsonOk, notFound } from "@/lib/api/http";
import { assertUuid, readPagination, readString } from "@/lib/api/query";
import {
  CATEGORY_SLUGS,
  findCategory,
  slotForEnd,
  type Category,
  type SlotEnd,
} from "@/lib/categories";
import { assembleFromRecord, getBuildRecord } from "@/lib/builds";
import { getDb } from "@/lib/db";
import {
  buildPartQuery,
  listAllParts,
  listParts,
  toDomainPart,
  toPartDto,
  LOCKOUT_SCAN_LIMIT,
  type PartDto,
  type PartRecord,
} from "@/lib/parts";
import type { BikeBuild } from "@/lib/types/parts";

interface LockoutMeta {
  buildId: string;
  /** False only for frames, which have no filter layer to apply. */
  applied: boolean;
  /** The build slot the question was asked about. */
  slot: string;
  /** Candidates considered before lockout. */
  considered: number;
  /** Candidates removed because they would produce a critical warning. */
  excluded: number;
  /** True if the candidate scan hit its ceiling and may be incomplete. */
  truncated: boolean;
}

interface PartListResponse {
  category: { slug: string; label: string; partType: string; slots: readonly string[] };
  items: PartDto[];
  total: number;
  limit: number;
  offset: number;
  lockout: LockoutMeta | null;
}

/**
 * Which end of the bike the question is about.
 *
 * Only meaningful for tyres, tubes and rotors, where front and rear are
 * checked against different parts (fork vs rear triangle). Defaults to rear
 * because that is the tighter constraint on essentially every frame; the
 * caller should pass it explicitly when it knows.
 */
function readEnd(params: URLSearchParams): SlotEnd {
  const raw = readString(params, "slot", 16) ?? readString(params, "end", 16);
  if (raw === undefined) return "rear";
  const value = raw.toLowerCase();
  if (value === "front" || value === "rear") return value;
  throw new ApiError(400, "invalid_query", "`slot` must be front or rear.", { received: raw });
}

function describe(category: Category) {
  return {
    slug: category.slug,
    label: category.label,
    partType: category.partType as string,
    slots: category.slots as readonly string[],
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> },
): Promise<Response> {
  return handle(async () => {
    const { category: slug } = await params;
    const category = findCategory(slug);
    if (!category) {
      throw new ApiError(404, "unknown_category", `No part category called "${slug}".`, {
        categories: CATEGORY_SLUGS,
      });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = readPagination(searchParams);
    const query = buildPartQuery(category, searchParams);
    const db = getDb();

    const compatibleWith = readString(searchParams, "compatibleWith", 64);

    if (compatibleWith === undefined) {
      const { items, total } = await listParts(db, category, query, page);
      const body: PartListResponse = {
        category: describe(category),
        items: items.map((item) => toPartDto(item, category)),
        total,
        limit: page.limit,
        offset: page.offset,
        lockout: null,
      };
      return jsonOk(body);
    }

    assertUuid(compatibleWith, "compatibleWith");
    const buildRecord = await getBuildRecord(db, compatibleWith);
    if (!buildRecord) throw notFound("No build with that id.", { buildId: compatibleWith });

    const end = readEnd(searchParams);
    const targetSlot = slotForEnd(category, end);
    const assembled = assembleFromRecord(buildRecord);

    // Empty the slot being asked about. The question is "what could go here",
    // not "what agrees with what is already here" — leaving the current
    // occupant in place would make some rules compare a candidate against
    // itself, and would hide every alternative on a fully-specced build.
    const context: BikeBuild = { ...assembled.build };
    delete (context as Record<string, unknown>)[targetSlot];

    const rows = await listAllParts(db, category, query);

    const rowByPartId = new Map<string, PartRecord>();
    const candidates = [];
    for (const row of rows) {
      const domain = toDomainPart(row, category);
      if (!domain) continue;
      rowByPartId.set(domain.partId, row);
      candidates.push(domain);
    }

    // Frames are the one category with no filter layer: a frame is the root
    // of a build, so there is nothing already chosen to narrow it against.
    // The list comes back whole and `applied: false` says so rather than
    // implying a lockout ran.
    const allowed = category.lockout
      ? category.lockout(context, candidates, end)
      : candidates;

    const pageItems = allowed
      .slice(page.offset, page.offset + page.limit)
      .map((domain) => toPartDto(rowByPartId.get(domain.partId)!, category));

    const body: PartListResponse = {
      category: describe(category),
      items: pageItems,
      total: allowed.length,
      limit: page.limit,
      offset: page.offset,
      lockout: {
        buildId: buildRecord.id,
        applied: category.lockout !== null,
        slot: targetSlot,
        considered: candidates.length,
        excluded: candidates.length - allowed.length,
        truncated: rows.length >= LOCKOUT_SCAN_LIMIT,
      },
    };
    return jsonOk(body);
  });
}
