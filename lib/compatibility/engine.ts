// src/compatibility/engine.ts
//
// Implements every rule in COMPATIBILITY_RULES.md. Each function
// is named for its rule ID there (R-BB-01 → checkBbShellMatch)
// and returns `null` when compatible, or a typed warning.
//
// Two layers:
//  1. WARNINGS — evaluate a full/partial build (`getCompatibilityWarnings`)
//  2. LOCKOUT / FILTER — narrow a candidate list for one slot
//     (`filterCompatible*`)
// Both share the same rule functions as the single source of truth.
//
// Missing data is never guessed. A rule whose inputs aren't
// published returns null (or an explicit "unverified" warning
// where the risk of assuming is high, e.g. tyre clearance).

import type {
  BikeBuild, Frame, Fork, BottomBracket, Crankset, Chainring, Wheelset, Tyre, Tube,
  BrakeCaliper, BrakeLever, Rotor, Shifter, RearDerailleur, FrontDerailleur, Cassette,
  Chain, Headset, RearShock, Handlebar, Stem, Seatpost, SeatClamp, Saddle, Pedal, Shoe,
  ChainGuide, DerailleurHanger, RiderProfile, WheelDiameter, BrakeMountType,
} from '../types/parts';

export type WarningSeverity = 'critical' | 'warning' | 'info';

export interface CompatibilityWarning {
  /** Rule ID from COMPATIBILITY_RULES.md, e.g. "R-BB-01". */
  id: string;
  severity: WarningSeverity;
  title: string;
  message: string;
  components: (keyof BikeBuild)[];
  /** For rules resolvable by buying a small part. */
  remedy?: string;
}

// ------------------------------------------------------------
// ENUM → PROSE
//
// Every enum value that a message template interpolates goes through
// `humanize()`. It used to be a bare underscore→space, which read
// "M12 x 1 0 threading" and "TAPERED 1 5 TO 1 125 steerer" -- the
// decimal points vanished, on a tool whose whole pitch is exact spec
// matching. Labels below are written per value (not derived by a
// digit_digit→decimal rule) because the same shape means different
// things in different families: T47_85_5 is an 85.5mm shell, but
// BB30_30 is a BB30 shell with a 30mm spindle, not "30.30". They are
// cased for the middle of a sentence -- generic terms lower-case
// ("flat mount", "thru-axle"), proper names and standards as they're
// actually written ("BSA 73", "UDH", "Shimano Di2", "Race Face
// CINCH") -- and kept in step with the filter labels in
// web/lib/categories.ts so a warning uses the same words as the
// dropdown that produced the part.
//
// Values shared across families (DIRECT_MOUNT, NONE, FLAT_NONE) get
// one label that reads correctly in every template that uses them.
// A value with no entry falls back to `_x_` → " x " then `_` → " ",
// so a newly added enum member degrades to readable-but-plain rather
// than throwing.
// ------------------------------------------------------------
const ENUM_LABELS: Record<string, string> = {
  // BbShellStandard
  BSA_68: 'BSA 68', BSA_73: 'BSA 73', BSA_83: 'BSA 83', BSA_100: 'BSA 100',
  ITALIAN_70: 'Italian 70', PF92: 'PF92', PF107: 'PF107', BB86: 'BB86', BB90: 'BB90',
  T47_68: 'T47 68', T47_73: 'T47 73', T47_85_5: 'T47 85.5', BB30: 'BB30', PF30: 'PF30',
  // SpindleInterface
  DUB_29: 'DUB 29', GXP: 'GXP', HOLLOWTECH_II_24: 'Hollowtech II 24', CINCH_30: 'CINCH 30',
  BB30_30: 'BB30 30', OCT_LINK_24: 'Octalink 24', SQUARE_TAPER: 'square taper', ISIS: 'ISIS',
  // BrakeMountType
  FLAT_MOUNT: 'flat mount', POST_MOUNT_160: 'post mount 160', POST_MOUNT_180: 'post mount 180',
  POST_MOUNT: 'post mount', IS_MOUNT: 'IS mount', RIM_BRAKE: 'rim brake',
  // AxleType
  THRU_AXLE_142x12: '142×12 thru-axle', THRU_AXLE_148x12_BOOST: 'Boost 148×12 thru-axle',
  THRU_AXLE_157x12_SUPERBOOST: 'Super Boost 157×12 thru-axle',
  THRU_AXLE_110x15_BOOST: 'Boost 110×15 thru-axle', THRU_AXLE_100x15: '100×15 thru-axle',
  THRU_AXLE_100x12: '100×12 thru-axle', THRU_AXLE_20x110_DH: 'DH 20×110 thru-axle',
  THRU_AXLE_150x12_DH: 'DH 150×12 thru-axle',
  QUICK_RELEASE_130x9: '130×9 quick-release', QUICK_RELEASE_135x9: '135×9 quick-release',
  QUICK_RELEASE_100x9: '100×9 quick-release',
  // AxleThreadPitch
  M12_x_1_0: 'M12 x 1.0', M12_x_1_5: 'M12 x 1.5', M12_x_1_75: 'M12 x 1.75', M15_x_1_5: 'M15 x 1.5',
  NONE_QR: 'quick-release (no thread)',
  // DropoutType
  THRU_AXLE: 'thru-axle', QUICK_RELEASE: 'quick-release', UDH: 'UDH',
  // HeadsetTaper
  TAPERED_1_5_TO_1_125: 'tapered 1.5"–1.125"', STRAIGHT_1_125: 'straight 1.125"', STRAIGHT_1_5: 'straight 1.5"',
  // HeadsetCupStandard
  EC34: 'EC34', EC44: 'EC44', EC49: 'EC49', ZS44: 'ZS44', ZS49: 'ZS49', ZS56: 'ZS56',
  IS41: 'IS41', IS42: 'IS42', IS52: 'IS52',
  // WheelDiameter
  ISO_622: '700c / 29"', ISO_584: '650b / 27.5"', ISO_559: '26"', ISO_507: '24"',
  // FreehubBodyType
  XD: 'SRAM XD', XDR: 'SRAM XDR', MICRO_SPLINE: 'Shimano Micro Spline',
  HG_10: 'Shimano HG 10', HG_11: 'Shimano HG 11', HG_12: 'Shimano HG 12', CAMPAGNOLO_N3W: 'Campagnolo N3W',
  // CablePullStandard
  SHIMANO_ROAD: 'Shimano Road', SHIMANO_MTB: 'Shimano MTB', SRAM_EXACT_ACTUATION: 'SRAM Exact Actuation',
  SRAM_X_ACTUATION: 'SRAM X-Actuation', SRAM_FULL_PULL: 'SRAM Full Pull', CAMPAGNOLO: 'Campagnolo',
  ELECTRONIC_AXS: 'SRAM AXS', ELECTRONIC_DI2: 'Shimano Di2', ELECTRONIC_EPS: 'Campagnolo EPS',
  // HangerStandard / DerailleurMountStandard / FdMountType (DIRECT_MOUNT shared)
  PROPRIETARY: 'proprietary', DIRECT_MOUNT: 'direct-mount',
  STANDARD_HANGER: 'standard hanger', UDH_DIRECT_MOUNT: 'UDH direct-mount',
  // ChainringMountStandard
  BCD_104: '104 BCD', BCD_96: '96 BCD', BCD_94: '94 BCD', BCD_110: '110 BCD', BCD_76: '76 BCD',
  SRAM_3_BOLT: 'SRAM 3-bolt direct-mount', RACE_FACE_CINCH: 'Race Face CINCH',
  SHIMANO_DIRECT_MOUNT: 'Shimano direct-mount',
  SRAM_8_BOLT_ROAD_DM: 'SRAM 8-bolt direct-mount (road)', SRAM_8_BOLT_EAGLE_DM: 'SRAM 8-bolt direct-mount (Eagle)',
  // RotorMountStandard
  SIX_BOLT: '6-bolt', CENTERLOCK: 'Centerlock',
  // BrakeFluidType
  DOT: 'DOT fluid', MINERAL_OIL: 'mineral oil', NONE_MECHANICAL: 'no fluid (mechanical)',
  // ValveType
  PRESTA: 'Presta', SCHRADER: 'Schrader',
  // ShockMountType / ShockSizing
  STANDARD_EYELET: 'standard eyelet', TRUNNION: 'trunnion', METRIC: 'metric', IMPERIAL: 'imperial',
  // RoutingType (NONE shared with DropperRemoteType / IscgStandard)
  INTERNAL: 'internal', EXTERNAL: 'external', MIXED: 'mixed', NONE: 'none',
  // SaddleRailType
  ROUND_7MM: 'round 7mm', OVAL_7X9MM: 'oval 7×9mm', ROUND_8MM: 'round 8mm',
  // BarType
  FLAT: 'flat', RISER: 'riser', DROP: 'drop', AERO: 'aero',
  // PedalThread
  NINE_SIXTEENTHS: '9/16"', HALF_INCH: '1/2"',
  // CleatSystem / SoleDrilling (FLAT_NONE shared)
  SPD: 'Shimano SPD', SPD_SL: 'Shimano SPD-SL', LOOK_KEO: 'Look Keo', CRANK_BROTHERS: 'Crank Brothers',
  TIME: 'Time', SPEEDPLAY: 'Speedplay', FLAT_NONE: 'flat (no cleat mount)',
  TWO_BOLT: '2-bolt', THREE_BOLT: '3-bolt', TWO_AND_THREE_BOLT: '2-bolt and 3-bolt',
  // FdMountType (DIRECT_MOUNT above)
  BRAZE_ON: 'braze-on', CLAMP_28_6: '28.6mm clamp', CLAMP_31_8: '31.8mm clamp', CLAMP_34_9: '34.9mm clamp',
  // PullDirection
  TOP_PULL: 'top pull', BOTTOM_PULL: 'bottom pull', DUAL_PULL: 'dual pull', SIDE_SWING: 'Side Swing',
  // IscgStandard
  ISCG_05: 'ISCG-05', ISCG_OLD: 'old-standard ISCG', BB_MOUNT: 'BB mount',
};

function humanize(value: string): string {
  return ENUM_LABELS[value] ?? value.replace(/_x_/g, ' x ').replace(/_/g, ' ');
}

function warn(
  id: string,
  severity: WarningSeverity,
  title: string,
  message: string,
  components: (keyof BikeBuild)[],
  remedy?: string
): CompatibilityWarning {
  return { id, severity, title, message, components, ...(remedy && { remedy }) };
}

// ============================================================
// 1. FRAME ↔ FORK
// ============================================================

/** R-HS-01 — steerer taper vs head tube. */
export function checkHeadsetTaper(frame?: Frame, fork?: Fork): CompatibilityWarning | null {
  if (!frame || !fork) return null;
  if (frame.headsetTaper == null) return null;
  if (frame.headsetTaper === fork.steererTubeTaper) return null;
  return warn('R-HS-01', 'critical', 'Headset taper mismatch',
    `${frame.brand} ${frame.name} is set up for a ${humanize(frame.headsetTaper)} steerer, but ${fork.brand} ${fork.name} has a ${humanize(fork.steererTubeTaper)} steerer. The headset cups won't seat the fork's steerer tube.`,
    ['frame', 'fork']);
}

/** R-HS-02 — headset cup standards, upper and lower independently. */
export function checkHeadsetCups(frame?: Frame, headset?: Headset): CompatibilityWarning | null {
  if (!frame || !headset) return null;
  if (!frame.headTubeUpperStandard || !frame.headTubeLowerStandard) return null;
  const upperOk = frame.headTubeUpperStandard === headset.upperStandard;
  const lowerOk = frame.headTubeLowerStandard === headset.lowerStandard;
  if (upperOk && lowerOk) return null;
  const bad = [!upperOk && 'upper', !lowerOk && 'lower'].filter(Boolean).join(' and ');
  return warn('R-HS-02', 'critical', 'Headset cup standard mismatch',
    `${frame.brand} ${frame.name} uses ${humanize(frame.headTubeUpperStandard)} upper / ${humanize(frame.headTubeLowerStandard)} lower, but ${headset.brand} ${headset.name} is ${humanize(headset.upperStandard)} / ${humanize(headset.lowerStandard)}. The ${bad} cup won't fit the head tube.`,
    ['frame', 'headset']);
}

/** R-HS-03 — crown race seat diameter vs fork crown. */
export function checkCrownRace(fork?: Fork, headset?: Headset): CompatibilityWarning | null {
  if (!fork || !headset) return null;
  if (fork.crownRaceDiameterMm == null || headset.crownRaceDiameterMm == null) return null;
  if (fork.crownRaceDiameterMm === headset.crownRaceDiameterMm) return null;
  return warn('R-HS-03', 'critical', 'Crown race diameter mismatch',
    `${fork.brand} ${fork.name} has a ${fork.crownRaceDiameterMm}mm crown race seat, but the ${headset.brand} ${headset.name} crown race is ${headset.crownRaceDiameterMm}mm.`,
    ['fork', 'headset']);
}

/** R-FRK-01 — steerer long enough for head tube + headset stack + stem. */
export function checkSteererLength(frame?: Frame, fork?: Fork, headset?: Headset, stem?: Stem): CompatibilityWarning | null {
  if (!frame || !fork) return null;
  if (fork.steererLengthMm == null || frame.headTubeLengthMm == null) return null;
  const stack = headset?.stackHeightMm ?? 15;
  // `stem` is accepted but genuinely can't contribute here: Stem has no
  // field for the vertical height its clamp consumes on the steerer
  // (barClampDiameterMm/steererClampMm/lengthMm are all reach/diameter,
  // not that). A real per-model figure isn't in the data model, so this
  // is a stated industry-typical constant, not a guess computed from
  // `stem` -- found via `stem?.lengthMm != null ? 40 : 40`, a dead
  // ternary where both branches were the same value regardless of input.
  const stemHeight = 40;
  const required = frame.headTubeLengthMm + stack + stemHeight;
  if (fork.steererLengthMm >= required) return null;
  return warn('R-FRK-01', 'critical', 'Steerer tube too short',
    `${fork.brand} ${fork.name} has a ${fork.steererLengthMm}mm steerer, but this frame needs at least ~${Math.round(required)}mm (${frame.headTubeLengthMm}mm head tube + ${stack}mm headset stack + stem). The stem won't clamp.`,
    ['frame', 'fork']);
}

/** R-FRK-02 — fork travel vs frame's rated maximum. */
export function checkForkTravel(frame?: Frame, fork?: Fork): CompatibilityWarning | null {
  if (!frame || !fork) return null;
  if (frame.maxForkTravelMm == null || fork.travelMm == null) return null;
  if (fork.travelMm <= frame.maxForkTravelMm) return null;
  return warn('R-FRK-02', 'critical', 'Fork travel exceeds frame rating',
    `${fork.brand} ${fork.name} is a ${fork.travelMm}mm fork, but ${frame.brand} ${frame.name} is rated for ${frame.maxForkTravelMm}mm. Overforking slackens the geometry beyond design and voids most frame warranties.`,
    ['frame', 'fork']);
}

