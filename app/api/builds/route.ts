// POST /api/builds
//
// Creates a build. Anonymous is the default and the only mode this route
// offers: `Build.userId` stays null, no session is required, no cookie is
// set. The returned uuid is the access token — whoever holds it can read and
// edit the build, the same trust model as a guest shopping cart. That is a
// deliberate product decision (PLAN.md, Phase 1): "sign in to find out
// whether your parts fit" was the single biggest conversion failure in the
// predecessor.
//
// Body (every field optional):
//   name            string
//   isPublic        boolean
//   riderHeightCm / riderInseamCm / riderWeightKg
//                   whole numbers or null; only the advisory fit rules read them
//   basedOnModelId  clone a factory bike's part list, slots preserved as stored
//   parts           [{ partId, slot?, quantity? }]
//
// A part whose category comes in front/rear pairs (tyres, tubes, rotors) must
// name its slot. Front and rear are checked against different parts of the
// bike, so placing one without being told which end is a guess.
export const dynamic = "force-dynamic";

import { handle, jsonOk, readJsonObject } from "@/lib/api/http";
import { bodyArray, bodyBoolean, bodyNullableInt, bodyString } from "@/lib/api/query";
import {
  assembleFromRecord,
  createBuild,
  resolvePartInputs,
  toBuildDto,
  RIDER_BOUNDS,
  type BuildDto,
} from "@/lib/builds";
import { getDb } from "@/lib/db";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const body = await readJsonObject(request);

    const parts = bodyArray(body, "parts", 60) ?? [];
    const basedOnModelId = bodyString(body, "basedOnModelId", { maxLength: 64 });

    const db = getDb();
    const resolved = await resolvePartInputs(db, parts, "parts");

    const build = await createBuild(db, {
      name: bodyString(body, "name", { maxLength: 120 }),
      isPublic: bodyBoolean(body, "isPublic"),
      riderHeightCm: bodyNullableInt(body, "riderHeightCm", RIDER_BOUNDS.heightCm) ?? null,
      riderInseamCm: bodyNullableInt(body, "riderInseamCm", RIDER_BOUNDS.inseamCm) ?? null,
      riderWeightKg: bodyNullableInt(body, "riderWeightKg", RIDER_BOUNDS.weightKg) ?? null,
      basedOnModelId: basedOnModelId ?? null,
      parts: resolved,
    });

    const dto: BuildDto = toBuildDto(build, assembleFromRecord(build));
    return jsonOk(dto, 201);
  });
}
