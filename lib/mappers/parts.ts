// lib/mappers/parts.ts
//
// Prisma row -> engine domain object, one function per part category.
//
// Why this layer exists at all: the compatibility engine is deliberately
// decoupled from Prisma. It types against `lib/types/parts.ts`, never the
// generated client, so the 128 tests can run with no database. That
// decoupling is worth keeping, but it means something has to join the two
// worlds, and that something has to be exact — a field dropped here does not
// produce an error, it produces a rule that quietly abstains, and a rider
// gets shown a part that does not fit.
//
// Three rules govern every mapper below.
//
// 1. NULL IS NOT A DEFAULT. The engine reads `null`/`undefined` as "this spec
//    was never published" and stays quiet. Every nullable column is therefore
//    copied through untouched — no `?? 0`, no `?? false`, no `??` at all.
//    `lib/compatibility` has a documented history of `??` defaulting causing
//    false verdicts (ENGINE_SPEC §7); this file must not reintroduce it.
//
// 2. EVERY FIELD, EVERY TIME. Each mapper returns `Required<T>` rather than
//    `T`. `Required` strips the `?` from the engine interface, so omitting an
//    optional field is a compile error instead of a silent `undefined`. This
//    is the single guard that stops a schema addition from being half-wired.
//
// 3. NO RESHAPING. Column names in `prisma/schema.prisma` and field names in
//    `lib/types/parts.ts` are identical across all 27 categories (verified
//    field-by-field). Where a mapper looks like a copy, it is one, and it
//    should stay one — any renaming belongs in the schema, not here.
//
// The only genuine type disagreements are `Decimal` columns and the
// `AxleType` enum; both are handled in ./scalars.ts, which explains each.

import type {
  BottomBracketModel,
  BrakeCaliperModel,
  BrakeLeverModel,
  CassetteModel,
  ChainGuideModel,
  ChainModel,
  ChainringModel,
  CranksetModel,
  DerailleurHangerModel,
  ForkModel,
  FrameModel,
  FrontDerailleurModel,
  HandlebarModel,
  HeadsetModel,
  PedalModel,
  RearDerailleurModel,
  RearShockModel,
  RotorModel,
  SaddleModel,
  SeatClampModel,
  SeatpostModel,
  ShifterModel,
  ShoeModel,
  StemModel,
  TubeModel,
  TyreModel,
  WheelsetModel,
} from "../generated/prisma/models";

import type {
  BottomBracket,
  BrakeCaliper,
  BrakeLever,
  Cassette,
  Chain,
  ChainGuide,
  Chainring,
  Crankset,
  DerailleurHanger,
  Fork,
  Frame,
  FrontDerailleur,
  Handlebar,
  Headset,
  Pedal,
  RearDerailleur,
  RearShock,
  Rotor,
  Saddle,
  SeatClamp,
  Seatpost,
  Shifter,
  Shoe,
  Stem,
  Tube,
  Tyre,
  Wheelset,
} from "../types/parts";

import { decimalToNumber, toEngineAxleType, type PartIdentityRow } from "./scalars";

/** The identity trio every category object carries, taken from the Part row. */
function identity(part: PartIdentityRow): { partId: string; brand: string; name: string } {
  return { partId: part.id, brand: part.brand, name: part.name };
}

// ------------------------------------------------------------
// §1 Frame & fork
// ------------------------------------------------------------