/** R-FRK-03 — axle-to-crown within the frame's design window (±10mm). */
export function checkAxleToCrown(frame?: Frame, fork?: Fork): CompatibilityWarning | null {
  if (!frame || !fork) return null;
  if (frame.designAxleToCrownMm == null || fork.axleToCrownMm == null) return null;
  const delta = fork.axleToCrownMm - frame.designAxleToCrownMm;
  if (Math.abs(delta) <= 10) return null;
  return warn('R-FRK-03', 'warning', 'Axle-to-crown outside design window',
    `${fork.brand} ${fork.name} has a ${fork.axleToCrownMm}mm axle-to-crown, ${Math.abs(delta)}mm ${delta > 0 ? 'longer' : 'shorter'} than this frame's ${frame.designAxleToCrownMm}mm design figure. Handling will differ noticeably from intended.`,
    ['frame', 'fork']);
}

/** R-FRK-04 — fork wheel size vs frame, unless mullet-approved. */
export function checkForkWheelDiameter(frame?: Frame, fork?: Fork): CompatibilityWarning | null {
  if (!frame || !fork) return null;
  if (frame.wheelDiameter === fork.wheelDiameter) return null;
  if (frame.mulletApproved) {
    return warn('R-FRK-04', 'info', 'Mixed wheel sizes (mullet)',
      `${fork.brand} ${fork.name} is ${humanize(fork.wheelDiameter)} against a ${humanize(frame.wheelDiameter)} frame. This frame is mullet-approved, so it's intended — just make sure the wheels match each end.`,
      ['frame', 'fork']);
  }
  return warn('R-FRK-04', 'warning', 'Fork wheel size differs from frame',
    `${fork.brand} ${fork.name} is built for ${humanize(fork.wheelDiameter)} but the frame is ${humanize(frame.wheelDiameter)}, and this frame isn't listed as mullet-approved.`,
    ['frame', 'fork']);
}

/** R-FRK-05 — rigid fork on a suspension-corrected frame. */
export function checkRigidForkCorrection(frame?: Frame, fork?: Fork): CompatibilityWarning | null {
  if (!frame || !fork) return null;
  if (fork.isSuspension !== false) return null;
  if (frame.designAxleToCrownMm == null || fork.axleToCrownMm == null) return null;
  // A rigid fork should match the suspension fork's sagged length (~25% sag).
  const sagged = frame.designAxleToCrownMm - (frame.maxForkTravelMm ?? 0) * 0.25;
  if (Math.abs(fork.axleToCrownMm - sagged) <= 15) return null;
  return warn('R-FRK-05', 'warning', 'Rigid fork not suspension-corrected',
    `${fork.brand} ${fork.name} is rigid at ${fork.axleToCrownMm}mm axle-to-crown. This frame expects roughly ${Math.round(sagged)}mm sagged, so the head angle will sit off design.`,
    ['frame', 'fork']);
}

/** R-FRK-06 — offset/rake changes trail (advisory). */
export function checkForkOffset(frame?: Frame, fork?: Fork): CompatibilityWarning | null {
  if (!frame || !fork || fork.offsetMm == null) return null;
  return null; // Informational only; no universal threshold to gate on.
}

// ============================================================
// 2. FRAME ↔ BOTTOM BRACKET ↔ CRANKSET
// ============================================================

/** R-BB-01 — BB shell standard. */
export function checkBbShellMatch(frame?: Frame, bb?: BottomBracket): CompatibilityWarning | null {
  if (!frame || !bb) return null;
  if (frame.bbShellStandard === bb.frameInterface) return null;
  return warn('R-BB-01', 'critical', 'Bottom bracket shell mismatch',
    `${frame.brand} ${frame.name} has a ${humanize(frame.bbShellStandard)} shell, but ${bb.brand} ${bb.name} is built for ${humanize(bb.frameInterface)}. It will not thread or press into this frame.`,
    ['frame', 'bottomBracket']);
}

/** R-BB-02 — BB spindle interface vs crankset. */
export function checkSpindleMatch(bb?: BottomBracket, crankset?: Crankset): CompatibilityWarning | null {
  if (!bb || !crankset) return null;
  if (bb.spindleInterface === crankset.spindleDiameter) return null;
  return warn('R-BB-02', 'critical', 'Spindle diameter mismatch',
    `${bb.brand} ${bb.name} is machined for a ${humanize(bb.spindleInterface)} spindle, but ${crankset.brand} ${crankset.name} uses ${humanize(crankset.spindleDiameter)}. The crank spindle won't fit the bearings.`,
    ['bottomBracket', 'crankset']);
}

/** R-BB-03 — shell width, tracked separately from the standard. */
export function checkBbShellWidth(frame?: Frame, bb?: BottomBracket): CompatibilityWarning | null {
  if (!frame || !bb) return null;
  if (frame.bbShellWidthMm == null || bb.shellWidthMm == null) return null;
  if (frame.bbShellWidthMm === bb.shellWidthMm) return null;
  return warn('R-BB-03', 'critical', 'Bottom bracket shell width mismatch',
    `This frame's shell is ${frame.bbShellWidthMm}mm wide but ${bb.brand} ${bb.name} is for ${bb.shellWidthMm}mm. Even with the same shell standard, the bearing spacing is wrong.`,
    ['frame', 'bottomBracket']);
}

/** R-BB-04 — Italian threading is a different standard and thread direction. */
export function checkBbThreadDirection(frame?: Frame, bb?: BottomBracket): CompatibilityWarning | null {
  if (!frame || !bb) return null;
  const italian = (s: string) => s === 'ITALIAN_70';
  if (italian(frame.bbShellStandard) === italian(bb.frameInterface)) return null;
  return warn('R-BB-04', 'critical', 'Italian vs English threading',
    `Italian (70mm, right-hand drive-side thread) and English/BSA shells are not interchangeable. ${frame.brand} ${frame.name} is ${humanize(frame.bbShellStandard)}, the bottom bracket is ${humanize(bb.frameInterface)}.`,
    ['frame', 'bottomBracket']);
}

/** R-BB-05 — spindle length vs shell width (spacer count). */
export function checkSpindleLength(frame?: Frame, crankset?: Crankset): CompatibilityWarning | null {
  if (!frame || !crankset) return null;
  if (frame.bbShellWidthMm == null || crankset.spindleLengthMm == null) return null;
  if (crankset.spindleLengthMm >= frame.bbShellWidthMm + 20) return null;
  return warn('R-BB-05', 'warning', 'Spindle may be too short for this shell',
    `${crankset.brand} ${crankset.name} has a ${crankset.spindleLengthMm}mm spindle against a ${frame.bbShellWidthMm}mm shell. Check the spacer configuration — a 68mm-shell crank often won't reach on a 73mm shell.`,
    ['frame', 'crankset']);
}

/** R-CRK-01 — crank chainline vs rear hub spacing. */
export function checkChainline(crankset?: Crankset, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!crankset || !wheelset || crankset.chainlineMm == null) return null;
  const expected: Partial<Record<string, number>> = {
    THRU_AXLE_148x12_BOOST: 52,
    THRU_AXLE_157x12_SUPERBOOST: 56.5,
    THRU_AXLE_142x12: 49,
    QUICK_RELEASE_135x9: 49,
  };
  const target = expected[wheelset.rearAxleType];
  if (target == null) return null;
  if (Math.abs(crankset.chainlineMm - target) <= 1.5) return null;
  return warn('R-CRK-01', 'warning', 'Chainline mismatch',
    `${crankset.brand} ${crankset.name} has a ${crankset.chainlineMm}mm chainline, but ${humanize(wheelset.rearAxleType)} hubs want about ${target}mm. Expect noisier shifting and faster chain wear at the extremes of the cassette.`,
    ['crankset', 'wheelset']);
}

/** R-CRK-02 — chainring size vs frame clearance. */
export function checkChainringClearance(frame?: Frame, chainring?: Chainring, crankset?: Crankset): CompatibilityWarning | null {
  if (!frame || frame.maxChainringTeeth == null) return null;
  const teeth = chainring?.teeth ?? crankset?.maxChainringTeeth;
  if (teeth == null) return null;
  if (teeth <= frame.maxChainringTeeth) return null;
  return warn('R-CRK-02', 'critical', 'Chainring too large for frame',
    `A ${teeth}t ring exceeds ${frame.brand} ${frame.name}'s ${frame.maxChainringTeeth}t maximum. It will foul the chainstay.`,
    ['frame', chainring ? 'chainring' : 'crankset']);
}

/** R-CRK-03 — Q-factor vs chainstay clearance. */
export function checkQFactor(frame?: Frame, crankset?: Crankset): CompatibilityWarning | null {
  if (!frame || !crankset || crankset.qFactorMm == null) return null;
  if (crankset.qFactorMm <= 180) return null;
  return warn('R-CRK-03', 'warning', 'Unusually wide Q-factor',
    `${crankset.brand} ${crankset.name} has a ${crankset.qFactorMm}mm Q-factor. Check heel and chainstay clearance on this frame.`,
    ['frame', 'crankset']);
}

/** R-CRK-04 — crank length vs rider leg length (advisory). */
export function checkCrankLength(crankset?: Crankset, rider?: RiderProfile): CompatibilityWarning | null {
  if (!crankset || !rider?.inseamCm || crankset.crankLengthMm == null) return null;
  // Common fitting heuristic: ~20-21% of inseam.
  const suggested = Math.round(rider.inseamCm * 2.05);
  if (Math.abs(crankset.crankLengthMm - suggested) <= 10) return null;
  return warn('R-CRK-04', 'info', 'Crank length outside typical range for your inseam',
    `${crankset.crankLengthMm}mm cranks against a ${rider.inseamCm}cm inseam — common fitting guidance would suggest nearer ${suggested}mm. This is preference, not a fit error.`,
    ['crankset']);
}

// ============================================================
// 3. CHAINRING ↔ CRANK
// ============================================================

/** R-CHR-01 / R-CHR-02 — mounting interface and bolt count. */
export function checkChainringMount(crankset?: Crankset, chainring?: Chainring): CompatibilityWarning | null {
  if (!crankset || !chainring || !crankset.chainringMount) return null;
  if (crankset.chainringMount === chainring.mountStandard) return null;
  // Every direct-mount standard needs to be listed here, or a mismatch
  // between two of them gets classified under R-CHR-01 (bolt-circle/BCD)
  // instead of R-CHR-02 (direct-mount interface) -- missed when
  // SRAM_8_BOLT_ROAD_DM/SRAM_8_BOLT_EAGLE_DM were added to the schema this
  // session without updating this list alongside it.
  const direct = ['SRAM_3_BOLT', 'RACE_FACE_CINCH', 'SHIMANO_DIRECT_MOUNT', 'SRAM_8_BOLT_ROAD_DM', 'SRAM_8_BOLT_EAGLE_DM'];
  const ruleId = direct.includes(chainring.mountStandard) || direct.includes(crankset.chainringMount)
    ? 'R-CHR-02' : 'R-CHR-01';
  return warn(ruleId, 'critical', 'Chainring interface mismatch',
    `${crankset.brand} ${crankset.name} takes ${humanize(crankset.chainringMount)} rings, but ${chainring.brand} ${chainring.name} is ${humanize(chainring.mountStandard)}. The bolt pattern doesn't line up.`,
    ['crankset', 'chainring']);
}

/** R-CHR-03 — ring offset produces the target chainline. */
export function checkChainringOffset(chainring?: Chainring, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!chainring || !wheelset || chainring.offsetMm == null) return null;
  const boost = wheelset.rearAxleType === 'THRU_AXLE_148x12_BOOST';
  // Boost wants ~3mm offset rings on most direct-mount cranks.
  if (boost && chainring.offsetMm < 1) {
    return warn('R-CHR-03', 'warning', 'Ring offset likely wrong for Boost',
      `${chainring.brand} ${chainring.name} is a ${chainring.offsetMm}mm offset ring on a Boost drivetrain, which usually wants ~3mm to land the chainline at 52mm.`,
      ['chainring', 'wheelset']);
  }
  return null;
}

/** R-CHR-04 — 1x drivetrains need narrow-wide tooth profiles. */
export function checkNarrowWide(crankset?: Crankset, chainring?: Chainring, frontDerailleur?: FrontDerailleur): CompatibilityWarning | null {
  if (!chainring) return null;
  const is1x = frontDerailleur == null && (crankset?.chainringCount ?? 1) === 1;
  if (!is1x || chainring.narrowWide) return null;
  return warn('R-CHR-04', 'warning', 'No narrow-wide profile on a 1x setup',
    `${chainring.brand} ${chainring.name} isn't a narrow-wide ring. Without a front derailleur to guide the chain, expect chain drop unless you run a chain guide.`,
    ['chainring']);
}

// ============================================================
// 4. DRIVETRAIN
// ============================================================

const ELECTRONIC = ['ELECTRONIC_AXS', 'ELECTRONIC_DI2', 'ELECTRONIC_EPS'];

/** R-DRV-01 — shifter cable pull ratio vs rear derailleur. */
export function checkShifterDerailleurPull(shifter?: Shifter, rd?: RearDerailleur): CompatibilityWarning | null {
  if (!shifter || !rd) return null;
  if (shifter.cablePullStandard === rd.cablePullStandard) return null;
  // Electronic mismatches are reported by R-DRV-03 instead.
  if (ELECTRONIC.includes(shifter.cablePullStandard) || ELECTRONIC.includes(rd.cablePullStandard)) return null;
  return warn('R-DRV-01', 'critical', 'Shifter and derailleur actuation mismatch',
    `${shifter.brand} ${shifter.name} uses ${humanize(shifter.cablePullStandard)} cable pull, but ${rd.brand} ${rd.name} expects ${humanize(rd.cablePullStandard)}. The derailleur will not land on the cogs.`,
    ['shifter', 'rearDerailleur']);
}

/** R-DRV-02 — speed count match. */
export function checkShifterDerailleurSpeeds(shifter?: Shifter, rd?: RearDerailleur): CompatibilityWarning | null {
  if (!shifter || !rd) return null;
  if (shifter.speeds === rd.maxSpeeds) return null;
  return warn('R-DRV-02', 'critical', 'Drivetrain speed count mismatch',
    `${shifter.brand} ${shifter.name} is ${shifter.speeds}-speed but ${rd.brand} ${rd.name} is ${rd.maxSpeeds}-speed. The cable pull per click won't match the cog spacing.`,
    ['shifter', 'rearDerailleur']);
}

