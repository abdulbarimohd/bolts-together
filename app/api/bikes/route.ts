// GET /api/bikes
//
// The factory-bike catalogue. Feeds both "buy a complete bike" and
// "I already own this one, show me upgrades that fit".
//
// Query parameters
//   q               matches brand, model, variant or slug
//   brand           repeatable / comma-separated, exact
//   discipline      repeatable / comma-separated, case-insensitive
//   minYear / maxYear, minPrice / maxPrice   (price in pence)
//   limit / offset  pagination (limit 1-200, default 50)
//   sort            brand|model|year|price|newest, prefix "-" to reverse
//
// `partCount` is returned per bike on purpose. Coverage across the catalogue
// is uneven and the UI is meant to say so — a bike with three linked parts
// cannot honestly be presented as a complete spec.
export const dynamic = "force-dynamic";

import { handle, jsonOk } from "@/lib/api/http";
import { readPagination } from "@/lib/api/query";
import { buildBikeQuery, listBikeModels, toBikeModelDto, type BikeModelDto } from "@/lib/bikes";
import { getDb } from "@/lib/db";

interface BikeListResponse {
  items: BikeModelDto[];
  total: number;
  limit: number;
  offset: number;
}

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const searchParams = new URL(request.url).searchParams;

    const page = readPagination(searchParams);
    const query = buildBikeQuery(searchParams);

    const db = getDb();
    const { items, total } = await listBikeModels(db, query, page);

    const body: BikeListResponse = {
      items: items.map(toBikeModelDto),
      total,
      limit: page.limit,
      offset: page.offset,
    };
    return jsonOk(body);
  });
}
