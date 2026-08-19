// POST /api/builds/[id]/validate
//
// Runs all 103 rules over the build and returns every warning, unfiltered.
//
// Three severities, never a boolean. `critical` means the part physically
// cannot work and is what the lockout layer hides; `warning` names a real
// problem with a stated remedy and must stay visible, because anything a
// cheap adapter fixes is a warning and never a block; `info` never blocks
// anything. Collapsing these into pass/fail is the failure mode this product
// exists to avoid, so nothing is dropped or summarised away here.
//
// `unplaced` matters as much as `warnings`. A part that could not be put in a
// slot without guessing was not checked at all, and a rider looking at an
// empty warning list deserves to know that rather than read it as "all good".
export const dynamic = "force-dynamic";

import { handle, jsonOk } from "@/lib/api/http";
import { assertUuid } from "@/lib/api/query";
import { assembleFromRecord, requireBuildRecord } from "@/lib/builds";
import {
  getCompatibilityWarnings,
  type CompatibilityWarning,
  type WarningSeverity,
} from "@/lib/compatibility/engine";
import { getDb } from "@/lib/db";
import type { AssembledBuild } from "@/lib/mappers/build";

interface ValidateResponse {
  buildId: string;
  /** True when nothing critical was found. Warnings and info do not block. */
  isBuildable: boolean;
  counts: Record<WarningSeverity, number>;
  warnings: CompatibilityWarning[];
  /** Engine slot -> part id: exactly what the rules were run against. */
  slots: Record<string, string>;
  /** Parts on the build that no slot could take, so were not checked. */
  unplaced: AssembledBuild["unplaced"];
  /** Slots with nothing in them. A partial build is validated, not rejected. */
  emptySlots: string[];
}

const ALL_SLOTS = [
  "frame", "fork", "bottomBracket", "crankset", "chainring", "wheelset",
  "frontTyre", "rearTyre", "frontTube", "rearTube", "brakeCaliper", "brakeLever",
  "frontRotor", "rearRotor", "shifter", "rearDerailleur", "frontDerailleur",
  "cassette", "chain", "headset", "rearShock", "handlebar", "stem", "seatpost",
  "seatClamp", "saddle", "pedal", "shoe", "chainGuide", "derailleurHanger",
] as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    assertUuid(id, "id");

    const db = getDb();
    const record = await requireBuildRecord(db, id);
    const assembled = assembleFromRecord(record);

    const warnings = getCompatibilityWarnings(assembled.build);

    const counts: Record<WarningSeverity, number> = { critical: 0, warning: 0, info: 0 };
    for (const warning of warnings) counts[warning.severity] += 1;

    const filled = new Set(Object.keys(assembled.assignments));

    const body: ValidateResponse = {
      buildId: record.id,
      isBuildable: counts.critical === 0,
      counts,
      warnings,
      slots: Object.fromEntries(
        Object.entries(assembled.assignments).filter(
          (entry): entry is [string, string] => Boolean(entry[1]),
        ),
      ),
      unplaced: assembled.unplaced,
      emptySlots: ALL_SLOTS.filter((slot) => !filled.has(slot)),
    };

    return jsonOk(body);
  });
}

// GET is offered as well: validating is a read, and a plain link to a
// validation result is useful. POST is the documented verb because the
// operation is expensive enough that it should not be prefetched.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return POST(request, context);
}