export function mapFrame(part: PartIdentityRow, row: FrameModel): Required<Frame> {
  return {
    ...identity(part),
    material: row.material,
    bbShellStandard: row.bbShellStandard,
    // Decimal, not Int: a T47 internal shell is genuinely 85.5mm.
    bbShellWidthMm: decimalToNumber(row.bbShellWidthMm),
    rearAxleType: toEngineAxleType(row.rearAxleType),
    rearAxleThreadPitch: row.rearAxleThreadPitch,
    rearAxleLengthMm: row.rearAxleLengthMm,
    dropoutType: row.dropoutType,
    headsetTaper: row.headsetTaper,
    headTubeUpperStandard: row.headTubeUpperStandard,
    headTubeLowerStandard: row.headTubeLowerStandard,
    headTubeLengthMm: row.headTubeLengthMm,
    rearBrakeMountType: row.rearBrakeMountType,
    maxRotorMmRear: row.maxRotorMmRear,
    wheelDiameter: row.wheelDiameter,
    mulletApproved: row.mulletApproved,
    maxTyreWidthMm: row.maxTyreWidthMm,
    maxTyreWidthMm650b: row.maxTyreWidthMm650b,
    maxChainringTeeth: row.maxChainringTeeth,
    maxForkTravelMm: row.maxForkTravelMm,
    designAxleToCrownMm: row.designAxleToCrownMm,
    chainstayLengthMm: row.chainstayLengthMm,
    hangerStandard: row.hangerStandard,
    seatpostDiameterMm: row.seatpostDiameterMm,
    seatClampDiameterMm: row.seatClampDiameterMm,
    maxSeatpostInsertionMm: row.maxSeatpostInsertionMm,
    seatpostRouting: row.seatpostRouting,
    cableRouting: row.cableRouting,
    iscgStandard: row.iscgStandard,
    bottleMounts: row.bottleMounts,
    hasEyelets: row.hasEyelets,
    fdMountType: row.fdMountType,
    fdPullDirection: row.fdPullDirection,
    // Decimal, not Int: R-SHK-01 compares these exactly with no tolerance, and
    // real strokes include half-millimetres (210x47.5, 210x52.5, 230x57.5).
    // As Int they were silently truncated, which would block a frame's own
    // correct shock and match nothing at all.
    shockEyeToEyeMm: decimalToNumber(row.shockEyeToEyeMm),
    shockStrokeMm: decimalToNumber(row.shockStrokeMm),
    shockMountType: row.shockMountType,
    shockHardwareWidthMm: row.shockHardwareWidthMm,
    shockBushingDiameterMm: row.shockBushingDiameterMm,
    leverageRatio: row.leverageRatio,
    suitableForCoil: row.suitableForCoil,
    frameSize: row.frameSize,
    standoverMm: row.standoverMm,
    reachMm: row.reachMm,
    stackMm: row.stackMm,
    riderMinHeightCm: row.riderMinHeightCm,
    riderMaxHeightCm: row.riderMaxHeightCm,
  };
}

export function mapFork(part: PartIdentityRow, row: ForkModel): Required<Fork> {
  return {
    ...identity(part),
    steererTubeTaper: row.steererTubeTaper,
    steererLengthMm: row.steererLengthMm,
    crownRaceDiameterMm: row.crownRaceDiameterMm,
    frontAxleType: toEngineAxleType(row.frontAxleType),
    frontAxleThreadPitch: row.frontAxleThreadPitch,
    frontAxleLengthMm: row.frontAxleLengthMm,
    dropoutType: row.dropoutType,
    brakeMountType: row.brakeMountType,
    maxRotorMm: row.maxRotorMm,
    wheelDiameter: row.wheelDiameter,
    maxTyreWidthMm: row.maxTyreWidthMm,
    maxTyreWidthMm650b: row.maxTyreWidthMm650b,
    travelMm: row.travelMm,
    axleToCrownMm: row.axleToCrownMm,
    offsetMm: row.offsetMm,
    isSuspension: row.isSuspension,
  };
}

// ------------------------------------------------------------
// §2 Bottom bracket, crankset, chainring
// ------------------------------------------------------------

export function mapBottomBracket(
  part: PartIdentityRow,
  row: BottomBracketModel,
): Required<BottomBracket> {
  return {
    ...identity(part),
    frameInterface: row.frameInterface,
    shellWidthMm: decimalToNumber(row.shellWidthMm),
    spindleInterface: row.spindleInterface,
  };
}

export function mapCrankset(part: PartIdentityRow, row: CranksetModel): Required<Crankset> {
  return {
    ...identity(part),
    spindleDiameter: row.spindleDiameter,
    chainlineType: row.chainlineType,
    chainlineMm: row.chainlineMm,
    spindleLengthMm: row.spindleLengthMm,
    qFactorMm: row.qFactorMm,
    crankLengthMm: row.crankLengthMm,
    pedalThread: row.pedalThread,
    chainringMount: row.chainringMount,
    chainringCount: row.chainringCount,
    maxChainringTeeth: row.maxChainringTeeth,
  };
}

export function mapChainring(part: PartIdentityRow, row: ChainringModel): Required<Chainring> {
  return {
    ...identity(part),
    mountStandard: row.mountStandard,
    boltCount: row.boltCount,
    teeth: row.teeth,
    narrowWide: row.narrowWide,
    offsetMm: row.offsetMm,
    speeds: row.speeds,
  };
}

// ------------------------------------------------------------
// §3 Wheels, tyres, tubes
// ------------------------------------------------------------

