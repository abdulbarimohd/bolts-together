// src/types/parts.ts
//
// Hand-written mirror of the Prisma models so the engine
// compiles and is unit-testable before the DB exists. Swap for
// `@prisma/client` generated types once `prisma generate` runs.
//
// Fields a rule needs but that a spec sheet may not publish are
// optional — the engine treats missing data as "unknown" and
// returns either null or a warning, never a guess.

export type BbShellStandard =
  | 'BSA_68' | 'BSA_73' | 'BSA_83' | 'BSA_100' | 'ITALIAN_70' | 'PF92' | 'PF107'
  | 'BB86' | 'BB90' | 'T47_68' | 'T47_73' | 'T47_85_5' | 'BB30' | 'PF30';

export type SpindleInterface =
  | 'DUB_29' | 'GXP' | 'HOLLOWTECH_II_24' | 'CINCH_30' | 'BB30_30'
  | 'OCT_LINK_24' | 'SQUARE_TAPER' | 'ISIS';

export type BrakeMountType =
  | 'FLAT_MOUNT' | 'POST_MOUNT_160' | 'POST_MOUNT_180' | 'POST_MOUNT' | 'IS_MOUNT' | 'RIM_BRAKE';

export type AxleType =
  | 'THRU_AXLE_142x12' | 'THRU_AXLE_148x12_BOOST' | 'THRU_AXLE_157x12_SUPERBOOST'
  | 'THRU_AXLE_110x15_BOOST' | 'THRU_AXLE_100x15'
  /** 12mm front thru-axle at 100mm spacing — the standard front axle on nearly
   *  every modern disc road/gravel bike, and the value on most fork and wheelset
   *  rows in the catalogue. Do NOT confuse with THRU_AXLE_100x15, which is a
   *  15mm-diameter MTB standard: pairing those would put a 12mm hub in a 15mm
   *  fork. Present in the Prisma schema from the start; its absence here forced
   *  the mapper layer to cast, which is now unnecessary. */
  | 'THRU_AXLE_100x12'
  | 'QUICK_RELEASE_130x9' | 'QUICK_RELEASE_100x9' | 'QUICK_RELEASE_135x9'
  | 'THRU_AXLE_20x110_DH' | 'THRU_AXLE_150x12_DH';

export type AxleThreadPitch = 'M12_x_1_0' | 'M12_x_1_5' | 'M12_x_1_75' | 'M15_x_1_5' | 'NONE_QR';

export type DropoutType = 'THRU_AXLE' | 'QUICK_RELEASE' | 'UDH';

export type HeadsetTaper = 'TAPERED_1_5_TO_1_125' | 'STRAIGHT_1_125' | 'STRAIGHT_1_5';

export type HeadsetCupStandard =
  | 'EC34' | 'EC44' | 'EC49' | 'ZS44' | 'ZS49' | 'ZS56' | 'IS41' | 'IS42' | 'IS52';

export type WheelDiameter = 'ISO_622' | 'ISO_584' | 'ISO_559' | 'ISO_507';

export type FreehubBodyType =
  | 'XD' | 'XDR' | 'MICRO_SPLINE' | 'HG_11' | 'HG_10' | 'HG_12' | 'CAMPAGNOLO_N3W';

export type CablePullStandard =
  | 'SHIMANO_ROAD' | 'SHIMANO_MTB' | 'SRAM_EXACT_ACTUATION' | 'SRAM_X_ACTUATION'
  | 'SRAM_FULL_PULL' | 'CAMPAGNOLO'
  // microSHIFT run their own actuation ratios rather than cloning Shimano's.
  // Their absence blocked Cannondale Topstone 3 and 4 entirely in v1.
  | 'MICROSHIFT_ADVENT_X' | 'MICROSHIFT_SWORD'
  | 'ELECTRONIC_AXS' | 'ELECTRONIC_DI2' | 'ELECTRONIC_EPS';

export type FrameMaterial = 'CARBON' | 'ALUMINIUM' | 'STEEL' | 'TITANIUM';

export type HangerStandard = 'UDH' | 'PROPRIETARY' | 'DIRECT_MOUNT';

export type DerailleurMountStandard = 'STANDARD_HANGER' | 'UDH_DIRECT_MOUNT' | 'DIRECT_MOUNT';

export type CageLength = 'SHORT_SS' | 'MEDIUM_GS' | 'LONG_SGS';

