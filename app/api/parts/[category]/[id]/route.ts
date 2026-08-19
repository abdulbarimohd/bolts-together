// GET /api/parts/[category]/[id]
//
// One part, with its full spec, its provenance, and every recorded price with
// the vendor attached.
//
// The category is part of the path rather than inferred from the id so a
// wrong-category request is a clean 404 instead of a part rendered against
// the wrong spec table.
export const dynamic = "force-dynamic";

import { ApiError, handle, jsonOk, notFound } from "@/lib/api/http";
import { assertUuid } from "@/lib/api/query";
import { CATEGORY_SLUGS, findCategory } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { getPartById, toPartDto, toPriceDto, type PartDetailDto } from "@/lib/parts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string; id: string }> },
): Promise<Response> {
  return handle(async () => {
    const { category: slug, id } = await params;

    const category = findCategory(slug);
    if (!category) {
      throw new ApiError(404, "unknown_category", `No part category called "${slug}".`, {
        categories: CATEGORY_SLUGS,
      });
    }

    assertUuid(id, "id");

    const db = getDb();
    const found = await getPartById(db, category, id);
    if (!found) {
      throw notFound(`No ${category.label.toLowerCase()} with that id.`, {
        category: category.slug,
        partId: id,
      });
    }

    const body: PartDetailDto = {
      ...toPartDto(found.part, category),
      // Newest first, as ordered by the query. Prices are a history, not a
      // single current figure — the affiliate layer appends rather than
      // overwrites, so the head of this list is the latest observation.
      prices: found.prices.map(toPriceDto),
    };

    return jsonOk(body);
  });
}