export function mapWheelset(part: PartIdentityRow, row: WheelsetModel): Required<Wheelset> {
  return {
    ...identity(part),
    wheelDiameter: row.wheelDiameter,
    frontAxleType: toEngineAxleType(row.frontAxleType),
    rearAxleType: toEngineAxleType(row.rearAxleType),
    freehubBodyType: row.freehubBodyType,
    rotorMountStandard: row.rotorMountStandard,
    tubelessReady: row.tubelessReady,
    hookless: row.hookless,
    maxPressurePsi: row.maxPressurePsi,
    internalRimWidthMm: row.internalRimWidthMm,
    rimDepthMm: row.rimDepthMm,
    valveHoleType: row.valveHoleType,
    hasBrakeTrack: row.hasBrakeTrack,
    convertibleEndCaps: row.convertibleEndCaps,
  };
}

export function mapTyre(part: PartIdentityRow, row: TyreModel): Required<Tyre> {
  return {
    ...identity(part),
    wheelDiameter: row.wheelDiameter,
    widthMm: row.widthMm,
    tubeless: row.tubeless,
    hooklessSafe: row.hooklessSafe,
    maxPressurePsi: row.maxPressurePsi,
  };
}

export function mapTube(part: PartIdentityRow, row: TubeModel): Required<Tube> {
  return {
    ...identity(part),
    wheelDiameter: row.wheelDiameter,
    minWidthMm: row.minWidthMm,
    maxWidthMm: row.maxWidthMm,
    valveType: row.valveType,
    valveLengthMm: row.valveLengthMm,
  };
}

// ------------------------------------------------------------
// §4 Brakes
// ------------------------------------------------------------

export function mapBrakeCaliper(
  part: PartIdentityRow,
  row: BrakeCaliperModel,
): Required<BrakeCaliper> {
  return {
    ...identity(part),
    mountType: row.mountType,
    nativeRotorMm: row.nativeRotorMm,
    isHydraulic: row.isHydraulic,
    fluidType: row.fluidType,
    brakeSystemFamily: row.brakeSystemFamily,
    padShape: row.padShape,
    minRotorThicknessMm: row.minRotorThicknessMm,
    maxRotorThicknessMm: row.maxRotorThicknessMm,
  };
}

export function mapBrakeLever(part: PartIdentityRow, row: BrakeLeverModel): Required<BrakeLever> {
  return {
    ...identity(part),
    isHydraulic: row.isHydraulic,
    fluidType: row.fluidType,
    brakeSystemFamily: row.brakeSystemFamily,
    barType: row.barType,
    clampDiameterMm: row.clampDiameterMm,
    requiresCompressionless: row.requiresCompressionless,
  };
}

export function mapRotor(part: PartIdentityRow, row: RotorModel): Required<Rotor> {
  return {
    ...identity(part),
    diameterMm: row.diameterMm,
    mountStandard: row.mountStandard,
    lockringType: row.lockringType,
    thicknessMm: row.thicknessMm,
  };
}

// ------------------------------------------------------------
// §5 Drivetrain
// ------------------------------------------------------------

export function mapShifter(part: PartIdentityRow, row: ShifterModel): Required<Shifter> {
  return {
    ...identity(part),
    speeds: row.speeds,
    cablePullStandard: row.cablePullStandard,
    barType: row.barType,
    clampDiameterMm: row.clampDiameterMm,
  };
}

export function mapRearDerailleur(
  part: PartIdentityRow,
  row: RearDerailleurModel,
): Required<RearDerailleur> {
  return {
    ...identity(part),
    maxSpeeds: row.maxSpeeds,
    cablePullStandard: row.cablePullStandard,
    maxCassetteCogTeeth: row.maxCassetteCogTeeth,
    minCassetteCogTeeth: row.minCassetteCogTeeth,
    totalCapacityTeeth: row.totalCapacityTeeth,
    cageLength: row.cageLength,
    mountStandard: row.mountStandard,
  };
}

export function mapFrontDerailleur(
  part: PartIdentityRow,
  row: FrontDerailleurModel,
): Required<FrontDerailleur> {
  return {
    ...identity(part),
    speeds: row.speeds,
    cablePullStandard: row.cablePullStandard,
    mountType: row.mountType,
    pullDirection: row.pullDirection,
    maxChainringTeeth: row.maxChainringTeeth,
  };
}

export function mapCassette(part: PartIdentityRow, row: CassetteModel): Required<Cassette> {
  return {
    ...identity(part),
    speeds: row.speeds,
    freehubBodyType: row.freehubBodyType,
    smallestCogTeeth: row.smallestCogTeeth,
    largestCogTeeth: row.largestCogTeeth,
    requiresSpacerMm: row.requiresSpacerMm,
  };
}