/** R-DRV-03 — electronic ecosystems can't mix, with each other or with cable. */
export function checkElectronicEcosystem(shifter?: Shifter, rd?: RearDerailleur): CompatibilityWarning | null {
  if (!shifter || !rd) return null;
  const sElec = ELECTRONIC.includes(shifter.cablePullStandard);
  const rElec = ELECTRONIC.includes(rd.cablePullStandard);
  if (!sElec && !rElec) return null;
  if (sElec && rElec && shifter.cablePullStandard === rd.cablePullStandard) return null;
  if (sElec !== rElec) {
    return warn('R-DRV-03', 'critical', 'Electronic and mechanical cannot mix',
      `${sElec ? shifter.brand + ' ' + shifter.name + ' is electronic' : rd.brand + ' ' + rd.name + ' is electronic'}, and the other half of this pairing is cable-actuated. There is no cable to pull.`,
      ['shifter', 'rearDerailleur']);
  }
  return warn('R-DRV-03', 'critical', 'Incompatible electronic ecosystems',
    `${shifter.brand} ${shifter.name} (${humanize(shifter.cablePullStandard)}) can't drive ${rd.brand} ${rd.name} (${humanize(rd.cablePullStandard)}). Electronic groupsets only talk within their own protocol.`,
    ['shifter', 'rearDerailleur']);
}

/** R-DRV-04 — cassette largest cog vs derailleur capacity. */
export function checkMaxCog(rd?: RearDerailleur, cassette?: Cassette): CompatibilityWarning | null {
  if (!rd || !cassette) return null;
  if (cassette.largestCogTeeth <= rd.maxCassetteCogTeeth) return null;
  return warn('R-DRV-04', 'critical', 'Cassette too large for derailleur',
    `${cassette.brand} ${cassette.name} tops out at ${cassette.largestCogTeeth}t, beyond ${rd.brand} ${rd.name}'s ${rd.maxCassetteCogTeeth}t limit. The cage will jam against the big cog.`,
    ['rearDerailleur', 'cassette']);
}

/** R-DRV-05 — total capacity for 2x setups. */
export function checkTotalCapacity(rd?: RearDerailleur, cassette?: Cassette, crankset?: Crankset, chainring?: Chainring): CompatibilityWarning | null {
  if (!rd || !cassette || rd.totalCapacityTeeth == null) return null;
  const rings = crankset?.chainringCount ?? 1;
  if (rings < 2) return null;
  const cassetteRange = cassette.largestCogTeeth - cassette.smallestCogTeeth;
  const ringRange = 14; // typical 2x difference when exact ring sizes aren't known
  const required = cassetteRange + ringRange;
  if (required <= rd.totalCapacityTeeth) return null;
  return warn('R-DRV-05', 'warning', 'Derailleur capacity exceeded',
    `This 2x setup needs about ${required}t of chain take-up but ${rd.brand} ${rd.name} handles ${rd.totalCapacityTeeth}t. Expect slack chain in the small-small combination.`,
    ['rearDerailleur', 'cassette', 'crankset']);
}

/** R-DRV-06 — cage length vs cassette range. */
export function checkCageLength(rd?: RearDerailleur, cassette?: Cassette): CompatibilityWarning | null {
  if (!rd || !cassette || !rd.cageLength) return null;
  const range = cassette.largestCogTeeth - cassette.smallestCogTeeth;
  if (rd.cageLength === 'SHORT_SS' && range > 28) {
    return warn('R-DRV-06', 'warning', 'Short cage on a wide-range cassette',
      `${rd.brand} ${rd.name} has a short (SS) cage but ${cassette.brand} ${cassette.name} spans ${range}t. A medium or long cage would take up the chain properly.`,
      ['rearDerailleur', 'cassette']);
  }
  return null;
}

/** R-DRV-07 — chain speed vs cassette speed.
 *
 *  The chain carries a *range*, not a single figure. SRAM rate one physical
 *  chain (CN-RED-E1) for both 12- and 13-speed drivetrains; modelling that as
 *  a single number made this rule fire a false critical on three real
 *  E1-generation builds, which is exactly the failure mode the engine exists
 *  to prevent. Most chains fit one speed count and have min === max. */
export function checkChainSpeeds(chain?: Chain, cassette?: Cassette): CompatibilityWarning | null {
  if (!chain || !cassette) return null;
  if (cassette.speeds >= chain.speedsMin && cassette.speeds <= chain.speedsMax) return null;

  const rated = chain.speedsMin === chain.speedsMax
    ? `${chain.speedsMin}-speed`
    : `rated for ${chain.speedsMin}–${chain.speedsMax} speed`;

  return warn('R-DRV-07', 'critical', 'Chain and cassette speed mismatch',
    `${chain.brand} ${chain.name} is ${rated} against a ${cassette.speeds}-speed cassette. The chain is the wrong width for the cog spacing.`,
    ['chain', 'cassette']);
}

/** R-DRV-08 — brand-specific chain standards aren't interchangeable. */
export function checkChainStandard(chain?: Chain, cassette?: Cassette, rd?: RearDerailleur): CompatibilityWarning | null {
  if (!chain) return null;
  const flattop = chain.chainStandard === 'SRAM_FLATTOP_12';
  if (flattop && cassette && cassette.freehubBodyType !== 'XDR') {
    return warn('R-DRV-08', 'critical', 'Flattop chain outside its groupset',
      `${chain.brand} ${chain.name} is a SRAM Flattop chain, which only runs with AXS road groupsets — it isn't compatible with this cassette.`,
      ['chain', 'cassette']);
  }
  // Applies to chains that cover 12-speed at all, including SRAM's 12/13
  // dual-rated ones — the inner-width difference is the same either way.
  if (rd && chain.speedsMin <= 12 && chain.speedsMax >= 12) {
    const sram = rd.cablePullStandard.startsWith('SRAM') || rd.cablePullStandard === 'ELECTRONIC_AXS';
    const shimano = rd.cablePullStandard.startsWith('SHIMANO') || rd.cablePullStandard === 'ELECTRONIC_DI2';
    const chainIsSram = chain.chainStandard.startsWith('SRAM');
    const chainIsShimano = chain.chainStandard.startsWith('SHIMANO');
    if ((sram && chainIsShimano) || (shimano && chainIsSram)) {
      return warn('R-DRV-08', 'critical', 'Chain brand mismatch at 12-speed',
        `12-speed SRAM and Shimano chains have different inner widths and roller profiles. ${chain.brand} ${chain.name} won't shift properly on this derailleur.`,
        ['chain', 'rearDerailleur']);
    }
  }
  return null;
}

/** R-DRV-09 — chain long enough for big-big plus rear centre. */
export function checkChainLength(chain?: Chain, cassette?: Cassette, chainring?: Chainring, frame?: Frame): CompatibilityWarning | null {
  if (!chain || !cassette || !chainring || !frame) return null;
  if (chain.links == null || frame.chainstayLengthMm == null) return null;
  // Approximation of the standard chain-length formula, in links.
  const required = Math.ceil(
    2 * (frame.chainstayLengthMm / 12.7) + chainring.teeth / 2 + cassette.largestCogTeeth / 2 + 2
  );
  if (chain.links >= required) return null;
  return warn('R-DRV-09', 'warning', 'Chain may be too short',
    `${chain.brand} ${chain.name} ships at ${chain.links} links; this combination needs roughly ${required}. Verify before cutting.`,
    ['chain', 'cassette', 'chainring']);
}

/** R-DRV-10 — cassette speed vs shifter speed. */
export function checkCassetteShifterSpeeds(shifter?: Shifter, cassette?: Cassette): CompatibilityWarning | null {
  if (!shifter || !cassette) return null;
  if (shifter.speeds === cassette.speeds) return null;
  return warn('R-DRV-10', 'critical', 'Shifter and cassette speed mismatch',
    `${shifter.brand} ${shifter.name} is ${shifter.speeds}-speed but ${cassette.brand} ${cassette.name} has ${cassette.speeds} cogs. Every click would land between cogs.`,
    ['shifter', 'cassette']);
}

// ============================================================
// 5. CASSETTE ↔ FREEHUB
// ============================================================

/** R-FH-01 / R-FH-04 — freehub body type. */
export function checkFreehubBody(wheelset?: Wheelset, cassette?: Cassette): CompatibilityWarning | null {
  if (!wheelset || !cassette) return null;
  if (wheelset.freehubBodyType === cassette.freehubBodyType) return null;
  // XD cassette on an XDR body is a spacer job, not a hard stop (R-FH-02).
  if (cassette.freehubBodyType === 'XD' && wheelset.freehubBodyType === 'XDR') return null;
  const proprietary = ['MICRO_SPLINE', 'XD', 'XDR', 'CAMPAGNOLO_N3W'];
  const id = proprietary.includes(cassette.freehubBodyType) ? 'R-FH-04' : 'R-FH-01';
  return warn(id, 'critical', 'Freehub body mismatch',
    `${cassette.brand} ${cassette.name} needs a ${humanize(cassette.freehubBodyType)} freehub, but ${wheelset.brand} ${wheelset.name} has ${humanize(wheelset.freehubBodyType)}. The cassette won't engage the splines.`,
    ['wheelset', 'cassette']);
}

/** R-FH-02 — XD cassette on the 1.85mm longer XDR body needs a spacer. */
export function checkXdrSpacer(wheelset?: Wheelset, cassette?: Cassette): CompatibilityWarning | null {
  if (!wheelset || !cassette) return null;
  if (wheelset.freehubBodyType === 'XDR' && cassette.freehubBodyType === 'XD') {
    return warn('R-FH-02', 'warning', 'XD cassette on an XDR body',
      `An XDR freehub is 1.85mm longer than XD. ${cassette.brand} ${cassette.name} will fit but needs a spacer behind it to sit at the right chainline.`,
      ['wheelset', 'cassette'], 'Fit a 1.85mm XDR spacer.');
  }
  return null;
}

/** R-FH-03 — 11-speed road cassette on an older HG body needs a spacer. */
export function checkHgSpacer(wheelset?: Wheelset, cassette?: Cassette): CompatibilityWarning | null {
  if (!wheelset || !cassette) return null;
  if (wheelset.freehubBodyType === 'HG_11' && cassette.speeds <= 10) {
    return warn('R-FH-03', 'warning', 'Narrow cassette on an 11-speed HG body',
      `${cassette.brand} ${cassette.name} is ${cassette.speeds}-speed on an 11-speed HG freehub. It needs a 1.85mm spacer behind the cassette.`,
      ['wheelset', 'cassette'], 'Fit a 1.85mm HG spacer.');
  }
  return null;
}

// ============================================================
// 6. FRAME ↔ DERAILLEUR HANGER
// ============================================================

/** R-HGR-01 — SRAM Transmission requires a UDH frame. */
export function checkUdhTransmission(frame?: Frame, rd?: RearDerailleur): CompatibilityWarning | null {
  if (!frame || !rd) return null;
  if (!rd.mountStandard) {
    // An unrecorded mount type is not the same fact as "not UDH-direct" --
    // a real UDH_DIRECT_MOUNT derailleur (e.g. a SRAM Transmission) imported
    // without this field populated used to pass silently here, which is
    // the single most consequential blind spot in the catalogue: that
    // derailleur physically cannot bolt to a non-UDH frame. On a UDH frame
    // either mount type fits, so this only speaks up where the gap in the
    // data could actually hide a real incompatibility.
    if (frame.hangerStandard && frame.hangerStandard !== 'UDH') {
      return warn('R-HGR-01', 'warning', "Derailleur mount type isn't recorded",
        `${rd.brand} ${rd.name}'s mount type (standard hanger vs. UDH direct-mount) isn't in our data. ${frame.brand} ${frame.name} uses a ${humanize(frame.hangerStandard)} hanger, not UDH — if this turns out to be a UDH direct-mount derailleur (e.g. a SRAM Transmission), it will not fit. Verify before buying.`,
        ['frame', 'rearDerailleur']);
    }
    return null;
  }
  if (rd.mountStandard !== 'UDH_DIRECT_MOUNT') return null;
  if (frame.hangerStandard === 'UDH') return null;
  return warn('R-HGR-01', 'critical', 'Transmission derailleur needs a UDH frame',
    `${rd.brand} ${rd.name} mounts directly to the frame's UDH interface — it has no hanger. ${frame.brand} ${frame.name} ${frame.hangerStandard ? `uses a ${humanize(frame.hangerStandard)} hanger` : "isn't UDH"}, so there's nothing to bolt to.`,
    ['frame', 'rearDerailleur']);
}

/** R-HGR-02 — proprietary hangers are model-specific. */
export function checkHangerFit(frame?: Frame, hanger?: DerailleurHanger): CompatibilityWarning | null {
  if (!frame || !hanger || !frame.hangerStandard) return null;
  if (frame.hangerStandard === hanger.hangerStandard) return null;
  return warn('R-HGR-02', 'critical', 'Derailleur hanger mismatch',
    `${frame.brand} ${frame.name} takes a ${humanize(frame.hangerStandard)} hanger, but this is ${humanize(hanger.hangerStandard)}. Proprietary hangers are model-specific.`,
    ['frame', 'derailleurHanger']);
}

/** R-HGR-03 — direct-mount vs standard hanger derailleurs. */
export function checkDerailleurMount(frame?: Frame, rd?: RearDerailleur): CompatibilityWarning | null {
  // An unrecorded mount type is left quiet here specifically: R-HGR-01
  // above already surfaces a "verify before buying" warning for exactly
  // this gap on non-UDH frames, covering both the UDH and plain
  // DIRECT_MOUNT cases in one place rather than firing twice per build.
  if (!frame || !rd || !rd.mountStandard || !frame.hangerStandard) return null;
  if (rd.mountStandard === 'UDH_DIRECT_MOUNT') return null; // covered by R-HGR-01
  if (rd.mountStandard === 'DIRECT_MOUNT' && frame.hangerStandard !== 'DIRECT_MOUNT') {
    return warn('R-HGR-03', 'critical', 'Direct-mount derailleur on a standard hanger frame',
      `${rd.brand} ${rd.name} is direct-mount, but ${frame.brand} ${frame.name} uses a ${humanize(frame.hangerStandard)} hanger.`,
      ['frame', 'rearDerailleur']);
  }
  return null;
}

// ============================================================
// 7. BRAKES
// ============================================================

/** R-BRK-01 — rear caliper vs frame mount. */
export function checkRearBrakeMount(frame?: Frame, caliper?: BrakeCaliper): CompatibilityWarning | null {
  if (!frame || !caliper) return null;
  const frameIsPost = frame.rearBrakeMountType.startsWith('POST_MOUNT');
  const caliperIsPost = caliper.mountType.startsWith('POST_MOUNT');
  // Any post-mount caliper fits any post-mount frame; rotor sizing is
  // an adapter question, handled by R-BRK-03 rather than blocked here.
  if (frameIsPost && caliperIsPost) return null;
  if (frame.rearBrakeMountType === caliper.mountType) return null;
  return warn('R-BRK-01', 'critical', 'Rear brake mount mismatch',
    `${frame.brand} ${frame.name}'s rear mount is ${humanize(frame.rearBrakeMountType)}, but ${caliper.brand} ${caliper.name} is a ${humanize(caliper.mountType)} caliper. These are different mounting systems entirely.`,
    ['frame', 'brakeCaliper']);
}