export type ChainStandard =
  | 'SHIMANO_HG_10' | 'SHIMANO_HG_11' | 'SHIMANO_HG_12_MTB' | 'SHIMANO_HG_12_ROAD'
  | 'SRAM_EAGLE_12' | 'SRAM_FLATTOP_12' | 'SRAM_11' | 'CAMPAGNOLO_12';

export type RotorMountStandard = 'SIX_BOLT' | 'CENTERLOCK';

export type LockringType = 'INTERNAL' | 'EXTERNAL';

export type BrakeFluidType = 'DOT' | 'MINERAL_OIL' | 'NONE_MECHANICAL';

export type ValveType = 'PRESTA' | 'SCHRADER';

export type ShockMountType = 'STANDARD_EYELET' | 'TRUNNION';

export type ShockSizing = 'METRIC' | 'IMPERIAL';

export type RoutingType = 'INTERNAL' | 'EXTERNAL' | 'MIXED' | 'NONE';

export type DropperRemoteType = 'CABLE' | 'ELECTRONIC' | 'HYDRAULIC' | 'NONE';

export type SaddleRailType = 'ROUND_7MM' | 'OVAL_7X9MM' | 'ROUND_8MM';

export type BarType = 'FLAT' | 'RISER' | 'DROP' | 'AERO';

export type PedalThread = 'NINE_SIXTEENTHS' | 'HALF_INCH';

export type CleatSystem =
  | 'SPD' | 'SPD_SL' | 'LOOK_KEO' | 'CRANK_BROTHERS' | 'TIME' | 'SPEEDPLAY' | 'FLAT_NONE';

export type SoleDrilling = 'TWO_BOLT' | 'THREE_BOLT' | 'TWO_AND_THREE_BOLT' | 'FLAT_NONE';

export type FdMountType =
  | 'BRAZE_ON' | 'CLAMP_28_6' | 'CLAMP_31_8' | 'CLAMP_34_9' | 'DIRECT_MOUNT';

export type PullDirection = 'TOP_PULL' | 'BOTTOM_PULL' | 'DUAL_PULL' | 'SIDE_SWING';

export type IscgStandard = 'ISCG_05' | 'ISCG_OLD' | 'BB_MOUNT' | 'NONE';

export type ChainringMountStandard =
  | 'BCD_104' | 'BCD_96' | 'BCD_94' | 'BCD_110' | 'BCD_76'
  | 'SRAM_3_BOLT' | 'RACE_FACE_CINCH' | 'SHIMANO_DIRECT_MOUNT'
  | 'SRAM_8_BOLT_ROAD_DM' | 'SRAM_8_BOLT_EAGLE_DM';

export type HousingType = 'COMPRESSIONLESS' | 'STANDARD';

/** Every category object carries these, injected from the Part row. */
interface PartIdentity {
  partId: string;
  brand: string;
  name: string;
}

export interface Frame extends PartIdentity {
  material?: FrameMaterial;
  bbShellStandard: BbShellStandard;
  bbShellWidthMm?: number | null;
  rearAxleType: AxleType;
  rearAxleThreadPitch?: AxleThreadPitch | null;
  rearAxleLengthMm?: number | null;
  dropoutType?: DropoutType | null;
  headsetTaper?: HeadsetTaper | null;
  headTubeUpperStandard?: HeadsetCupStandard | null;
  headTubeLowerStandard?: HeadsetCupStandard | null;
  headTubeLengthMm?: number | null;
  rearBrakeMountType: BrakeMountType;
  maxRotorMmRear?: number | null;
  wheelDiameter: WheelDiameter;
  mulletApproved?: boolean;
  maxTyreWidthMm: number;
  maxTyreWidthMm650b?: number | null;
  maxChainringTeeth?: number | null;
  maxForkTravelMm?: number | null;
  designAxleToCrownMm?: number | null;
  chainstayLengthMm?: number | null;
  hangerStandard?: HangerStandard | null;
  seatpostDiameterMm?: number | null;
  seatClampDiameterMm?: number | null;
  maxSeatpostInsertionMm?: number | null;
  seatpostRouting?: RoutingType | null;
  cableRouting?: RoutingType | null;
  iscgStandard?: IscgStandard | null;
  bottleMounts?: number | null;
  hasEyelets?: boolean;
  fdMountType?: FdMountType | null;
  fdPullDirection?: PullDirection | null;
  shockEyeToEyeMm?: number | null;
  shockStrokeMm?: number | null;
  shockMountType?: ShockMountType | null;
  shockHardwareWidthMm?: number | null;
  shockBushingDiameterMm?: number | null;
  leverageRatio?: number | null;
  suitableForCoil?: boolean | null;
  frameSize?: string | null;
  standoverMm?: number | null;
  reachMm?: number | null;
  stackMm?: number | null;
  riderMinHeightCm?: number | null;
  riderMaxHeightCm?: number | null;
}