export function mapChain(part: PartIdentityRow, row: ChainModel): Required<Chain> {
  return {
    ...identity(part),
    // A range, not a figure. One physical SRAM chain is rated for both 12-
    // and 13-speed; collapsing this to a single number is the defect that
    // produced false critical blocks in the predecessor (R-DRV-07).
    speedsMin: row.speedsMin,
    speedsMax: row.speedsMax,
    chainStandard: row.chainStandard,
    links: row.links,
  };
}

// ------------------------------------------------------------
// §6 Headset, shock
// ------------------------------------------------------------

export function mapHeadset(part: PartIdentityRow, row: HeadsetModel): Required<Headset> {
  return {
    ...identity(part),
    upperStandard: row.upperStandard,
    lowerStandard: row.lowerStandard,
    crownRaceDiameterMm: row.crownRaceDiameterMm,
    stackHeightMm: row.stackHeightMm,
  };
}

export function mapRearShock(part: PartIdentityRow, row: RearShockModel): Required<RearShock> {
  return {
    ...identity(part),
    // Decimal for the same reason as Frame.shockStrokeMm above. Non-null in the
    // schema, so a null here means the column is genuinely unreadable rather
    // than unpublished -- decimalToNumber throws instead of degrading, because
    // silently abstaining on a shock size is exactly what R-SHK-01 must never do.
    eyeToEyeMm: decimalToNumber(row.eyeToEyeMm) as number,
    strokeMm: decimalToNumber(row.strokeMm) as number,
    mountType: row.mountType,
    hardwareWidthMm: row.hardwareWidthMm,
    bushingDiameterMm: row.bushingDiameterMm,
    sizing: row.sizing,
    isCoil: row.isCoil,
    springRate: row.springRate,
    hasReservoir: row.hasReservoir,
  };
}

// ------------------------------------------------------------
// §7 Cockpit
// ------------------------------------------------------------

export function mapHandlebar(part: PartIdentityRow, row: HandlebarModel): Required<Handlebar> {
  return {
    ...identity(part),
    clampDiameterMm: row.clampDiameterMm,
    controlClampDiameterMm: row.controlClampDiameterMm,
    barType: row.barType,
    widthMm: row.widthMm,
    riseMm: row.riseMm,
    internalRouting: row.internalRouting,
  };
}

export function mapStem(part: PartIdentityRow, row: StemModel): Required<Stem> {
  return {
    ...identity(part),
    barClampDiameterMm: row.barClampDiameterMm,
    steererClampMm: row.steererClampMm,
    lengthMm: row.lengthMm,
    riseDegrees: row.riseDegrees,
    integratedCockpit: row.integratedCockpit,
  };
}

// ------------------------------------------------------------
// §8 Seatpost, clamp, saddle
// ------------------------------------------------------------

export function mapSeatpost(part: PartIdentityRow, row: SeatpostModel): Required<Seatpost> {
  return {
    ...identity(part),
    diameterMm: row.diameterMm,
    totalLengthMm: row.totalLengthMm,
    isDropper: row.isDropper,
    travelMm: row.travelMm,
    routingType: row.routingType,
    remoteType: row.remoteType,
    railClampType: row.railClampType,
    setbackMm: row.setbackMm,
  };
}

export function mapSeatClamp(part: PartIdentityRow, row: SeatClampModel): Required<SeatClamp> {
  return {
    ...identity(part),
    diameterMm: row.diameterMm,
  };
}

export function mapSaddle(part: PartIdentityRow, row: SaddleModel): Required<Saddle> {
  return {
    ...identity(part),
    railType: row.railType,
    widthMm: row.widthMm,
  };
}

// ------------------------------------------------------------
// §9 Pedals, shoes
// ------------------------------------------------------------

export function mapPedal(part: PartIdentityRow, row: PedalModel): Required<Pedal> {
  return {
    ...identity(part),
    thread: row.thread,
    cleatSystem: row.cleatSystem,
  };
}

export function mapShoe(part: PartIdentityRow, row: ShoeModel): Required<Shoe> {
  return {
    ...identity(part),
    soleDrilling: row.soleDrilling,
  };
}

// ------------------------------------------------------------
// §10 Chain guide, hanger
// ------------------------------------------------------------

export function mapChainGuide(part: PartIdentityRow, row: ChainGuideModel): Required<ChainGuide> {
  return {
    ...identity(part),
    mountStandard: row.mountStandard,
    maxChainringTeeth: row.maxChainringTeeth,
    minChainringTeeth: row.minChainringTeeth,
  };
}

export function mapDerailleurHanger(
  part: PartIdentityRow,
  row: DerailleurHangerModel,
): Required<DerailleurHanger> {
  return {
    ...identity(part),
    hangerStandard: row.hangerStandard,
    model: row.model,
  };
}