/** R-BRK-02 — front caliper vs fork mount. */
export function checkFrontBrakeMount(fork?: Fork, caliper?: BrakeCaliper): CompatibilityWarning | null {
  if (!fork || !caliper) return null;
  const forkIsPost = fork.brakeMountType.startsWith('POST_MOUNT');
  const caliperIsPost = caliper.mountType.startsWith('POST_MOUNT');
  if (forkIsPost && caliperIsPost) return null;
  if (fork.brakeMountType === caliper.mountType) return null;
  return warn('R-BRK-02', 'critical', 'Front brake mount mismatch',
    `${fork.brand} ${fork.name}'s mount is ${humanize(fork.brakeMountType)}, but ${caliper.brand} ${caliper.name} is a ${humanize(caliper.mountType)} caliper. These are different mounting systems entirely.`,
    ['fork', 'brakeCaliper']);
}

/**
 * R-BRK-03 — rotor size via adapter.
 *
 * Replaces v1's "caliper native size must equal frame mount size",
 * which made adapter-legal builds vanish. A post mount rated for
 * 160mm takes a 180mm rotor with a +20mm adapter; going *below* the
 * native size is what's actually impossible.
 */
function nativeRotorFor(mount: BrakeMountType): number | null {
  if (mount === 'POST_MOUNT_160') return 160;
  if (mount === 'POST_MOUNT_180') return 180;
  if (mount === 'FLAT_MOUNT') return 140;
  return null;
}

function rotorAdapterCheck(
  mount: BrakeMountType | undefined,
  rotor: Rotor | undefined,
  ruleId: string,
  end: 'front' | 'rear',
  components: (keyof BikeBuild)[]
): CompatibilityWarning | null {
  if (!mount || !rotor) return null;
  if (mount === 'IS_MOUNT') {
    return warn(ruleId, 'warning', `IS mount needs an adapter (${end})`,
      `An IS mount always needs an IS-to-post-mount adapter to run a ${rotor.diameterMm}mm rotor.`,
      components, `IS-to-PM adapter for ${rotor.diameterMm}mm.`);
  }
  const native = nativeRotorFor(mount);
  if (native == null) return null;
  if (rotor.diameterMm === native) return null;
  if (rotor.diameterMm < native) {
    return warn(ruleId, 'critical', `Rotor too small for the ${end} mount`,
      `This ${end} mount is native ${native}mm; a ${rotor.diameterMm}mm rotor sits inside the caliper's sweep and cannot be adapted downwards.`,
      components);
  }
  return warn(ruleId, 'warning', `Adapter needed for the ${end} rotor`,
    `A ${rotor.diameterMm}mm rotor on a native ${native}mm mount needs a +${rotor.diameterMm - native}mm adapter. This is a normal, cheap part — the combination is legal.`,
    components, `+${rotor.diameterMm - native}mm post-mount adapter.`);
}

export function checkFrontRotorAdapter(fork?: Fork, rotor?: Rotor): CompatibilityWarning | null {
  return rotorAdapterCheck(fork?.brakeMountType, rotor, 'R-BRK-03', 'front', ['fork', 'frontRotor']);
}

export function checkRearRotorAdapter(frame?: Frame, rotor?: Rotor): CompatibilityWarning | null {
  return rotorAdapterCheck(frame?.rearBrakeMountType, rotor, 'R-BRK-03', 'rear', ['frame', 'rearRotor']);
}

/** R-BRK-04 — rotor size vs frame/fork maximum. */
export function checkRearRotorMax(frame?: Frame, rotor?: Rotor): CompatibilityWarning | null {
  if (!frame || !rotor || frame.maxRotorMmRear == null) return null;
  if (rotor.diameterMm <= frame.maxRotorMmRear) return null;
  return warn('R-BRK-04', 'critical', 'Rear rotor exceeds frame maximum',
    `${frame.brand} ${frame.name} is rated to ${frame.maxRotorMmRear}mm at the rear; this is a ${rotor.diameterMm}mm rotor. Exceeding it overloads the mount.`,
    ['frame', 'rearRotor']);
}

export function checkFrontRotorMax(fork?: Fork, rotor?: Rotor): CompatibilityWarning | null {
  if (!fork || !rotor || fork.maxRotorMm == null) return null;
  if (rotor.diameterMm <= fork.maxRotorMm) return null;
  return warn('R-BRK-04', 'critical', 'Front rotor exceeds fork maximum',
    `${fork.brand} ${fork.name} is rated to ${fork.maxRotorMm}mm; this is a ${rotor.diameterMm}mm rotor. Exceeding it overloads the lowers.`,
    ['fork', 'frontRotor']);
}

/** R-BRK-05 — rotor mount interface vs hub. */
export function checkRotorHubMount(wheelset?: Wheelset, rotor?: Rotor, slot: 'frontRotor' | 'rearRotor' = 'frontRotor'): CompatibilityWarning | null {
  if (!wheelset || !rotor) return null;
  if (wheelset.rotorMountStandard === rotor.mountStandard) return null;
  return warn('R-BRK-05', 'critical', 'Rotor mount mismatch',
    `${rotor.brand} ${rotor.name} is ${humanize(rotor.mountStandard)} but ${wheelset.brand} ${wheelset.name} hubs are ${humanize(wheelset.rotorMountStandard)}.`,
    ['wheelset', slot], 'A six-bolt-to-Centerlock adapter exists if you need to bridge these.');
}

/** R-BRK-06 — external Centerlock lockrings foul some thru-axle hubs. */
export function checkLockringClearance(wheelset?: Wheelset, rotor?: Rotor): CompatibilityWarning | null {
  if (!wheelset || !rotor || rotor.lockringType !== 'EXTERNAL') return null;
  if (wheelset.frontAxleType.startsWith('THRU_AXLE_15') || wheelset.frontAxleType.startsWith('THRU_AXLE_110')) {
    return warn('R-BRK-06', 'warning', 'External lockring may not clear this hub',
      `${rotor.brand} ${rotor.name} uses an external Centerlock lockring, which fouls some 15mm thru-axle hubs. An internal-spline lockring avoids the issue.`,
      ['wheelset', 'frontRotor'], 'Use an internal-spline Centerlock lockring.');
  }
  return null;
}

/** R-BRK-07 — DOT fluid and mineral oil are not interchangeable. */
export function checkBrakeFluid(lever?: BrakeLever, caliper?: BrakeCaliper): CompatibilityWarning | null {
  if (!lever || !caliper) return null;
  if (!lever.fluidType || !caliper.fluidType) return null;
  if (lever.fluidType === caliper.fluidType) return null;
  return warn('R-BRK-07', 'critical', 'Brake fluid types incompatible',
    `${lever.brand} ${lever.name} runs ${humanize(lever.fluidType)} and ${caliper.brand} ${caliper.name} runs ${humanize(caliper.fluidType)}. Mixing DOT and mineral oil destroys the seals in both.`,
    ['brakeLever', 'brakeCaliper']);
}

/** R-BRK-08 — lever and caliper must be a matched system. */
export function checkBrakeSystemFamily(lever?: BrakeLever, caliper?: BrakeCaliper): CompatibilityWarning | null {
  if (!lever || !caliper) return null;
  if (!lever.brakeSystemFamily || !caliper.brakeSystemFamily) return null;
  if (lever.brakeSystemFamily === caliper.brakeSystemFamily) return null;
  return warn('R-BRK-08', 'critical', 'Lever and caliper are different systems',
    `${lever.brand} ${lever.name} (${lever.brakeSystemFamily}) and ${caliper.brand} ${caliper.name} (${caliper.brakeSystemFamily}) have different piston ratios. Mixing them gives unpredictable lever feel and power.`,
    ['brakeLever', 'brakeCaliper']);
}

/** R-BRK-09 — mechanical lever with a hydraulic caliper. */
export function checkBrakeActuation(lever?: BrakeLever, caliper?: BrakeCaliper): CompatibilityWarning | null {
  if (!lever || !caliper) return null;
  // `?? true` used to mean an unpublished isHydraulic field was silently
  // guessed as "hydraulic" -- the exact thing this codebase's own design
  // philosophy says never to do with missing data. Concretely: a real
  // mechanical lever imported with isHydraulic unset, paired with a real
  // mechanical caliper, would compare (undefined ?? true) === (false ??
  // true) -> true !== false -> fired a CRITICAL "hydraulic/mechanical
  // mismatch" on a build that was actually fine. Abstaining when either
  // side is unknown is the correct behaviour, not a guess in either
  // direction.
  if (lever.isHydraulic == null || caliper.isHydraulic == null) return null;
  if (lever.isHydraulic === caliper.isHydraulic) return null;
  return warn('R-BRK-09', 'critical', 'Hydraulic and mechanical mismatch',
    `${lever.isHydraulic ? 'A hydraulic lever cannot pull a mechanical caliper' : 'A mechanical lever cannot drive a hydraulic caliper'} — ${lever.brand} ${lever.name} with ${caliper.brand} ${caliper.name}.`,
    ['brakeLever', 'brakeCaliper']);
}

/**
 * R-BRK-10 — pad shape is caliper-model specific.
 *
 * COMPATIBILITY_RULES.md previously documented this as a gated `critical`
 * check, but `padShape` (schema: `BrakeCaliper.padShape String?`) is free
 * text on the caliper alone -- nothing else in the data model carries a
 * comparable field to check it against, so there has never been a second
 * value here to compare. This is deliberately advisory-only (shown on the
 * part page), not a gap to close; the doc has been corrected to match.
 */
export function checkPadShape(caliper?: BrakeCaliper): CompatibilityWarning | null {
  return null;
}

/** R-BRK-11 — rotor thickness within the caliper's spec. */
export function checkRotorThickness(caliper?: BrakeCaliper, rotor?: Rotor, slot: 'frontRotor' | 'rearRotor' = 'rearRotor'): CompatibilityWarning | null {
  if (!caliper || !rotor || rotor.thicknessMm == null) return null;
  const min = caliper.minRotorThicknessMm;
  const max = caliper.maxRotorThicknessMm;
  if (min != null && rotor.thicknessMm < min) {
    return warn('R-BRK-11', 'warning', 'Rotor thinner than caliper spec',
      `${rotor.brand} ${rotor.name} is ${rotor.thicknessMm}mm; ${caliper.brand} ${caliper.name} expects at least ${min}mm. Expect excessive lever throw.`,
      ['brakeCaliper', slot]);
  }
  if (max != null && rotor.thicknessMm > max) {
    return warn('R-BRK-11', 'critical', 'Rotor too thick for caliper',
      `${rotor.brand} ${rotor.name} is ${rotor.thicknessMm}mm, over ${caliper.brand} ${caliper.name}'s ${max}mm maximum. The pads won't retract far enough.`,
      ['brakeCaliper', slot]);
  }
  return null;
}

/** R-BRK-12 — rim brakes need a braking surface on the rim. */
export function checkRimBrakeTrack(caliper?: BrakeCaliper, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!caliper || !wheelset) return null;
  if (caliper.mountType !== 'RIM_BRAKE') return null;
  if (wheelset.hasBrakeTrack) return null;
  return warn('R-BRK-12', 'critical', 'Rim brakes on disc-only wheels',
    `${caliper.brand} ${caliper.name} is a rim brake, but ${wheelset.brand} ${wheelset.name} has no machined brake track. There is nothing for the pads to grip.`,
    ['brakeCaliper', 'wheelset']);
}

// ============================================================
// 8. WHEELS ↔ TYRES
// ============================================================

function getClearanceForDiameter(
  frameOrFork: { wheelDiameter: WheelDiameter; maxTyreWidthMm: number; maxTyreWidthMm650b?: number | null },
  tyreDiameter: string
): number | null {
  if (tyreDiameter === frameOrFork.wheelDiameter) return frameOrFork.maxTyreWidthMm;
  if (tyreDiameter === 'ISO_584' && frameOrFork.maxTyreWidthMm650b != null) return frameOrFork.maxTyreWidthMm650b;
  return null;
}

/** R-TIR-01 + R-TIR-02 — rear: bead diameter, then clearance for that diameter. */
export function checkRearTyreClearance(frame?: Frame, wheelset?: Wheelset, tyre?: Tyre): CompatibilityWarning | null {
  if (!frame || !wheelset || !tyre) return null;
  if (tyre.wheelDiameter !== wheelset.wheelDiameter) {
    return warn('R-TIR-01', 'critical', 'Tyre diameter does not match wheel',
      `${tyre.brand} ${tyre.name} is a ${humanize(tyre.wheelDiameter)} tyre, but the ${wheelset.brand} ${wheelset.name} rear wheel is ${humanize(wheelset.wheelDiameter)}. A tyre's bead will not seat on a rim of the wrong diameter.`,
      ['wheelset', 'rearTyre']);
  }
  const limit = getClearanceForDiameter(frame, tyre.wheelDiameter);
  if (limit === null) {
    return warn('R-TIR-02', 'warning', 'Tyre clearance unverified',
      `${frame.brand} ${frame.name} has no published clearance figure for ${humanize(tyre.wheelDiameter)} wheels. Verify fit with the manufacturer before buying this tyre.`,
      ['frame', 'rearTyre']);
  }
  if (tyre.widthMm > limit) {
    return warn('R-TIR-02', 'critical', 'Rear tyre too wide for frame',
      `${tyre.brand} ${tyre.name} is ${tyre.widthMm}mm wide, but ${frame.brand} ${frame.name} only clears up to ${limit}mm at ${humanize(tyre.wheelDiameter)}. The tyre will rub the chainstays or seatstays.`,
      ['frame', 'rearTyre']);
  }
  return null;
}

/** R-TIR-01 + R-TIR-02 — front. */
export function checkFrontTyreClearance(fork?: Fork, wheelset?: Wheelset, tyre?: Tyre): CompatibilityWarning | null {
  if (!fork || !wheelset || !tyre) return null;
  if (tyre.wheelDiameter !== wheelset.wheelDiameter) {
    return warn('R-TIR-01', 'critical', 'Tyre diameter does not match wheel',
      `${tyre.brand} ${tyre.name} is a ${humanize(tyre.wheelDiameter)} tyre, but the ${wheelset.brand} ${wheelset.name} front wheel is ${humanize(wheelset.wheelDiameter)}. A tyre's bead will not seat on a rim of the wrong diameter.`,
      ['wheelset', 'frontTyre']);
  }
  const limit = getClearanceForDiameter(fork, tyre.wheelDiameter);
  if (limit === null) {
    return warn('R-TIR-02', 'warning', 'Tyre clearance unverified',
      `${fork.brand} ${fork.name} has no published clearance figure for ${humanize(tyre.wheelDiameter)} wheels. Verify fit with the manufacturer before buying this tyre.`,
      ['fork', 'frontTyre']);
  }
  if (tyre.widthMm > limit) {
    return warn('R-TIR-02', 'critical', 'Front tyre too wide for fork',
      `${tyre.brand} ${tyre.name} is ${tyre.widthMm}mm wide, but ${fork.brand} ${fork.name} only clears up to ${limit}mm at ${humanize(tyre.wheelDiameter)}. The tyre will rub the fork legs or crown.`,
      ['fork', 'frontTyre']);
  }
  return null;
}