export interface Fork extends PartIdentity {
  steererTubeTaper: HeadsetTaper;
  steererLengthMm?: number | null;
  crownRaceDiameterMm?: number | null;
  frontAxleType: AxleType;
  frontAxleThreadPitch?: AxleThreadPitch | null;
  frontAxleLengthMm?: number | null;
  dropoutType?: DropoutType | null;
  brakeMountType: BrakeMountType;
  maxRotorMm?: number | null;
  wheelDiameter: WheelDiameter;
  maxTyreWidthMm: number;
  maxTyreWidthMm650b?: number | null;
  travelMm?: number | null;
  axleToCrownMm?: number | null;
  offsetMm?: number | null;
  isSuspension?: boolean;
}

export interface BottomBracket extends PartIdentity {
  frameInterface: BbShellStandard;
  shellWidthMm?: number | null;
  spindleInterface: SpindleInterface;
}

export interface Crankset extends PartIdentity {
  spindleDiameter: SpindleInterface;
  chainlineType?: string;
  chainlineMm?: number | null;
  spindleLengthMm?: number | null;
  qFactorMm?: number | null;
  crankLengthMm?: number | null;
  pedalThread?: PedalThread | null;
  chainringMount?: ChainringMountStandard | null;
  chainringCount?: number | null;
  maxChainringTeeth?: number | null;
}

export interface Chainring extends PartIdentity {
  mountStandard: ChainringMountStandard;
  boltCount?: number | null;
  teeth: number;
  narrowWide?: boolean;
  offsetMm?: number | null;
  speeds?: number | null;
}

export interface Wheelset extends PartIdentity {
  wheelDiameter: WheelDiameter;
  frontAxleType: AxleType;
  rearAxleType: AxleType;
  freehubBodyType: FreehubBodyType;
  rotorMountStandard: RotorMountStandard;
  tubelessReady?: boolean;
  hookless?: boolean;
  maxPressurePsi?: number | null;
  internalRimWidthMm: number;
  rimDepthMm?: number | null;
  valveHoleType?: ValveType | null;
  hasBrakeTrack?: boolean;
  convertibleEndCaps?: boolean;
}

export interface Tyre extends PartIdentity {
  wheelDiameter: WheelDiameter;
  widthMm: number;
  tubeless?: boolean;
  hooklessSafe?: boolean;
  maxPressurePsi?: number | null;
}

export interface Tube extends PartIdentity {
  wheelDiameter: WheelDiameter;
  minWidthMm: number;
  maxWidthMm: number;
  valveType: ValveType;
  valveLengthMm: number;
}

export interface BrakeCaliper extends PartIdentity {
  mountType: BrakeMountType;
  nativeRotorMm?: number | null;
  isHydraulic?: boolean;
  fluidType?: BrakeFluidType | null;
  brakeSystemFamily?: string | null;
  padShape?: string | null;
  minRotorThicknessMm?: number | null;
  maxRotorThicknessMm?: number | null;
}

export interface BrakeLever extends PartIdentity {
  isHydraulic?: boolean;
  fluidType?: BrakeFluidType | null;
  brakeSystemFamily?: string | null;
  barType?: BarType | null;
  clampDiameterMm?: number | null;
  requiresCompressionless?: boolean;
}

export interface Rotor extends PartIdentity {
  diameterMm: number;
  mountStandard: RotorMountStandard;
  lockringType?: LockringType | null;
  thicknessMm?: number | null;
}

export interface Shifter extends PartIdentity {
  speeds: number;
  cablePullStandard: CablePullStandard;
  barType?: BarType | null;
  clampDiameterMm?: number | null;
}

export interface RearDerailleur extends PartIdentity {
  maxSpeeds: number;
  cablePullStandard: CablePullStandard;
  maxCassetteCogTeeth: number;
  minCassetteCogTeeth?: number | null;
  totalCapacityTeeth?: number | null;
  cageLength?: CageLength | null;
  mountStandard?: DerailleurMountStandard | null;
}

