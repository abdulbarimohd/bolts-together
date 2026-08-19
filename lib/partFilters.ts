// lib/partFilters.ts
//
// Which columns of each category's detail table are exposed as query
// parameters, and how each one is parsed.
//
// Derived mechanically from `prisma/schema.prisma` — every non-relation
// scalar column of each of the 27 category tables appears exactly once. It is
// a plain data table rather than reflection because the Prisma client carries
// no runtime schema metadata on the Workers runtime, and because a data table
// is reviewable: you can read this file against the schema and see that
// nothing is missing.
//
// Parameter naming, applied uniformly:
//
//   number   ->  min<Column> / max<Column>   (a RANGE, never an exact match:
//                `?minWeightGrams=200&maxWeightGrams=400`. Exact-match numeric
//                filters were near-useless in the predecessor — nobody knows
//                the exact axle-to-crown of the fork they want.)
//   enum     ->  <column>=A,B                (repeatable or comma-separated;
//                any unrecognised value is a 400, never silently ignored)
//   boolean  ->  <column>=true|false
//   text     ->  <column>=value              (case-insensitive exact match)
//
// The `min`/`max` prefix is applied even when the column itself starts with
// "max", so `?minMaxTyreWidthMm=45` reads as "frames that clear at least
// 45mm". Clunky, but predictable — and predictable is what a generated client
// or another agent can rely on.

import * as PrismaEnums from "./generated/prisma/enums";

export type ColumnFilter =
  | { kind: "number"; column: string }
  | { kind: "boolean"; column: string }
  | { kind: "text"; column: string }
  | { kind: "enum"; column: string; enumName: keyof typeof PrismaEnums };

/** Runtime lookup of an enum's permitted values, by schema enum name. */
export function enumValues(enumName: string): readonly string[] {
  const table = (PrismaEnums as unknown as Record<string, Record<string, string>>)[enumName];
  if (!table) throw new Error(`enumValues: no generated enum named "${enumName}"`);
  return Object.values(table);
}