/**
 * R-TIR-03 — tyre width against the rim's internal width.
 * ETRTO publishes a table; the widely used approximation is that a
 * tyre should measure roughly 1.4×–2.4× the internal rim width.
 */
export function checkTyreRimWidth(wheelset?: Wheelset, tyre?: Tyre, slot: 'frontTyre' | 'rearTyre' = 'rearTyre'): CompatibilityWarning | null {
  if (!wheelset || !tyre) return null;
  const min = wheelset.internalRimWidthMm * 1.4;
  const max = wheelset.internalRimWidthMm * 2.4;
  if (tyre.widthMm >= min && tyre.widthMm <= max) return null;
  const tooNarrow = tyre.widthMm < min;
  return warn('R-TIR-03', 'warning', `Tyre width outside the rim's recommended range`,
    `${tyre.brand} ${tyre.name} is ${tyre.widthMm}mm on a ${wheelset.internalRimWidthMm}mm internal rim (recommended roughly ${Math.round(min)}–${Math.round(max)}mm). ${tooNarrow ? 'Too narrow risks the bead unseating and pinches the casing square.' : 'Too wide gives a lightbulb profile and vague cornering.'}`,
    ['wheelset', slot]);
}

/** R-TIR-04 — hookless rims require tubeless tyres and cap pressure. */
export function checkHookless(wheelset?: Wheelset, tyre?: Tyre, slot: 'frontTyre' | 'rearTyre' = 'rearTyre'): CompatibilityWarning | null {
  if (!wheelset || !tyre || !wheelset.hookless) return null;
  if (!tyre.hooklessSafe) {
    return warn('R-TIR-04', 'critical', 'Tyre not approved for hookless rims',
      `${wheelset.brand} ${wheelset.name} is hookless, and ${tyre.brand} ${tyre.name} isn't listed as hookless-compatible. On a hookless rim only the bead's interference fit holds the tyre on — an unapproved tyre can blow off under pressure.`,
      ['wheelset', slot]);
  }
  const cap = wheelset.maxPressurePsi ?? 72;
  if (tyre.maxPressurePsi != null && tyre.maxPressurePsi > cap) {
    return warn('R-TIR-04', 'warning', 'Tyre pressure rating exceeds the rim',
      `${tyre.brand} ${tyre.name} is rated to ${tyre.maxPressurePsi}psi but this hookless rim caps at ${cap}psi. Inflate to the rim's limit, not the tyre's.`,
      ['wheelset', slot]);
  }
  return null;
}

/** R-TIR-05 — tubeless tyre on a non-tubeless rim. */
export function checkTubelessRim(wheelset?: Wheelset, tyre?: Tyre, slot: 'frontTyre' | 'rearTyre' = 'rearTyre'): CompatibilityWarning | null {
  if (!wheelset || !tyre) return null;
  if (!tyre.tubeless || wheelset.tubelessReady) return null;
  return warn('R-TIR-05', 'warning', 'Tubeless tyre on a non-tubeless rim',
    `${wheelset.brand} ${wheelset.name} isn't tubeless-ready. ${tyre.brand} ${tyre.name} will run fine with an inner tube, but can't be set up tubeless reliably.`,
    ['wheelset', slot]);
}

/** R-TIR-06 — valve hole drilling vs valve type. */
export function checkValveHole(wheelset?: Wheelset, tube?: Tube, slot: 'frontTube' | 'rearTube' = 'rearTube'): CompatibilityWarning | null {
  if (!wheelset || !tube || !wheelset.valveHoleType) return null;
  if (wheelset.valveHoleType === tube.valveType) return null;
  const schraderIntoPresta = tube.valveType === 'SCHRADER' && wheelset.valveHoleType === 'PRESTA';
  return warn('R-TIR-06', schraderIntoPresta ? 'critical' : 'warning', 'Valve type does not match rim drilling',
    `${wheelset.brand} ${wheelset.name} is drilled for ${humanize(wheelset.valveHoleType)} but this tube is ${humanize(tube.valveType)}. ${schraderIntoPresta ? 'A Schrader valve (8mm) will not pass through a Presta hole (6.5mm) without redrilling.' : 'A Presta valve in a Schrader hole rattles and needs a grommet.'}`,
    ['wheelset', slot]);
}

/** R-TIR-07 — valve stem long enough for the rim depth. */
export function checkValveLength(wheelset?: Wheelset, tube?: Tube, slot: 'frontTube' | 'rearTube' = 'rearTube'): CompatibilityWarning | null {
  if (!wheelset || !tube || wheelset.rimDepthMm == null) return null;
  if (tube.valveLengthMm >= wheelset.rimDepthMm + 10) return null;
  return warn('R-TIR-07', 'warning', 'Valve stem too short for the rim depth',
    `A ${tube.valveLengthMm}mm valve on a ${wheelset.rimDepthMm}mm deep rim leaves too little thread to fit a pump head. Aim for at least ${wheelset.rimDepthMm + 10}mm.`,
    ['wheelset', slot]);
}

/** R-TIR-08 — tube width range covers the tyre. */
export function checkTubeSize(tube?: Tube, tyre?: Tyre, slot: 'frontTube' | 'rearTube' = 'rearTube', tyreSlot: 'frontTyre' | 'rearTyre' = 'rearTyre'): CompatibilityWarning | null {
  if (!tube || !tyre) return null;
  if (tube.wheelDiameter !== tyre.wheelDiameter) {
    return warn('R-TIR-08', 'critical', 'Tube diameter does not match tyre',
      `${tube.brand} ${tube.name} is for ${humanize(tube.wheelDiameter)} but the tyre is ${humanize(tyre.wheelDiameter)}.`,
      [slot, tyreSlot]);
  }
  if (tyre.widthMm >= tube.minWidthMm && tyre.widthMm <= tube.maxWidthMm) return null;
  return warn('R-TIR-08', 'warning', 'Tube outside the tyre width range',
    `${tube.brand} ${tube.name} covers ${tube.minWidthMm}–${tube.maxWidthMm}mm; this tyre is ${tyre.widthMm}mm. Over-stretched tubes puncture more easily, over-sized ones fold.`,
    [slot, tyreSlot]);
}

/** R-TIR-09 — combined tyre and rim width vs frame clearance. */
export function checkRimPlusTyreClearance(frame?: Frame, wheelset?: Wheelset, tyre?: Tyre): CompatibilityWarning | null {
  if (!frame || !wheelset || !tyre) return null;
  const limit = getClearanceForDiameter(frame, tyre.wheelDiameter);
  if (limit == null) return null;
  // A wide rim pushes a tyre wider than its nominal marking.
  const estimated = tyre.widthMm + Math.max(0, (wheelset.internalRimWidthMm - 25) * 0.4);
  if (estimated <= limit) return null;
  return warn('R-TIR-09', 'warning', 'Tyre may measure wider than nominal on this rim',
    `${tyre.brand} ${tyre.name} is nominally ${tyre.widthMm}mm, but on a ${wheelset.internalRimWidthMm}mm internal rim it will measure nearer ${Math.round(estimated)}mm — against a ${limit}mm frame limit.`,
    ['frame', 'wheelset', 'rearTyre']);
}

// ============================================================
// 9. AXLES & HUBS
// ============================================================

/** R-AXL-01 — rear hub spacing. */
export function checkRearAxleMatch(frame?: Frame, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!frame || !wheelset) return null;
  if (frame.rearAxleType === wheelset.rearAxleType) return null;
  if (wheelset.convertibleEndCaps) {
    return warn('R-AXL-05', 'warning', 'Rear hub needs different end caps',
      `${wheelset.brand} ${wheelset.name} ships as ${humanize(wheelset.rearAxleType)} but converts to ${humanize(frame.rearAxleType)} with the correct end caps.`,
      ['frame', 'wheelset'], `End cap kit for ${humanize(frame.rearAxleType)}.`);
  }
  return warn('R-AXL-01', 'critical', 'Rear axle spacing mismatch',
    `${frame.brand} ${frame.name}'s rear triangle is spaced for ${humanize(frame.rearAxleType)}, but the ${wheelset.brand} ${wheelset.name} rear hub is ${humanize(wheelset.rearAxleType)}. The wheel won't sit between the dropouts.`,
    ['frame', 'wheelset']);
}

/** R-AXL-02 — front hub spacing. */
export function checkFrontAxleMatch(fork?: Fork, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!fork || !wheelset) return null;
  if (fork.frontAxleType === wheelset.frontAxleType) return null;
  if (wheelset.convertibleEndCaps) {
    return warn('R-AXL-05', 'warning', 'Front hub needs different end caps',
      `${wheelset.brand} ${wheelset.name} ships as ${humanize(wheelset.frontAxleType)} but converts to ${humanize(fork.frontAxleType)} with the correct end caps.`,
      ['fork', 'wheelset'], `End cap kit for ${humanize(fork.frontAxleType)}.`);
  }
  return warn('R-AXL-02', 'critical', 'Front axle spacing mismatch',
    `${fork.brand} ${fork.name} is spaced for ${humanize(fork.frontAxleType)}, but the ${wheelset.brand} ${wheelset.name} front hub is ${humanize(wheelset.frontAxleType)}. The fork's dropouts won't match the hub.`,
    ['fork', 'wheelset']);
}

/**
 * R-AXL-03 — thread pitch is frame-specific.
 *
 * COMPATIBILITY_RULES.md previously documented this as a `critical` check
 * comparing `axleThreadPitch`/`axleLengthMm` between frame and fork -- those
 * fields never existed in the schema, and axles in this catalogue are
 * bundled with the wheelset/hub rather than sold as their own part with a
 * comparable thread-pitch spec, so there is nothing to check it against.
 * (A former `checkAxleThread(frame, fork)` sat here comparing a frame's
 * REAR axle thread against a fork's FRONT axle thread -- unrelated ends of
 * the bike -- and was unconditional `return null` either way; it was also
 * never called from the aggregator. Deleted rather than fixed in place,
 * since there was no correct comparison to make it perform.)
 * What's left is a real, correctly-wired `info` notice below: flagging
 * that matching 12mm hub spacing does not by itself mean any 12mm axle
 * fits the frame's thread. The doc has been corrected to `info`, matching
 * what's actually implemented and everything the data model supports.
 */
export function checkRearAxleThreadPitch(frame?: Frame, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!frame || !wheelset || !frame.rearAxleThreadPitch) return null;
  if (frame.rearAxleThreadPitch === 'NONE_QR') return null;
  return warn('R-AXL-03', 'info', 'Check thru-axle thread pitch',
    `${frame.brand} ${frame.name} uses ${humanize(frame.rearAxleThreadPitch)} threading. Matching 12mm hub spacing does not mean any 12mm axle fits — the axle must match the frame's thread.`,
    ['frame']);
}

/** R-AXL-04 — dropout type. */
export function checkDropoutType(frame?: Frame, wheelset?: Wheelset): CompatibilityWarning | null {
  if (!frame || !wheelset || !frame.dropoutType) return null;
  const hubIsThru = wheelset.rearAxleType.startsWith('THRU_AXLE');
  const frameIsThru = frame.dropoutType === 'THRU_AXLE' || frame.dropoutType === 'UDH';
  if (hubIsThru === frameIsThru) return null;
  return warn('R-AXL-04', 'critical', 'Dropout type mismatch',
    `${frame.brand} ${frame.name} has ${humanize(frame.dropoutType)} dropouts but the wheel is ${hubIsThru ? 'thru-axle' : 'quick-release'}. These are different retention systems.`,
    ['frame', 'wheelset']);
}

// ============================================================
// 10. REAR SHOCK ↔ FRAME
// ============================================================

/** R-SHK-01 — eye-to-eye and stroke, zero tolerance. */
export function checkShockSize(frame?: Frame, shock?: RearShock): CompatibilityWarning | null {
  if (!frame || !shock) return null;
  if (frame.shockEyeToEyeMm == null || frame.shockStrokeMm == null) return null;
  if (frame.shockEyeToEyeMm === shock.eyeToEyeMm && frame.shockStrokeMm === shock.strokeMm) return null;
  return warn('R-SHK-01', 'critical', 'Shock size does not match frame',
    `${frame.brand} ${frame.name} takes ${frame.shockEyeToEyeMm}×${frame.shockStrokeMm}mm, but ${shock.brand} ${shock.name} is ${shock.eyeToEyeMm}×${shock.strokeMm}mm. There is no tolerance here — the wrong stroke either bottoms the linkage or wastes travel.`,
    ['frame', 'rearShock']);
}

/** R-SHK-02 — trunnion vs standard eyelet. */
export function checkShockMount(frame?: Frame, shock?: RearShock): CompatibilityWarning | null {
  if (!frame || !shock || !frame.shockMountType) return null;
  if (frame.shockMountType === shock.mountType) return null;
  return warn('R-SHK-02', 'critical', 'Shock mount type mismatch',
    `${frame.brand} ${frame.name} is ${humanize(frame.shockMountType)} but ${shock.brand} ${shock.name} is ${humanize(shock.mountType)}. Trunnion shocks bolt through the body; standard ones use an eyelet.`,
    ['frame', 'rearShock']);
}

/** R-SHK-03 — mounting hardware width and bushing diameter. */
export function checkShockHardware(frame?: Frame, shock?: RearShock): CompatibilityWarning | null {
  if (!frame || !shock) return null;
  if (frame.shockHardwareWidthMm != null && shock.hardwareWidthMm != null &&
      frame.shockHardwareWidthMm !== shock.hardwareWidthMm) {
    return warn('R-SHK-03', 'critical', 'Shock hardware width mismatch',
      `This frame needs ${frame.shockHardwareWidthMm}mm mounting hardware; the shock is supplied with ${shock.hardwareWidthMm}mm.`,
      ['frame', 'rearShock'], 'Correct-width bushing/hardware kit.');
  }
  if (frame.shockBushingDiameterMm != null && shock.bushingDiameterMm != null &&
      frame.shockBushingDiameterMm !== shock.bushingDiameterMm) {
    return warn('R-SHK-03', 'critical', 'Shock bushing diameter mismatch',
      `This frame uses ${frame.shockBushingDiameterMm}mm bushings; the shock has ${shock.bushingDiameterMm}mm.`,
      ['frame', 'rearShock'], 'Correct-diameter bushing kit.');
  }
  return null;
}