export interface FrontDerailleur extends PartIdentity {
  speeds: number;
  cablePullStandard: CablePullStandard;
  mountType: FdMountType;
  pullDirection: PullDirection;
  maxChainringTeeth?: number | null;
}

export interface Cassette extends PartIdentity {
  speeds: number;
  freehubBodyType: FreehubBodyType;
  smallestCogTeeth: number;
  largestCogTeeth: number;
  requiresSpacerMm?: number | null;
}

export interface Chain extends PartIdentity {
  /** R-DRV-07. A *range*, because SRAM rate one physical chain (CN-RED-E1)
   *  for both 12- and 13-speed. A single `speeds` number produced a false
   *  critical block on three real E1-generation builds in v1. For the common
   *  case of a chain that fits exactly one speed count, both are equal. */
  speedsMin: number;
  speedsMax: number;
  chainStandard: ChainStandard;
  links?: number | null;
}

export interface Headset extends PartIdentity {
  upperStandard: HeadsetCupStandard;
  lowerStandard: HeadsetCupStandard;
  crownRaceDiameterMm?: number | null;
  stackHeightMm?: number | null;
}

export interface RearShock extends PartIdentity {
  eyeToEyeMm: number;
  strokeMm: number;
  mountType: ShockMountType;
  hardwareWidthMm?: number | null;
  bushingDiameterMm?: number | null;
  sizing: ShockSizing;
  isCoil?: boolean;
  springRate?: number | null;
  hasReservoir?: boolean;
}

export interface Handlebar extends PartIdentity {
  clampDiameterMm: number;
  controlClampDiameterMm: number;
  barType: BarType;
  widthMm?: number | null;
  riseMm?: number | null;
  internalRouting?: boolean;
}

export interface Stem extends PartIdentity {
  barClampDiameterMm: number;
  steererClampMm: number;
  lengthMm?: number | null;
  riseDegrees?: number | null;
  integratedCockpit?: boolean;
}

export interface Seatpost extends PartIdentity {
  diameterMm: number;
  totalLengthMm: number;
  isDropper?: boolean;
  travelMm?: number | null;
  routingType?: RoutingType | null;
  remoteType?: DropperRemoteType | null;
  railClampType?: SaddleRailType | null;
  setbackMm?: number | null;
}

export interface SeatClamp extends PartIdentity {
  diameterMm: number;
}

export interface Saddle extends PartIdentity {
  railType: SaddleRailType;
  widthMm?: number | null;
}

export interface Pedal extends PartIdentity {
  thread: PedalThread;
  cleatSystem: CleatSystem;
}

export interface Shoe extends PartIdentity {
  soleDrilling: SoleDrilling;
}

export interface ChainGuide extends PartIdentity {
  mountStandard: IscgStandard;
  maxChainringTeeth?: number | null;
  minChainringTeeth?: number | null;
}

export interface DerailleurHanger extends PartIdentity {
  hangerStandard: HangerStandard;
  model?: string | null;
}

/** Optional rider measurements — only the fit rules read these. */
export interface RiderProfile {
  heightCm?: number | null;
  inseamCm?: number | null;
  weightKg?: number | null;
}

// A build in progress — every slot optional so the engine runs
// cleanly on a partially configured build.
export interface BikeBuild {
  frame?: Frame;
  fork?: Fork;
  bottomBracket?: BottomBracket;
  crankset?: Crankset;
  chainring?: Chainring;
  wheelset?: Wheelset;
  frontTyre?: Tyre;
  rearTyre?: Tyre;
  frontTube?: Tube;
  rearTube?: Tube;
  brakeCaliper?: BrakeCaliper;
  brakeLever?: BrakeLever;
  frontRotor?: Rotor;
  rearRotor?: Rotor;
  shifter?: Shifter;
  rearDerailleur?: RearDerailleur;
  frontDerailleur?: FrontDerailleur;
  cassette?: Cassette;
  chain?: Chain;
  headset?: Headset;
  rearShock?: RearShock;
  handlebar?: Handlebar;
  stem?: Stem;
  seatpost?: Seatpost;
  seatClamp?: SeatClamp;
  saddle?: Saddle;
  pedal?: Pedal;
  shoe?: Shoe;
  chainGuide?: ChainGuide;
  derailleurHanger?: DerailleurHanger;
  rider?: RiderProfile;
}
