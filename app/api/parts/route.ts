// GET /api/parts
//
// The category index: what `/api/parts/<slug>` accepts, and which filters
// each category exposes. Written for the UI and for anyone generating a
// client — it means the filter list does not have to be duplicated by hand
// in a second place and drift.
//
// No database access, but still force-dynamic: the enum value lists are read
// from the generated Prisma client, and pinning this at build time would
// freeze them against whatever the schema looked like then.
export const dynamic = "force-dynamic";

import { handle, jsonOk } from "@/lib/api/http";
import { CATEGORIES } from "@/lib/categories";
import { enumValues } from "@/lib/partFilters";
import { maxParam, minParam, SORT_KEYS } from "@/lib/parts";

interface FilterDoc {
  parameter: string | { min: string; max: string };
  kind: "number" | "boolean" | "enum" | "text";
  column: string;
  values?: readonly string[];
}

interface CategoryDoc {
  slug: string;
  label: string;
  partType: string;
  slots: readonly string[];
  /** True where the bike carries a front and a rear one. */
  paired: boolean;
  /** Slots a new part may be written into. Empty means "no slot". */
  acceptedSlots: readonly string[];
  slotRequired: boolean;
  /** False for frames, the one category with no lockout layer. */
  supportsLockout: boolean;
  filters: FilterDoc[];
}

export async function GET(): Promise<Response> {
  return handle(async () => {
    const categories: CategoryDoc[] = CATEGORIES.map((category) => ({
      slug: category.slug,
      label: category.label,
      partType: category.partType as string,
      slots: category.slots as readonly string[],
      paired: category.paired,
      acceptedSlots: category.acceptedSlots as readonly string[],
      slotRequired: category.slotRequired,
      supportsLockout: category.lockout !== null,
      filters: category.filters.map((filter): FilterDoc => {
        if (filter.kind === "number") {
          return {
            kind: "number",
            column: filter.column,
            parameter: { min: minParam(filter.column), max: maxParam(filter.column) },
          };
        }
        if (filter.kind === "enum") {
          return {
            kind: "enum",
            column: filter.column,
            parameter: filter.column,
            values: enumValues(filter.enumName),
          };
        }
        return { kind: filter.kind, column: filter.column, parameter: filter.column };
      }),
    }));

    return jsonOk({
      categories,
      /** Filters accepted by every category, on the shared Part table. */
      commonFilters: [
        { parameter: "q", kind: "text", column: "brand + name" },
        { parameter: "brand", kind: "text", column: "brand" },
        { parameter: { min: "minPrice", max: "maxPrice" }, kind: "number", column: "basePricePence" },
        { parameter: { min: "minWeight", max: "maxWeight" }, kind: "number", column: "weightGrams" },
        { parameter: "discipline", kind: "enum", column: "disciplines", values: enumValues("Discipline") },
        { parameter: "dataSource", kind: "enum", column: "dataSource", values: enumValues("DataSource") },
        { parameter: "verified", kind: "boolean", column: "verifiedAt" },
      ],
      sortKeys: SORT_KEYS,
      pagination: { limitParam: "limit", offsetParam: "offset", defaultLimit: 50, maxLimit: 200 },
    });
  });
}