/** R-SHK-04 — metric vs imperial sizing. */
export function checkShockSizingStandard(frame?: Frame, shock?: RearShock): CompatibilityWarning | null {
  if (!frame || !shock || frame.shockEyeToEyeMm == null) return null;
  // Metric frames use round figures (230, 210, 205); imperial converts awkwardly.
  const frameLooksMetric = frame.shockEyeToEyeMm % 5 === 0;
  const shockIsMetric = shock.sizing === 'METRIC';
  if (frameLooksMetric === shockIsMetric) return null;
  return warn('R-SHK-04', 'critical', 'Metric and imperial shock sizing',
    `${shock.brand} ${shock.name} is ${humanize(shock.sizing)} sized, which doesn't match this frame's mounting dimensions.`,
    ['frame', 'rearShock']);
}

/** R-SHK-05 — piggyback reservoir clearance. */
export function checkShockReservoir(frame?: Frame, shock?: RearShock): CompatibilityWarning | null {
  if (!frame || !shock || !shock.hasReservoir) return null;
  return warn('R-SHK-05', 'warning', 'Check reservoir clearance',
    `${shock.brand} ${shock.name} has a piggyback reservoir. Confirm it clears ${frame.brand} ${frame.name}'s linkage and front triangle through full travel.`,
    ['frame', 'rearShock']);
}

/** R-SHK-06 — coil spring rate vs leverage ratio and rider weight. */
export function checkCoilSpringRate(frame?: Frame, shock?: RearShock, rider?: RiderProfile): CompatibilityWarning | null {
  if (!frame || !shock || !shock.isCoil || shock.springRate == null) return null;
  if (!rider?.weightKg || frame.leverageRatio == null || frame.shockStrokeMm == null) return null;
  // Target ~30% sag: required rate ≈ (weight × leverage) / (stroke × 0.3), in lb/in.
  const riderLb = rider.weightKg * 2.2;
  const required = Math.round((riderLb * frame.leverageRatio) / ((frame.shockStrokeMm / 25.4) * 0.3) / 10) * 10;
  if (Math.abs(shock.springRate - required) <= 75) return null;
  return warn('R-SHK-06', 'warning', 'Coil spring rate likely wrong',
    `A ${shock.springRate}lb spring against your ${rider.weightKg}kg and this frame's ${frame.leverageRatio}:1 leverage lands well off 30% sag — nearer ${required}lb would be right.`,
    ['frame', 'rearShock']);
}

/** R-SHK-07 — frame leverage curve suitability for coil. */
export function checkCoilSuitability(frame?: Frame, shock?: RearShock): CompatibilityWarning | null {
  if (!frame || !shock || !shock.isCoil) return null;
  if (frame.suitableForCoil !== false) return null;
  return warn('R-SHK-07', 'info', 'Frame not ideal for a coil shock',
    `${frame.brand} ${frame.name} has a fairly linear leverage curve, which coil shocks tend to bottom out on. An air shock with volume spacers suits it better.`,
    ['frame', 'rearShock']);
}

// ============================================================
// 11. SEATPOST & SADDLE
// ============================================================

/** R-SP-01 — seatpost diameter. */
export function checkSeatpostDiameter(frame?: Frame, seatpost?: Seatpost): CompatibilityWarning | null {
  if (!frame || !seatpost || frame.seatpostDiameterMm == null) return null;
  if (frame.seatpostDiameterMm === seatpost.diameterMm) return null;
  return warn('R-SP-01', 'critical', 'Seatpost diameter mismatch',
    `${frame.brand} ${frame.name} takes a ${frame.seatpostDiameterMm}mm post; ${seatpost.brand} ${seatpost.name} is ${seatpost.diameterMm}mm. ${seatpost.diameterMm < frame.seatpostDiameterMm ? 'A shim can bridge this, but only for the exact pairing.' : 'It simply will not enter the seat tube.'}`,
    ['frame', 'seatpost'],
    seatpost.diameterMm < frame.seatpostDiameterMm ? `Shim from ${seatpost.diameterMm}mm to ${frame.seatpostDiameterMm}mm.` : undefined);
}

/** R-SP-02 — dropper routing vs frame. */
export function checkDropperRouting(frame?: Frame, seatpost?: Seatpost): CompatibilityWarning | null {
  if (!frame || !seatpost || !seatpost.isDropper || !seatpost.routingType) return null;
  if (!frame.seatpostRouting) return null;
  // A wireless post (routing NONE) needs no port and fits any frame.
  if (seatpost.routingType === 'NONE') return null;
  if (frame.seatpostRouting === seatpost.routingType || frame.seatpostRouting === 'MIXED') return null;
  return warn('R-SP-02', 'critical', 'Dropper routing does not match frame',
    `${seatpost.brand} ${seatpost.name} needs ${humanize(seatpost.routingType)} routing but ${frame.brand} ${frame.name} is set up for ${frame.seatpostRouting === 'NONE' ? 'no dropper routing' : `${humanize(frame.seatpostRouting)} routing`}. ${seatpost.routingType === 'INTERNAL' ? 'There is no port in the seat tube for the cable.' : 'An externally routed post has nowhere to run on this frame.'}`,
    ['frame', 'seatpost']);
}

/**
 * R-SP-03 — insertion depth vs frame limit.
 *
 * Compares the post's *insertion length*, not its overall length —
 * the travel and the head sit above the collar, so a 440mm dropper
 * with 150mm of drop only buries about 230mm. Comparing total length
 * against max insertion excludes virtually every dropper made.
 */
export function checkSeatpostInsertion(frame?: Frame, seatpost?: Seatpost): CompatibilityWarning | null {
  if (!frame || !seatpost || frame.maxSeatpostInsertionMm == null) return null;
  const HEAD_AND_COLLAR_MM = 60;
  const insertion = seatpost.totalLengthMm - (seatpost.travelMm ?? 0) - HEAD_AND_COLLAR_MM;
  if (insertion <= frame.maxSeatpostInsertionMm) return null;
  return warn('R-SP-03', 'critical', 'Seatpost cannot insert far enough',
    `${seatpost.brand} ${seatpost.name} needs roughly ${Math.round(insertion)}mm of insertion, but ${frame.brand} ${frame.name} only allows ${frame.maxSeatpostInsertionMm}mm. It will bottom out inside the seat tube before reaching riding height.`,
    ['frame', 'seatpost']);
}

/** R-SP-04 — dropper travel vs rider inseam (advisory). */
export function checkDropperTravel(seatpost?: Seatpost, rider?: RiderProfile): CompatibilityWarning | null {
  if (!seatpost?.isDropper || seatpost.travelMm == null || !rider?.inseamCm) return null;
  // Very rough: usable drop is limited by inseam minus saddle height needs.
  const maxUsable = Math.round((rider.inseamCm - 60) * 10);
  if (seatpost.travelMm <= maxUsable) return null;
  return warn('R-SP-04', 'info', 'Dropper travel may exceed your usable range',
    `${seatpost.travelMm}mm of drop against a ${rider.inseamCm}cm inseam may not let you reach full pedalling height. Around ${maxUsable}mm is a safer bet.`,
    ['seatpost']);
}

/** R-SP-05 — seat clamp diameter vs seat tube OD. */
export function checkSeatClamp(frame?: Frame, clamp?: SeatClamp): CompatibilityWarning | null {
  if (!frame || !clamp || frame.seatClampDiameterMm == null) return null;
  if (frame.seatClampDiameterMm === clamp.diameterMm) return null;
  return warn('R-SP-05', 'critical', 'Seat clamp diameter mismatch',
    `${frame.brand} ${frame.name}'s seat tube is ${frame.seatClampDiameterMm}mm at the collar; this clamp is ${clamp.diameterMm}mm.`,
    ['frame', 'seatClamp']);
}

/** R-SP-06 — saddle rail type vs post clamp. */
export function checkSaddleRails(seatpost?: Seatpost, saddle?: Saddle): CompatibilityWarning | null {
  if (!seatpost || !saddle || !seatpost.railClampType) return null;
  if (seatpost.railClampType === saddle.railType) return null;
  return warn('R-SP-06', 'critical', 'Saddle rail type mismatch',
    `${saddle.brand} ${saddle.name} has ${humanize(saddle.railType)} rails but ${seatpost.brand} ${seatpost.name} clamps ${humanize(seatpost.railClampType)}. Oversized carbon rails need a dedicated clamp.`,
    ['seatpost', 'saddle']);
}

/** R-SP-07 — dropper remote actuation type. */
export function checkDropperRemote(seatpost?: Seatpost): CompatibilityWarning | null {
  if (!seatpost?.isDropper || !seatpost.remoteType) return null;
  if (seatpost.remoteType === 'NONE') {
    return warn('R-SP-07', 'warning', 'Dropper has no remote specified',
      `${seatpost.brand} ${seatpost.name} needs a remote lever matched to its actuation. Check whether one is included.`,
      ['seatpost']);
  }
  return null;
}

// ============================================================
// 12. COCKPIT
// ============================================================

/** R-CKP-01 — stem clamp vs bar diameter. */
export function checkStemBarClamp(stem?: Stem, handlebar?: Handlebar): CompatibilityWarning | null {
  if (!stem || !handlebar) return null;
  if (stem.barClampDiameterMm === handlebar.clampDiameterMm) return null;
  return warn('R-CKP-01', 'critical', 'Stem and bar clamp diameter mismatch',
    `${stem.brand} ${stem.name} clamps ${stem.barClampDiameterMm}mm bars but ${handlebar.brand} ${handlebar.name} is ${handlebar.clampDiameterMm}mm. Shimming a 31.8mm bar into a 35mm stem is not safe.`,
    ['stem', 'handlebar']);
}

/** R-CKP-02 — stem steerer clamp vs fork steerer. */
export function checkStemSteerer(fork?: Fork, stem?: Stem): CompatibilityWarning | null {
  if (!fork || !stem) return null;
  // Modern tapered steerers are 1-1/8" (28.6mm) at the stem clamp.
  const steererTop = fork.steererTubeTaper === 'STRAIGHT_1_5' ? 38.1 : 28.6;
  if (Math.abs(stem.steererClampMm - steererTop) < 0.5) return null;
  return warn('R-CKP-02', 'critical', 'Stem does not fit this steerer',
    `${stem.brand} ${stem.name} clamps ${stem.steererClampMm}mm, but ${fork.brand} ${fork.name}'s steerer is ${steererTop}mm at the stem.`,
    ['fork', 'stem']);
}

/** R-CKP-03 — control clamp area diameter (22.2mm on MTB bars). */
export function checkControlClampDiameter(handlebar?: Handlebar, shifter?: Shifter, lever?: BrakeLever): CompatibilityWarning | null {
  if (!handlebar) return null;
  const control = shifter?.clampDiameterMm ?? lever?.clampDiameterMm;
  if (control == null) return null;
  if (Math.abs(control - handlebar.controlClampDiameterMm) < 0.5) return null;
  return warn('R-CKP-03', 'critical', 'Controls do not fit the bar',
    `This bar's control area is ${handlebar.controlClampDiameterMm}mm but the shifter/lever clamps ${control}mm.`,
    ['handlebar', shifter ? 'shifter' : 'brakeLever']);
}

/** R-CKP-04 — drop-bar vs flat-bar controls. */
export function checkBarControlType(handlebar?: Handlebar, shifter?: Shifter, lever?: BrakeLever): CompatibilityWarning | null {
  if (!handlebar) return null;
  const barIsDrop = handlebar.barType === 'DROP' || handlebar.barType === 'AERO';
  const controlType = shifter?.barType ?? lever?.barType;
  if (!controlType) return null;
  const controlIsDrop = controlType === 'DROP' || controlType === 'AERO';
  if (barIsDrop === controlIsDrop) return null;
  return warn('R-CKP-04', 'critical', 'Controls are for a different bar type',
    `${handlebar.brand} ${handlebar.name} is a ${humanize(handlebar.barType)} bar, but these controls are made for ${controlIsDrop ? 'drop' : 'flat'} bars.`,
    ['handlebar', shifter ? 'shifter' : 'brakeLever']);
}

/** R-CKP-05 — integrated cockpits remove the stem/bar interface. */
export function checkIntegratedCockpit(stem?: Stem, handlebar?: Handlebar): CompatibilityWarning | null {
  if (!stem?.integratedCockpit || !handlebar) return null;
  return warn('R-CKP-05', 'info', 'Integrated cockpit already includes a bar',
    `${stem.brand} ${stem.name} is a one-piece cockpit — a separate handlebar isn't needed and can't be fitted.`,
    ['stem', 'handlebar']);
}

/** R-CKP-06 — internally routed bars need matching bores. */
export function checkBarInternalRouting(handlebar?: Handlebar, frame?: Frame): CompatibilityWarning | null {
  if (!handlebar?.internalRouting || !frame) return null;
  if (frame.cableRouting === 'INTERNAL' || frame.cableRouting === 'MIXED') return null;
  return warn('R-CKP-06', 'warning', 'Internally routed bar on an externally routed frame',
    `${handlebar.brand} ${handlebar.name} routes cables internally, but ${frame.brand} ${frame.name} ${frame.cableRouting === 'NONE' ? 'has no internal routing' : 'is externally routed'}. The cables have to exit somewhere.`,
    ['handlebar', 'frame']);
}

/** R-CKP-07 — stem length and bar width are fit choices (advisory). */
export function checkCockpitFit(stem?: Stem, handlebar?: Handlebar): CompatibilityWarning | null {
  return null; // No universal threshold; surfaced as spec data instead.
}

// ============================================================
// 13. PEDALS & SHOES
// ============================================================

/** R-PDL-01 — pedal thread vs crank. */
export function checkPedalThread(crankset?: Crankset, pedal?: Pedal): CompatibilityWarning | null {
  if (!crankset || !pedal || !crankset.pedalThread) return null;
  if (crankset.pedalThread === pedal.thread) return null;
  return warn('R-PDL-01', 'critical', 'Pedal thread mismatch',
    `${crankset.brand} ${crankset.name} is threaded ${humanize(crankset.pedalThread)} but ${pedal.brand} ${pedal.name} is ${humanize(pedal.thread)}. Forcing the wrong thread destroys the crank arm.`,
    ['crankset', 'pedal']);
}

/** R-PDL-02 — cleat system vs pedal (shoe side handled by R-PDL-03). */
export function checkCleatSystem(pedal?: Pedal, shoe?: Shoe): CompatibilityWarning | null {
  if (!pedal || !shoe) return null;
  if (pedal.cleatSystem === 'FLAT_NONE') return null;
  if (shoe.soleDrilling === 'FLAT_NONE') {
    return warn('R-PDL-02', 'critical', 'Flat shoes with clipless pedals',
      `${pedal.brand} ${pedal.name} is a ${humanize(pedal.cleatSystem)} clipless pedal, but ${shoe.brand} ${shoe.name} has no cleat mounting at all.`,
      ['pedal', 'shoe']);
  }
  return null;
}