/** Detail-table filters, keyed by Prisma model name. */
export const DETAIL_FILTERS: Record<string, readonly ColumnFilter[]> = {
  Frame: [
    { kind: "enum", column: "material", enumName: "FrameMaterial" },
    { kind: "enum", column: "bbShellStandard", enumName: "BbShellStandard" },
    { kind: "number", column: "bbShellWidthMm" },
    { kind: "enum", column: "rearAxleType", enumName: "AxleType" },
    { kind: "enum", column: "rearAxleThreadPitch", enumName: "AxleThreadPitch" },
    { kind: "number", column: "rearAxleLengthMm" },
    { kind: "enum", column: "dropoutType", enumName: "DropoutType" },
    { kind: "enum", column: "headsetTaper", enumName: "HeadsetTaper" },
    { kind: "enum", column: "headTubeUpperStandard", enumName: "HeadsetCupStandard" },
    { kind: "enum", column: "headTubeLowerStandard", enumName: "HeadsetCupStandard" },
    { kind: "number", column: "headTubeLengthMm" },
    { kind: "enum", column: "rearBrakeMountType", enumName: "BrakeMountType" },
    { kind: "number", column: "maxRotorMmRear" },
    { kind: "enum", column: "wheelDiameter", enumName: "WheelDiameter" },
    { kind: "boolean", column: "mulletApproved" },
    { kind: "number", column: "maxTyreWidthMm" },
    { kind: "number", column: "maxTyreWidthMm650b" },
    { kind: "number", column: "maxChainringTeeth" },
    { kind: "number", column: "maxForkTravelMm" },
    { kind: "number", column: "designAxleToCrownMm" },
    { kind: "number", column: "chainstayLengthMm" },
    { kind: "enum", column: "hangerStandard", enumName: "HangerStandard" },
    { kind: "number", column: "seatpostDiameterMm" },
    { kind: "number", column: "seatClampDiameterMm" },
    { kind: "number", column: "maxSeatpostInsertionMm" },
    { kind: "enum", column: "seatpostRouting", enumName: "RoutingType" },
    { kind: "enum", column: "cableRouting", enumName: "RoutingType" },
    { kind: "enum", column: "iscgStandard", enumName: "IscgStandard" },
    { kind: "number", column: "bottleMounts" },
    { kind: "boolean", column: "hasEyelets" },
    { kind: "enum", column: "fdMountType", enumName: "FdMountType" },
    { kind: "enum", column: "fdPullDirection", enumName: "PullDirection" },
    { kind: "number", column: "shockEyeToEyeMm" },
    { kind: "number", column: "shockStrokeMm" },
    { kind: "enum", column: "shockMountType", enumName: "ShockMountType" },
    { kind: "number", column: "shockHardwareWidthMm" },
    { kind: "number", column: "shockBushingDiameterMm" },
    { kind: "number", column: "leverageRatio" },
    { kind: "boolean", column: "suitableForCoil" },
    { kind: "text", column: "frameSize" },
    { kind: "number", column: "standoverMm" },
    { kind: "number", column: "reachMm" },
    { kind: "number", column: "stackMm" },
    { kind: "number", column: "riderMinHeightCm" },
    { kind: "number", column: "riderMaxHeightCm" },
  ],
  Fork: [
    { kind: "enum", column: "steererTubeTaper", enumName: "HeadsetTaper" },
    { kind: "number", column: "steererLengthMm" },
    { kind: "number", column: "crownRaceDiameterMm" },
    { kind: "enum", column: "frontAxleType", enumName: "AxleType" },
    { kind: "enum", column: "frontAxleThreadPitch", enumName: "AxleThreadPitch" },
    { kind: "number", column: "frontAxleLengthMm" },
    { kind: "enum", column: "dropoutType", enumName: "DropoutType" },
    { kind: "enum", column: "brakeMountType", enumName: "BrakeMountType" },
    { kind: "number", column: "maxRotorMm" },
    { kind: "enum", column: "wheelDiameter", enumName: "WheelDiameter" },
    { kind: "number", column: "maxTyreWidthMm" },
    { kind: "number", column: "maxTyreWidthMm650b" },
    { kind: "number", column: "travelMm" },
    { kind: "number", column: "axleToCrownMm" },
    { kind: "number", column: "offsetMm" },
    { kind: "boolean", column: "isSuspension" },
  ],
  BottomBracket: [
    { kind: "enum", column: "frameInterface", enumName: "BbShellStandard" },
    { kind: "number", column: "shellWidthMm" },
    { kind: "enum", column: "spindleInterface", enumName: "SpindleInterface" },
  ],
  Crankset: [
    { kind: "enum", column: "spindleDiameter", enumName: "SpindleInterface" },
    { kind: "text", column: "chainlineType" },
    { kind: "number", column: "chainlineMm" },
    { kind: "number", column: "spindleLengthMm" },
    { kind: "number", column: "qFactorMm" },
    { kind: "number", column: "crankLengthMm" },
    { kind: "enum", column: "pedalThread", enumName: "PedalThread" },
    { kind: "enum", column: "chainringMount", enumName: "ChainringMountStandard" },
    { kind: "number", column: "chainringCount" },
    { kind: "number", column: "maxChainringTeeth" },
  ],
  Chainring: [
    { kind: "enum", column: "mountStandard", enumName: "ChainringMountStandard" },
    { kind: "number", column: "boltCount" },
    { kind: "number", column: "teeth" },
    { kind: "boolean", column: "narrowWide" },
    { kind: "number", column: "offsetMm" },
    { kind: "number", column: "speeds" },
  ],
  Wheelset: [
    { kind: "enum", column: "wheelDiameter", enumName: "WheelDiameter" },
    { kind: "enum", column: "frontAxleType", enumName: "AxleType" },
    { kind: "enum", column: "rearAxleType", enumName: "AxleType" },
    { kind: "enum", column: "freehubBodyType", enumName: "FreehubBodyType" },
    { kind: "enum", column: "rotorMountStandard", enumName: "RotorMountStandard" },
    { kind: "boolean", column: "tubelessReady" },
    { kind: "boolean", column: "hookless" },
    { kind: "number", column: "maxPressurePsi" },
    { kind: "number", column: "internalRimWidthMm" },
    { kind: "number", column: "rimDepthMm" },
    { kind: "enum", column: "valveHoleType", enumName: "ValveType" },
    { kind: "boolean", column: "hasBrakeTrack" },
    { kind: "boolean", column: "convertibleEndCaps" },
  ],
  Tyre: [
    { kind: "enum", column: "wheelDiameter", enumName: "WheelDiameter" },
    { kind: "number", column: "widthMm" },
    { kind: "boolean", column: "tubeless" },
    { kind: "boolean", column: "hooklessSafe" },
    { kind: "number", column: "maxPressurePsi" },
  ],
  Tube: [
    { kind: "enum", column: "wheelDiameter", enumName: "WheelDiameter" },
    { kind: "number", column: "minWidthMm" },
    { kind: "number", column: "maxWidthMm" },
    { kind: "enum", column: "valveType", enumName: "ValveType" },
    { kind: "number", column: "valveLengthMm" },
  ],
  BrakeCaliper: [
    { kind: "enum", column: "mountType", enumName: "BrakeMountType" },
    { kind: "number", column: "nativeRotorMm" },
    { kind: "boolean", column: "isHydraulic" },
    { kind: "enum", column: "fluidType", enumName: "BrakeFluidType" },
    { kind: "text", column: "brakeSystemFamily" },
    { kind: "text", column: "padShape" },
    { kind: "number", column: "minRotorThicknessMm" },
    { kind: "number", column: "maxRotorThicknessMm" },
  ],
  BrakeLever: [
    { kind: "boolean", column: "isHydraulic" },
    { kind: "enum", column: "fluidType", enumName: "BrakeFluidType" },
    { kind: "text", column: "brakeSystemFamily" },
    { kind: "enum", column: "barType", enumName: "BarType" },
    { kind: "number", column: "clampDiameterMm" },
    { kind: "boolean", column: "requiresCompressionless" },
  ],
  Rotor: [
    { kind: "number", column: "diameterMm" },
    { kind: "enum", column: "mountStandard", enumName: "RotorMountStandard" },
    { kind: "enum", column: "lockringType", enumName: "LockringType" },
    { kind: "number", column: "thicknessMm" },
  ],
  Shifter: [
    { kind: "number", column: "speeds" },
    { kind: "enum", column: "cablePullStandard", enumName: "CablePullStandard" },
    { kind: "enum", column: "barType", enumName: "BarType" },
    { kind: "number", column: "clampDiameterMm" },
  ],
  RearDerailleur: [
    { kind: "number", column: "maxSpeeds" },
    { kind: "enum", column: "cablePullStandard", enumName: "CablePullStandard" },
    { kind: "number", column: "maxCassetteCogTeeth" },
    { kind: "number", column: "minCassetteCogTeeth" },
    { kind: "number", column: "totalCapacityTeeth" },
    { kind: "enum", column: "cageLength", enumName: "CageLength" },
    { kind: "enum", column: "mountStandard", enumName: "DerailleurMountStandard" },
  ],
  FrontDerailleur: [
    { kind: "number", column: "speeds" },
    { kind: "enum", column: "cablePullStandard", enumName: "CablePullStandard" },
    { kind: "enum", column: "mountType", enumName: "FdMountType" },
    { kind: "enum", column: "pullDirection", enumName: "PullDirection" },
    { kind: "number", column: "maxChainringTeeth" },
  ],
  Cassette: [
    { kind: "number", column: "speeds" },
    { kind: "enum", column: "freehubBodyType", enumName: "FreehubBodyType" },
    { kind: "number", column: "smallestCogTeeth" },
    { kind: "number", column: "largestCogTeeth" },
    { kind: "number", column: "requiresSpacerMm" },
  ],
  Chain: [
    { kind: "number", column: "speedsMin" },
    { kind: "number", column: "speedsMax" },
    { kind: "enum", column: "chainStandard", enumName: "ChainStandard" },
    { kind: "number", column: "links" },
  ],
  Headset: [
    { kind: "enum", column: "upperStandard", enumName: "HeadsetCupStandard" },
    { kind: "enum", column: "lowerStandard", enumName: "HeadsetCupStandard" },
    { kind: "number", column: "crownRaceDiameterMm" },
    { kind: "number", column: "stackHeightMm" },
  ],
  RearShock: [
    { kind: "number", column: "eyeToEyeMm" },
    { kind: "number", column: "strokeMm" },
    { kind: "enum", column: "mountType", enumName: "ShockMountType" },
    { kind: "number", column: "hardwareWidthMm" },
    { kind: "number", column: "bushingDiameterMm" },
    { kind: "enum", column: "sizing", enumName: "ShockSizing" },
    { kind: "boolean", column: "isCoil" },
    { kind: "number", column: "springRate" },
    { kind: "boolean", column: "hasReservoir" },
  ],
  Handlebar: [
    { kind: "number", column: "clampDiameterMm" },
    { kind: "number", column: "controlClampDiameterMm" },
    { kind: "enum", column: "barType", enumName: "BarType" },
    { kind: "number", column: "widthMm" },
    { kind: "number", column: "riseMm" },
    { kind: "boolean", column: "internalRouting" },
  ],
  Stem: [
    { kind: "number", column: "barClampDiameterMm" },
    { kind: "number", column: "steererClampMm" },
    { kind: "number", column: "lengthMm" },
    { kind: "number", column: "riseDegrees" },
    { kind: "boolean", column: "integratedCockpit" },
  ],
  Seatpost: [
    { kind: "number", column: "diameterMm" },
    { kind: "number", column: "totalLengthMm" },
    { kind: "boolean", column: "isDropper" },
    { kind: "number", column: "travelMm" },
    { kind: "enum", column: "routingType", enumName: "RoutingType" },
    { kind: "enum", column: "remoteType", enumName: "DropperRemoteType" },
    { kind: "enum", column: "railClampType", enumName: "SaddleRailType" },
    { kind: "number", column: "setbackMm" },
  ],
  SeatClamp: [
    { kind: "number", column: "diameterMm" },
  ],
  Saddle: [
    { kind: "enum", column: "railType", enumName: "SaddleRailType" },
    { kind: "number", column: "widthMm" },
  ],
  Pedal: [
    { kind: "enum", column: "thread", enumName: "PedalThread" },
    { kind: "enum", column: "cleatSystem", enumName: "CleatSystem" },
  ],
  Shoe: [
    { kind: "enum", column: "soleDrilling", enumName: "SoleDrilling" },
  ],
  ChainGuide: [
    { kind: "enum", column: "mountStandard", enumName: "IscgStandard" },
    { kind: "number", column: "maxChainringTeeth" },
    { kind: "number", column: "minChainringTeeth" },
  ],
  DerailleurHanger: [
    { kind: "enum", column: "hangerStandard", enumName: "HangerStandard" },
    { kind: "text", column: "model" },
  ],
};
