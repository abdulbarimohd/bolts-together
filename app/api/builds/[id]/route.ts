// GET  /api/builds/[id]  — read a build
// PATCH /api/builds/[id] — rename it, set rider measurements, add or remove parts
//
// No auth check. The build id is the access token: it is a uuid, it is not
// enumerable, and an anonymous build has no owner to check against. Adding a
// login gate here would break the anonymous-first flow the whole product is
// built around. When accounts land, the check belongs on builds that have a
// `userId`, not on these routes wholesale.
//
// PATCH body (every field optional):
//   name, isPublic
//   riderHeightCm / riderInseamCm / riderWeightKg  (null clears, absent leaves alone)
//   add     [{ partId, slot?, quantity? }]  — fills a slot, replacing any occupant
//   remove  [{ partId? | category?, slot? }] — omit slot to clear every slot
//
// Add replaces rather than stacks. Two parts in one slot is the state the
// compatibility engine cannot resolve, so it is not a state this API can
// produce.
export const dynamic = "force-dynamic";

import { handle, jsonOk, readJsonObject } from "@/lib/api/http";
import { assertUuid, bodyArray, bodyBoolean, bodyNullableInt, bodyString } from "@/lib/api/query";
import {
  assembleFromRecord,
  readRemoveTargets,
  requireBuildRecord,
  resolvePartInputs,
  toBuildDto,
  updateBuild,
  RIDER_BOUNDS,
  type BuildDto,
} from "@/lib/builds";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    assertUuid(id, "id");

    const db = getDb();
    const build = await requireBuildRecord(db, id);
    const dto: BuildDto = toBuildDto(build, assembleFromRecord(build));
    return jsonOk(dto);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    assertUuid(id, "id");

    const body = await readJsonObject(request);
    const db = getDb();

    // 404 before doing any validation work, so a bad id doesn't come back as
    // a confusing complaint about the payload.
    await requireBuildRecord(db, id);

    const additions = bodyArray(body, "add", 60);
    const removals = bodyArray(body, "remove", 60);

    const updated = await updateBuild(db, id, {
      name: bodyString(body, "name", { maxLength: 120 }),
      isPublic: bodyBoolean(body, "isPublic"),
      riderHeightCm: bodyNullableInt(body, "riderHeightCm", RIDER_BOUNDS.heightCm),
      riderInseamCm: bodyNullableInt(body, "riderInseamCm", RIDER_BOUNDS.inseamCm),
      riderWeightKg: bodyNullableInt(body, "riderWeightKg", RIDER_BOUNDS.weightKg),
      add: additions ? await resolvePartInputs(db, additions, "add") : undefined,
      remove: removals ? readRemoveTargets(removals) : undefined,
    });

    const dto: BuildDto = toBuildDto(updated, assembleFromRecord(updated));
    return jsonOk(dto);
  });
}