/** R-PDL-03 — sole drilling vs cleat pattern. */
export function checkSoleDrilling(pedal?: Pedal, shoe?: Shoe): CompatibilityWarning | null {
  if (!pedal || !shoe) return null;
  const twoBolt = ['SPD', 'CRANK_BROTHERS', 'TIME'];
  const threeBolt = ['SPD_SL', 'LOOK_KEO'];
  const needsTwo = twoBolt.includes(pedal.cleatSystem);
  const needsThree = threeBolt.includes(pedal.cleatSystem);
  if (!needsTwo && !needsThree) return null;
  const has = shoe.soleDrilling;
  if (has === 'TWO_AND_THREE_BOLT') return null;
  if (needsTwo && has === 'TWO_BOLT') return null;
  if (needsThree && has === 'THREE_BOLT') return null;
  return warn('R-PDL-03', 'critical', 'Shoe sole drilling does not match cleat',
    `${pedal.brand} ${pedal.name} uses a ${needsTwo ? '2-bolt' : '3-bolt'} cleat, but ${shoe.brand} ${shoe.name} is drilled ${humanize(has)}.`,
    ['pedal', 'shoe']);
}

// ============================================================
// 14. FRONT DERAILLEUR
// ============================================================

/** R-FD-01 — front derailleur mount type. */
export function checkFdMount(frame?: Frame, fd?: FrontDerailleur): CompatibilityWarning | null {
  if (!frame || !fd || !frame.fdMountType) return null;
  if (frame.fdMountType === fd.mountType) return null;
  return warn('R-FD-01', 'critical', 'Front derailleur mount mismatch',
    `${frame.brand} ${frame.name} has a ${humanize(frame.fdMountType)} front derailleur mount, but ${fd.brand} ${fd.name} is ${humanize(fd.mountType)}.`,
    ['frame', 'frontDerailleur']);
}

/** R-FD-02 — top-pull vs bottom-pull routing. */
export function checkFdPullDirection(frame?: Frame, fd?: FrontDerailleur): CompatibilityWarning | null {
  if (!frame || !fd || !frame.fdPullDirection) return null;
  if (fd.pullDirection === 'DUAL_PULL' || frame.fdPullDirection === 'DUAL_PULL') return null;
  if (frame.fdPullDirection === fd.pullDirection) return null;
  return warn('R-FD-02', 'critical', 'Front derailleur pull direction mismatch',
    `This frame routes the front shift cable ${humanize(frame.fdPullDirection)}, but ${fd.brand} ${fd.name} is ${humanize(fd.pullDirection)}.`,
    ['frame', 'frontDerailleur']);
}

/** R-FD-03 — max chainring within FD spec. */
export function checkFdChainring(fd?: FrontDerailleur, chainring?: Chainring): CompatibilityWarning | null {
  if (!fd || !chainring || fd.maxChainringTeeth == null) return null;
  if (chainring.teeth <= fd.maxChainringTeeth) return null;
  return warn('R-FD-03', 'warning', 'Chainring too large for front derailleur',
    `${fd.brand} ${fd.name} handles up to ${fd.maxChainringTeeth}t; this ring is ${chainring.teeth}t. The cage won't clear the teeth.`,
    ['frontDerailleur', 'chainring']);
}

/** R-FD-04 — front derailleur speed count vs shifter. */
export function checkFdSpeeds(shifter?: Shifter, fd?: FrontDerailleur): CompatibilityWarning | null {
  if (!shifter || !fd) return null;
  if (shifter.speeds === fd.speeds) return null;
  return warn('R-FD-04', 'warning', 'Front derailleur speed mismatch',
    `${fd.brand} ${fd.name} is specified for ${fd.speeds}-speed but the shifter is ${shifter.speeds}-speed. Cage width and pull may not suit.`,
    ['shifter', 'frontDerailleur']);
}

// ============================================================
// 15. FRAME MOUNTS & ROUTING
// ============================================================

/** R-MNT-01 — chain guide needs ISCG tabs. */
export function checkChainGuideMount(frame?: Frame, guide?: ChainGuide): CompatibilityWarning | null {
  if (!frame || !guide || !frame.iscgStandard) return null;
  if (guide.mountStandard === 'BB_MOUNT') return null; // clamps under the BB, no tabs needed
  if (frame.iscgStandard === guide.mountStandard) return null;
  return warn('R-MNT-01', 'critical', 'Chain guide mount mismatch',
    `${guide.brand} ${guide.name} needs ${humanize(guide.mountStandard)} tabs, but ${frame.brand} ${frame.name} has ${frame.iscgStandard === 'NONE' ? 'no ISCG tabs' : `${humanize(frame.iscgStandard)} tabs`}. A BB-mount guide would work instead.`,
    ['frame', 'chainGuide']);
}

/** R-MNT-02 — internal vs external cable routing. */
export function checkCableRouting(frame?: Frame, shifter?: Shifter): CompatibilityWarning | null {
  if (!frame || !shifter || !frame.cableRouting) return null;
  if (['ELECTRONIC_AXS', 'ELECTRONIC_DI2', 'ELECTRONIC_EPS'].includes(shifter.cablePullStandard)) {
    if (frame.cableRouting === 'EXTERNAL') {
      return warn('R-MNT-02', 'info', 'Wireless drivetrain on an externally routed frame',
        `${shifter.brand} ${shifter.name} is wireless, so this frame's external routing simply goes unused.`,
        ['frame', 'shifter']);
    }
  }
  return null;
}

/** R-MNT-03 — hydraulic hose vs cable stops. */
export function checkHosePorts(frame?: Frame, lever?: BrakeLever): CompatibilityWarning | null {
  if (!frame || !lever || !frame.cableRouting) return null;
  // Same abstain-on-unknown fix as R-BRK-09: guessing "hydraulic" for an
  // unpublished isHydraulic would surface a hose-routing reminder on a
  // build that might be running a mechanical lever with no hose at all.
  if (lever.isHydraulic == null || !lever.isHydraulic) return null;
  if (frame.cableRouting === 'EXTERNAL') {
    return warn('R-MNT-03', 'warning', 'Check hydraulic hose routing',
      `${frame.brand} ${frame.name} is externally routed. Hydraulic hose needs full-length guides rather than open cable stops.`,
      ['frame', 'brakeLever']);
  }
  return null;
}

/** R-MNT-04 — bottle cage mounts. */
export function checkBottleMounts(frame?: Frame): CompatibilityWarning | null {
  if (!frame || frame.bottleMounts == null) return null;
  if (frame.bottleMounts > 0) return null;
  return warn('R-MNT-04', 'info', 'No bottle cage mounts',
    `${frame.brand} ${frame.name} has no bottle bosses — you'll need a strap-on cage or hydration pack.`,
    ['frame']);
}

/** R-MNT-05 — rack and fender eyelets. */
export function checkEyelets(frame?: Frame): CompatibilityWarning | null {
  if (!frame) return null;
  if (frame.hasEyelets) return null;
  return warn('R-MNT-05', 'info', 'No rack or fender eyelets',
    `${frame.brand} ${frame.name} has no eyelets, so racks and full fenders need clamp-on mounts.`,
    ['frame']);
}

/** R-MNT-06 — compressionless housing for mechanical brakes. */
export function checkHousingType(lever?: BrakeLever): CompatibilityWarning | null {
  if (!lever || !lever.requiresCompressionless) return null;
  return warn('R-MNT-06', 'warning', 'Needs compressionless housing',
    `${lever.brand} ${lever.name} is mechanical and requires compressionless brake housing — standard shift housing compresses and gives a spongy lever.`,
    ['brakeLever'], 'Compressionless brake housing.');
}

// ============================================================
// 16. RIDER FIT — advisory only, never blocks
// ============================================================

/** R-FIT-01 — frame size vs rider height. */
export function checkFrameSizeHeight(frame?: Frame, rider?: RiderProfile): CompatibilityWarning | null {
  if (!frame || !rider?.heightCm) return null;
  if (frame.riderMinHeightCm == null || frame.riderMaxHeightCm == null) return null;
  if (rider.heightCm >= frame.riderMinHeightCm && rider.heightCm <= frame.riderMaxHeightCm) return null;
  const tooSmall = rider.heightCm > frame.riderMaxHeightCm;
  return warn('R-FIT-01', 'warning', 'Frame size may not suit your height',
    `${frame.brand} ${frame.name}${frame.frameSize ? ` (${frame.frameSize})` : ''} is listed for riders ${frame.riderMinHeightCm}–${frame.riderMaxHeightCm}cm; you're ${rider.heightCm}cm. Consider sizing ${tooSmall ? 'up' : 'down'}.`,
    ['frame']);
}

/** R-FIT-02 — standover clearance vs inseam. */
export function checkStandover(frame?: Frame, rider?: RiderProfile): CompatibilityWarning | null {
  if (!frame || !rider?.inseamCm || frame.standoverMm == null) return null;
  const inseamMm = rider.inseamCm * 10;
  if (inseamMm - frame.standoverMm >= 25) return null;
  return warn('R-FIT-02', 'warning', 'Insufficient standover clearance',
    `${frame.brand} ${frame.name} has ${frame.standoverMm}mm standover against your ${inseamMm}mm inseam — under the ~25mm of clearance you want when stepping off.`,
    ['frame']);
}

/** R-FIT-03 — reach/stack (advisory). */
export function checkReachStack(frame?: Frame, rider?: RiderProfile): CompatibilityWarning | null {
  if (!frame || !rider?.heightCm || frame.reachMm == null) return null;
  return null; // Preference-driven; shown as spec data rather than judged.
}

// R-FIT-04 (crank length vs leg length) is implemented as checkCrankLength
// above, filed under R-CRK-04 -- this used to be a same-behaviour wrapper
// under a second rule ID, never called from the aggregator (confirmed: no
// callers anywhere in the codebase). Deleted rather than wired in, since
// calling both would double-report the identical warning under two IDs.
// COMPATIBILITY_RULES.md's R-FIT-04 row now points at R-CRK-04 directly.

// ============================================================
// AGGREGATOR
// ============================================================

export function getCompatibilityWarnings(build: BikeBuild): CompatibilityWarning[] {
  const b = build;
  const r = b.rider;
  return [
    // 1. Frame ↔ fork
    checkHeadsetTaper(b.frame, b.fork),
    checkHeadsetCups(b.frame, b.headset),
    checkCrownRace(b.fork, b.headset),
    checkSteererLength(b.frame, b.fork, b.headset, b.stem),
    checkForkTravel(b.frame, b.fork),
    checkAxleToCrown(b.frame, b.fork),
    checkForkWheelDiameter(b.frame, b.fork),
    checkRigidForkCorrection(b.frame, b.fork),
    checkForkOffset(b.frame, b.fork),
    // 2. BB / crank
    checkBbShellMatch(b.frame, b.bottomBracket),
    checkSpindleMatch(b.bottomBracket, b.crankset),
    checkBbShellWidth(b.frame, b.bottomBracket),
    checkBbThreadDirection(b.frame, b.bottomBracket),
    checkSpindleLength(b.frame, b.crankset),
    checkChainline(b.crankset, b.wheelset),
    checkChainringClearance(b.frame, b.chainring, b.crankset),
    checkQFactor(b.frame, b.crankset),
    checkCrankLength(b.crankset, r),
    // 3. Chainring
    checkChainringMount(b.crankset, b.chainring),
    checkChainringOffset(b.chainring, b.wheelset),
    checkNarrowWide(b.crankset, b.chainring, b.frontDerailleur),
    // 4. Drivetrain
    checkShifterDerailleurPull(b.shifter, b.rearDerailleur),
    checkShifterDerailleurSpeeds(b.shifter, b.rearDerailleur),
    checkElectronicEcosystem(b.shifter, b.rearDerailleur),
    checkMaxCog(b.rearDerailleur, b.cassette),
    checkTotalCapacity(b.rearDerailleur, b.cassette, b.crankset, b.chainring),
    checkCageLength(b.rearDerailleur, b.cassette),
    checkChainSpeeds(b.chain, b.cassette),
    checkChainStandard(b.chain, b.cassette, b.rearDerailleur),
    checkChainLength(b.chain, b.cassette, b.chainring, b.frame),
    checkCassetteShifterSpeeds(b.shifter, b.cassette),
    // 5. Freehub
    checkFreehubBody(b.wheelset, b.cassette),
    checkXdrSpacer(b.wheelset, b.cassette),
    checkHgSpacer(b.wheelset, b.cassette),
    // 6. Hanger
    checkUdhTransmission(b.frame, b.rearDerailleur),
    checkHangerFit(b.frame, b.derailleurHanger),
    checkDerailleurMount(b.frame, b.rearDerailleur),
    // 7. Brakes
    checkRearBrakeMount(b.frame, b.brakeCaliper),
    checkFrontBrakeMount(b.fork, b.brakeCaliper),
    checkFrontRotorAdapter(b.fork, b.frontRotor),
    checkRearRotorAdapter(b.frame, b.rearRotor),
    checkRearRotorMax(b.frame, b.rearRotor),
    checkFrontRotorMax(b.fork, b.frontRotor),
    checkRotorHubMount(b.wheelset, b.frontRotor, 'frontRotor'),
    checkRotorHubMount(b.wheelset, b.rearRotor, 'rearRotor'),
    checkLockringClearance(b.wheelset, b.frontRotor),
    checkBrakeFluid(b.brakeLever, b.brakeCaliper),
    checkBrakeSystemFamily(b.brakeLever, b.brakeCaliper),
    checkBrakeActuation(b.brakeLever, b.brakeCaliper),
    checkPadShape(b.brakeCaliper),
    checkRotorThickness(b.brakeCaliper, b.frontRotor, 'frontRotor'),
    checkRotorThickness(b.brakeCaliper, b.rearRotor, 'rearRotor'),
    checkRimBrakeTrack(b.brakeCaliper, b.wheelset),
    // 8. Wheels / tyres
    checkRearTyreClearance(b.frame, b.wheelset, b.rearTyre),
    checkFrontTyreClearance(b.fork, b.wheelset, b.frontTyre),
    checkTyreRimWidth(b.wheelset, b.rearTyre, 'rearTyre'),
    checkTyreRimWidth(b.wheelset, b.frontTyre, 'frontTyre'),
    checkHookless(b.wheelset, b.rearTyre, 'rearTyre'),
    checkHookless(b.wheelset, b.frontTyre, 'frontTyre'),
    checkTubelessRim(b.wheelset, b.rearTyre, 'rearTyre'),
    checkTubelessRim(b.wheelset, b.frontTyre, 'frontTyre'),
    // Each end checked independently -- a `??` fallback here used to mean
    // that whenever a front tube was picked, a rear tube (and any mismatch
    // on it, e.g. Schrader into a Presta-drilled rim) was never validated
    // at all, and the two fallbacks could pair a tube from one end against
    // a tyre from the other.
    checkValveHole(b.wheelset, b.frontTube, 'frontTube'),
    checkValveHole(b.wheelset, b.rearTube, 'rearTube'),
    checkValveLength(b.wheelset, b.frontTube, 'frontTube'),
    checkValveLength(b.wheelset, b.rearTube, 'rearTube'),
    checkTubeSize(b.frontTube, b.frontTyre, 'frontTube', 'frontTyre'),
    checkTubeSize(b.rearTube, b.rearTyre, 'rearTube', 'rearTyre'),
    checkRimPlusTyreClearance(b.frame, b.wheelset, b.rearTyre),
    // 9. Axles
    checkRearAxleMatch(b.frame, b.wheelset),
    checkFrontAxleMatch(b.fork, b.wheelset),
    checkRearAxleThreadPitch(b.frame, b.wheelset),
    checkDropoutType(b.frame, b.wheelset),
    // 10. Shock
    checkShockSize(b.frame, b.rearShock),
    checkShockMount(b.frame, b.rearShock),
    checkShockHardware(b.frame, b.rearShock),
    checkShockSizingStandard(b.frame, b.rearShock),
    checkShockReservoir(b.frame, b.rearShock),
    checkCoilSpringRate(b.frame, b.rearShock, r),
    checkCoilSuitability(b.frame, b.rearShock),
    // 11. Seatpost / saddle
    checkSeatpostDiameter(b.frame, b.seatpost),
    checkDropperRouting(b.frame, b.seatpost),
    checkSeatpostInsertion(b.frame, b.seatpost),
    checkDropperTravel(b.seatpost, r),
    checkSeatClamp(b.frame, b.seatClamp),
    checkSaddleRails(b.seatpost, b.saddle),
    checkDropperRemote(b.seatpost),
    // 12. Cockpit
    checkStemBarClamp(b.stem, b.handlebar),
    checkStemSteerer(b.fork, b.stem),
    checkControlClampDiameter(b.handlebar, b.shifter, b.brakeLever),
    checkBarControlType(b.handlebar, b.shifter, b.brakeLever),
    checkIntegratedCockpit(b.stem, b.handlebar),
    checkBarInternalRouting(b.handlebar, b.frame),
    checkCockpitFit(b.stem, b.handlebar),
    // 13. Pedals
    checkPedalThread(b.crankset, b.pedal),
    checkCleatSystem(b.pedal, b.shoe),
    checkSoleDrilling(b.pedal, b.shoe),
    // 14. Front derailleur
    checkFdMount(b.frame, b.frontDerailleur),
    checkFdPullDirection(b.frame, b.frontDerailleur),
    checkFdChainring(b.frontDerailleur, b.chainring),
    checkFdSpeeds(b.shifter, b.frontDerailleur),
    // 15. Mounts & routing
    checkChainGuideMount(b.frame, b.chainGuide),
    checkCableRouting(b.frame, b.shifter),
    checkHosePorts(b.frame, b.brakeLever),
    checkBottleMounts(b.frame),
    checkEyelets(b.frame),
    checkHousingType(b.brakeLever),
    // 16. Fit
    checkFrameSizeHeight(b.frame, r),
    checkStandover(b.frame, r),
    checkReachStack(b.frame, r),
  ].filter((w): w is CompatibilityWarning => w !== null);
}

export function isBuildCompatible(build: BikeBuild): boolean {
  return getCompatibilityWarnings(build).every((w) => w.severity !== 'critical');
}

// ============================================================
// LOCKOUT / FILTER LAYER
//
// A candidate is locked out only when adding it would produce a
// `critical` warning. Warnings and info never hide a part — that
// distinction is what stops adapter-resolvable pairings (rotor
// sizes, end caps, spacers) from silently disappearing.
// ============================================================

function noCritical(...warnings: (CompatibilityWarning | null)[]): boolean {
  return warnings.every((w) => w === null || w.severity !== 'critical');
}

export function filterCompatibleForks(build: BikeBuild, candidates: Fork[]): Fork[] {
  return candidates.filter((fork) => noCritical(
    checkHeadsetTaper(build.frame, fork),
    checkForkTravel(build.frame, fork),
    checkForkWheelDiameter(build.frame, fork),
    checkFrontBrakeMount(fork, build.brakeCaliper),
    checkFrontAxleMatch(fork, build.wheelset),
    checkFrontTyreClearance(fork, build.wheelset, build.frontTyre),
    checkSteererLength(build.frame, fork, build.headset, build.stem),
    checkStemSteerer(fork, build.stem),
    checkFrontRotorMax(fork, build.frontRotor),
    // Was missing: a fork incompatible with an already-picked headset's
    // crown race (critical, per R-HS-03) stayed selectable here even
    // though the whole-build verdict would flag it the moment it landed.
    checkCrownRace(fork, build.headset),
  ));
}

export function filterCompatibleBottomBrackets(build: BikeBuild, candidates: BottomBracket[]): BottomBracket[] {
  return candidates.filter((bb) => noCritical(
    checkBbShellMatch(build.frame, bb),
    checkBbShellWidth(build.frame, bb),
    checkBbThreadDirection(build.frame, bb),
    checkSpindleMatch(bb, build.crankset),
  ));
}

export function filterCompatibleCranksets(build: BikeBuild, candidates: Crankset[]): Crankset[] {
  return candidates.filter((crankset) => noCritical(
    checkSpindleMatch(build.bottomBracket, crankset),
    checkChainringClearance(build.frame, build.chainring, crankset),
    checkChainringMount(crankset, build.chainring),
    checkPedalThread(crankset, build.pedal),
  ));
}

export function filterCompatibleChainrings(build: BikeBuild, candidates: Chainring[]): Chainring[] {
  return candidates.filter((ring) => noCritical(
    checkChainringMount(build.crankset, ring),
    checkChainringClearance(build.frame, ring, build.crankset),
  ));
}

export function filterCompatibleWheelsets(build: BikeBuild, candidates: Wheelset[]): Wheelset[] {
  return candidates.filter((wheelset) => noCritical(
    checkRearAxleMatch(build.frame, wheelset),
    checkFrontAxleMatch(build.fork, wheelset),
    checkDropoutType(build.frame, wheelset),
    checkFreehubBody(wheelset, build.cassette),
    // Both rotors and both tyres, not just one side of each: a candidate
    // that clashed with an already-picked rearRotor or frontTyre used to
    // stay selectable here (only frontRotor/rearTyre were checked),
    // contradicting the "incompatible parts don't appear in the list"
    // promise from PROJECT_CONTEXT.md.
    checkRotorHubMount(wheelset, build.frontRotor, 'frontRotor'),
    checkRotorHubMount(wheelset, build.rearRotor, 'rearRotor'),
    checkRimBrakeTrack(build.brakeCaliper, wheelset),
    checkHookless(wheelset, build.rearTyre, 'rearTyre'),
    checkHookless(wheelset, build.frontTyre, 'frontTyre'),
  ));
}

export function filterCompatibleRearTyres(build: BikeBuild, candidates: Tyre[]): Tyre[] {
  return candidates.filter((tyre) => noCritical(
    checkRearTyreClearance(build.frame, build.wheelset, tyre),
    checkHookless(build.wheelset, tyre, 'rearTyre'),
  ));
}

export function filterCompatibleFrontTyres(build: BikeBuild, candidates: Tyre[]): Tyre[] {
  return candidates.filter((tyre) => noCritical(
    checkFrontTyreClearance(build.fork, build.wheelset, tyre),
    checkHookless(build.wheelset, tyre, 'frontTyre'),
  ));
}

export function filterCompatibleTubes(build: BikeBuild, candidates: Tube[]): Tube[] {
  return candidates.filter((tube) => noCritical(
    checkTubeSize(tube, build.frontTyre ?? build.rearTyre),
    checkValveHole(build.wheelset, tube),
  ));
}

export function filterCompatibleBrakeCalipers(build: BikeBuild, candidates: BrakeCaliper[]): BrakeCaliper[] {
  return candidates.filter((caliper) => noCritical(
    checkRearBrakeMount(build.frame, caliper),
    checkFrontBrakeMount(build.fork, caliper),
    checkBrakeFluid(build.brakeLever, caliper),
    checkBrakeSystemFamily(build.brakeLever, caliper),
    checkBrakeActuation(build.brakeLever, caliper),
    checkRimBrakeTrack(caliper, build.wheelset),
  ));
}

export function filterCompatibleBrakeLevers(build: BikeBuild, candidates: BrakeLever[]): BrakeLever[] {
  return candidates.filter((lever) => noCritical(
    checkBrakeFluid(lever, build.brakeCaliper),
    checkBrakeSystemFamily(lever, build.brakeCaliper),
    checkBrakeActuation(lever, build.brakeCaliper),
    checkControlClampDiameter(build.handlebar, build.shifter, lever),
    checkBarControlType(build.handlebar, build.shifter, lever),
  ));
}

export function filterCompatibleRotors(build: BikeBuild, candidates: Rotor[], end: 'front' | 'rear'): Rotor[] {
  return candidates.filter((rotor) => noCritical(
    checkRotorHubMount(build.wheelset, rotor, end === 'front' ? 'frontRotor' : 'rearRotor'),
    end === 'front' ? checkFrontRotorMax(build.fork, rotor) : checkRearRotorMax(build.frame, rotor),
    end === 'front' ? checkFrontRotorAdapter(build.fork, rotor) : checkRearRotorAdapter(build.frame, rotor),
    checkRotorThickness(build.brakeCaliper, rotor),
  ));
}

export function filterCompatibleShifters(build: BikeBuild, candidates: Shifter[]): Shifter[] {
  return candidates.filter((shifter) => noCritical(
    checkShifterDerailleurPull(shifter, build.rearDerailleur),
    checkShifterDerailleurSpeeds(shifter, build.rearDerailleur),
    checkElectronicEcosystem(shifter, build.rearDerailleur),
    checkCassetteShifterSpeeds(shifter, build.cassette),
    checkControlClampDiameter(build.handlebar, shifter, build.brakeLever),
    checkBarControlType(build.handlebar, shifter, build.brakeLever),
  ));
}

export function filterCompatibleRearDerailleurs(build: BikeBuild, candidates: RearDerailleur[]): RearDerailleur[] {
  return candidates.filter((rd) => noCritical(
    checkShifterDerailleurPull(build.shifter, rd),
    checkShifterDerailleurSpeeds(build.shifter, rd),
    checkElectronicEcosystem(build.shifter, rd),
    checkMaxCog(rd, build.cassette),
    checkUdhTransmission(build.frame, rd),
    checkDerailleurMount(build.frame, rd),
  ));
}

export function filterCompatibleFrontDerailleurs(build: BikeBuild, candidates: FrontDerailleur[]): FrontDerailleur[] {
  return candidates.filter((fd) => noCritical(
    checkFdMount(build.frame, fd),
    checkFdPullDirection(build.frame, fd),
  ));
}

export function filterCompatibleCassettes(build: BikeBuild, candidates: Cassette[]): Cassette[] {
  return candidates.filter((cassette) => noCritical(
    checkFreehubBody(build.wheelset, cassette),
    checkMaxCog(build.rearDerailleur, cassette),
    checkChainSpeeds(build.chain, cassette),
    checkCassetteShifterSpeeds(build.shifter, cassette),
  ));
}

export function filterCompatibleChains(build: BikeBuild, candidates: Chain[]): Chain[] {
  return candidates.filter((chain) => noCritical(
    checkChainSpeeds(chain, build.cassette),
    checkChainStandard(chain, build.cassette, build.rearDerailleur),
  ));
}

export function filterCompatibleHeadsets(build: BikeBuild, candidates: Headset[]): Headset[] {
  return candidates.filter((headset) => noCritical(
    checkHeadsetCups(build.frame, headset),
    checkCrownRace(build.fork, headset),
  ));
}

export function filterCompatibleRearShocks(build: BikeBuild, candidates: RearShock[]): RearShock[] {
  return candidates.filter((shock) => noCritical(
    checkShockSize(build.frame, shock),
    checkShockMount(build.frame, shock),
    checkShockHardware(build.frame, shock),
    checkShockSizingStandard(build.frame, shock),
  ));
}

export function filterCompatibleHandlebars(build: BikeBuild, candidates: Handlebar[]): Handlebar[] {
  return candidates.filter((bar) => noCritical(
    checkStemBarClamp(build.stem, bar),
    checkControlClampDiameter(bar, build.shifter, build.brakeLever),
    checkBarControlType(bar, build.shifter, build.brakeLever),
  ));
}

export function filterCompatibleStems(build: BikeBuild, candidates: Stem[]): Stem[] {
  return candidates.filter((stem) => noCritical(
    checkStemBarClamp(stem, build.handlebar),
    checkStemSteerer(build.fork, stem),
  ));
}

export function filterCompatibleSeatposts(build: BikeBuild, candidates: Seatpost[]): Seatpost[] {
  return candidates.filter((post) => noCritical(
    checkSeatpostDiameter(build.frame, post),
    checkDropperRouting(build.frame, post),
    checkSeatpostInsertion(build.frame, post),
    checkSaddleRails(post, build.saddle),
  ));
}

export function filterCompatibleSeatClamps(build: BikeBuild, candidates: SeatClamp[]): SeatClamp[] {
  return candidates.filter((clamp) => noCritical(checkSeatClamp(build.frame, clamp)));
}

export function filterCompatibleSaddles(build: BikeBuild, candidates: Saddle[]): Saddle[] {
  return candidates.filter((saddle) => noCritical(checkSaddleRails(build.seatpost, saddle)));
}

export function filterCompatiblePedals(build: BikeBuild, candidates: Pedal[]): Pedal[] {
  return candidates.filter((pedal) => noCritical(
    checkPedalThread(build.crankset, pedal),
    checkCleatSystem(pedal, build.shoe),
    checkSoleDrilling(pedal, build.shoe),
  ));
}

export function filterCompatibleShoes(build: BikeBuild, candidates: Shoe[]): Shoe[] {
  return candidates.filter((shoe) => noCritical(
    checkCleatSystem(build.pedal, shoe),
    checkSoleDrilling(build.pedal, shoe),
  ));
}

export function filterCompatibleChainGuides(build: BikeBuild, candidates: ChainGuide[]): ChainGuide[] {
  return candidates.filter((guide) => noCritical(checkChainGuideMount(build.frame, guide)));
}

export function filterCompatibleDerailleurHangers(build: BikeBuild, candidates: DerailleurHanger[]): DerailleurHanger[] {
  return candidates.filter((hanger) => noCritical(checkHangerFit(build.frame, hanger)));
}
