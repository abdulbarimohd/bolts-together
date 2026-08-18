// src/compatibility/engine.test.ts
//
// Run: npm test
//
// Tests the engine in isolation — no database, no HTTP. Each case
// encodes a real-world fact about bikes, so a failure means either the
// code is wrong or my understanding of the standard is. Both are worth
// knowing about.
//
// Uses node:test (built into Node 20) via tsx, so there's no new test
// dependency to install.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as e from './engine';
import type {
  Frame, Fork, BottomBracket, Crankset, Wheelset, Tyre, BrakeCaliper, BrakeLever,
  Rotor, Shifter, RearDerailleur, Cassette, Chain, Seatpost, Saddle, BikeBuild,
  Chainring, Tube, RearShock, Headset, RiderProfile, Stem, Handlebar, ChainGuide,
  FrontDerailleur, SeatClamp, Pedal, Shoe, DerailleurHanger,
} from '../types/parts';

// ------------------------------------------------------------
// Fixtures — sane defaults so each test states only what matters.
// ------------------------------------------------------------

const id = (n: string) => ({ partId: n, brand: 'Test', name: n });

const frame = (o: Partial<Frame> = {}): Frame => ({
  ...id('frame'),
  bbShellStandard: 'BSA_73', rearAxleType: 'THRU_AXLE_148x12_BOOST',
  headsetTaper: 'TAPERED_1_5_TO_1_125', rearBrakeMountType: 'POST_MOUNT_180',
  wheelDiameter: 'ISO_622', maxTyreWidthMm: 63, ...o,
});

const fork = (o: Partial<Fork> = {}): Fork => ({
  ...id('fork'),
  steererTubeTaper: 'TAPERED_1_5_TO_1_125', frontAxleType: 'THRU_AXLE_110x15_BOOST',
  brakeMountType: 'POST_MOUNT_180', wheelDiameter: 'ISO_622', maxTyreWidthMm: 66, ...o,
});

const bb = (o: Partial<BottomBracket> = {}): BottomBracket =>
  ({ ...id('bb'), frameInterface: 'BSA_73', spindleInterface: 'DUB_29', ...o });

const crank = (o: Partial<Crankset> = {}): Crankset =>
  ({ ...id('crank'), spindleDiameter: 'DUB_29', ...o });

const wheels = (o: Partial<Wheelset> = {}): Wheelset => ({
  ...id('wheels'),
  wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_110x15_BOOST',
  rearAxleType: 'THRU_AXLE_148x12_BOOST', freehubBodyType: 'XD',
  rotorMountStandard: 'CENTERLOCK', internalRimWidthMm: 30, ...o,
});

const tyre = (o: Partial<Tyre> = {}): Tyre =>
  ({ ...id('tyre'), wheelDiameter: 'ISO_622', widthMm: 61, tubeless: true, hooklessSafe: true, ...o });

const caliper = (o: Partial<BrakeCaliper> = {}): BrakeCaliper =>
  ({ ...id('caliper'), mountType: 'POST_MOUNT_180', isHydraulic: true, fluidType: 'DOT', ...o });

const lever = (o: Partial<BrakeLever> = {}): BrakeLever =>
  ({ ...id('lever'), isHydraulic: true, fluidType: 'DOT', ...o });

const rotor = (o: Partial<Rotor> = {}): Rotor =>
  ({ ...id('rotor'), diameterMm: 180, mountStandard: 'CENTERLOCK', ...o });

const shifter = (o: Partial<Shifter> = {}): Shifter =>
  ({ ...id('shifter'), speeds: 12, cablePullStandard: 'SRAM_X_ACTUATION', ...o });

const rd = (o: Partial<RearDerailleur> = {}): RearDerailleur => ({
  ...id('rd'), maxSpeeds: 12, cablePullStandard: 'SRAM_X_ACTUATION',
  maxCassetteCogTeeth: 52, ...o,
});

const cassette = (o: Partial<Cassette> = {}): Cassette => ({
  ...id('cassette'), speeds: 12, freehubBodyType: 'XD',
  smallestCogTeeth: 10, largestCogTeeth: 52, ...o,
});

// `speeds` is a convenience for the common single-speed-count chain: it sets
// both ends of the range. Pass speedsMin/speedsMax explicitly for the
// dual-rated case (SRAM's 12/13-speed chains).
const chain = ({ speeds, ...o }: Partial<Chain> & { speeds?: number } = {}): Chain => ({
  ...id('chain'),
  speedsMin: speeds ?? 12,
  speedsMax: speeds ?? 12,
  chainStandard: 'SRAM_EAGLE_12',
  ...o,
});

const post = (o: Partial<Seatpost> = {}): Seatpost =>
  ({ ...id('post'), diameterMm: 31.6, totalLengthMm: 440, ...o });

const rearShock = (o: Partial<RearShock> = {}): RearShock =>
  ({ ...id('shock'), eyeToEyeMm: 210, strokeMm: 55, mountType: 'STANDARD_EYELET', sizing: 'METRIC', ...o });

const headset = (o: Partial<Headset> = {}): Headset =>
  ({ ...id('headset'), upperStandard: 'ZS44', lowerStandard: 'ZS56', ...o });

const rider = (o: Partial<RiderProfile> = {}): RiderProfile => ({ ...o });

const stem = (o: Partial<Stem> = {}): Stem =>
  ({ ...id('stem'), barClampDiameterMm: 31.8, steererClampMm: 28.6, ...o });

const handlebar = (o: Partial<Handlebar> = {}): Handlebar =>
  ({ ...id('bar'), clampDiameterMm: 31.8, controlClampDiameterMm: 22.2, barType: 'FLAT', ...o });

const chainGuide = (o: Partial<ChainGuide> = {}): ChainGuide =>
  ({ ...id('guide'), mountStandard: 'ISCG_05', ...o });

const chainring = (o: Partial<Chainring> = {}): Chainring =>
  ({ ...id('chainring'), mountStandard: 'BCD_104', teeth: 32, ...o });

const tube = (o: Partial<Tube> = {}): Tube =>
  ({ ...id('tube'), wheelDiameter: 'ISO_622', minWidthMm: 28, maxWidthMm: 62, valveType: 'PRESTA', valveLengthMm: 40, ...o });

const fd = (o: Partial<FrontDerailleur> = {}): FrontDerailleur => ({
  ...id('fd'), speeds: 2, cablePullStandard: 'SHIMANO_MTB',
  mountType: 'BRAZE_ON', pullDirection: 'TOP_PULL', ...o,
});

const clamp = (o: Partial<SeatClamp> = {}): SeatClamp =>
  ({ ...id('clamp'), diameterMm: 34.9, ...o });

const saddle = (o: Partial<Saddle> = {}): Saddle =>
  ({ ...id('saddle'), railType: 'ROUND_7MM', ...o });

const pedal = (o: Partial<Pedal> = {}): Pedal =>
  ({ ...id('pedal'), thread: 'NINE_SIXTEENTHS', cleatSystem: 'SPD', ...o });

const shoe = (o: Partial<Shoe> = {}): Shoe =>
  ({ ...id('shoe'), soleDrilling: 'TWO_BOLT', ...o });

const hanger = (o: Partial<DerailleurHanger> = {}): DerailleurHanger =>
  ({ ...id('hanger'), hangerStandard: 'PROPRIETARY', ...o });

/** Assertion helpers that read like the thing being claimed. */
function fits(w: e.CompatibilityWarning | null, msg?: string) {
  assert.equal(w, null, msg ?? `expected compatible, got: ${w?.id} ${w?.title}`);
}
function blocks(w: e.CompatibilityWarning | null, ruleId: string) {
  assert.ok(w, `expected ${ruleId} to fire, got nothing`);
  assert.equal(w!.id, ruleId);
  assert.equal(w!.severity, 'critical', `${ruleId} should block, not warn`);
}
function warns(w: e.CompatibilityWarning | null, ruleId: string) {
  assert.ok(w, `expected ${ruleId} to warn, got nothing`);
  assert.equal(w!.id, ruleId);
  assert.notEqual(w!.severity, 'critical', `${ruleId} should warn, not block`);
}

// ------------------------------------------------------------

describe('bottom bracket / crank chain', () => {
  test('matching shell standards fit', () => {
    fits(e.checkBbShellMatch(frame({ bbShellStandard: 'BSA_73' }), bb({ frameInterface: 'BSA_73' })));
  });

  test('BSA frame rejects a press-fit BB', () => {
    blocks(e.checkBbShellMatch(frame({ bbShellStandard: 'BSA_73' }), bb({ frameInterface: 'PF92' })), 'R-BB-01');
  });

  // The case that makes name-matching necessary: BSA_73 and T47_73 are
  // both 73mm wide. Comparing dimensions alone would call these a match
  // and tell someone to thread a T47 cup into a BSA frame.
  test('BSA_73 and T47_73 are incompatible despite identical width', () => {
    blocks(e.checkBbShellMatch(frame({ bbShellStandard: 'BSA_73' }), bb({ frameInterface: 'T47_73' })), 'R-BB-01');
  });

  test('spindle interface must match the BB', () => {
    fits(e.checkSpindleMatch(bb({ spindleInterface: 'DUB_29' }), crank({ spindleDiameter: 'DUB_29' })));
    blocks(e.checkSpindleMatch(bb({ spindleInterface: 'DUB_29' }), crank({ spindleDiameter: 'HOLLOWTECH_II_24' })), 'R-BB-02');
  });

  test('shell width must match even when the standard does (R-BB-03)', () => {
    blocks(e.checkBbShellWidth(frame({ bbShellWidthMm: 73 }), bb({ shellWidthMm: 68 })), 'R-BB-03');
    fits(e.checkBbShellWidth(frame({ bbShellWidthMm: 73 }), bb({ shellWidthMm: 73 })));
    // Unpublished width -- stay quiet rather than assume a mismatch.
    fits(e.checkBbShellWidth(frame({ bbShellWidthMm: undefined }), bb({ shellWidthMm: 68 })));
  });

  test('Italian and English/BSA shells are opposite-thread, not interchangeable (R-BB-04)', () => {
    blocks(e.checkBbThreadDirection(
      frame({ bbShellStandard: 'ITALIAN_70' }), bb({ frameInterface: 'BSA_73' }),
    ), 'R-BB-04');
    fits(e.checkBbThreadDirection(frame({ bbShellStandard: 'ITALIAN_70' }), bb({ frameInterface: 'ITALIAN_70' })));
    fits(e.checkBbThreadDirection(frame({ bbShellStandard: 'BSA_73' }), bb({ frameInterface: 'BSA_68' })));
  });

  test('a spindle too short to reach across the shell warns (R-BB-05)', () => {
    warns(e.checkSpindleLength(frame({ bbShellWidthMm: 73 }), crank({ spindleLengthMm: 90 })), 'R-BB-05');
    fits(e.checkSpindleLength(frame({ bbShellWidthMm: 73 }), crank({ spindleLengthMm: 95 })));
  });
});

describe('chainring mount', () => {
  test('BCD mismatch files under R-CHR-01', () => {
    blocks(e.checkChainringMount(
      crank({ chainringMount: 'BCD_104' }), chainring({ mountStandard: 'BCD_110' }),
    ), 'R-CHR-01');
  });

  // Regression: SRAM_8_BOLT_ROAD_DM/SRAM_8_BOLT_EAGLE_DM were added to the
  // schema this session without updating checkChainringMount's `direct`
  // list alongside it, so a mismatch between two direct-mount standards
  // silently filed under R-CHR-01 (bolt-circle) instead of R-CHR-02
  // (direct-mount interface) — every direct-mount standard has to be
  // listed there for this to classify correctly.
  test('a mismatch between two direct-mount standards files under R-CHR-02, not R-CHR-01', () => {
    blocks(e.checkChainringMount(
      crank({ chainringMount: 'SRAM_8_BOLT_EAGLE_DM' }), chainring({ mountStandard: 'SRAM_8_BOLT_ROAD_DM' }),
    ), 'R-CHR-02');
    blocks(e.checkChainringMount(
      crank({ chainringMount: 'SHIMANO_DIRECT_MOUNT' }), chainring({ mountStandard: 'SRAM_8_BOLT_EAGLE_DM' }),
    ), 'R-CHR-02');
  });

  test('matching direct-mount standards fit', () => {
    fits(e.checkChainringMount(
      crank({ chainringMount: 'SRAM_8_BOLT_ROAD_DM' }), chainring({ mountStandard: 'SRAM_8_BOLT_ROAD_DM' }),
    ));
  });
});

describe('axles and hubs', () => {
  test('Boost frame rejects a Super Boost wheel', () => {
    blocks(e.checkRearAxleMatch(
      frame({ rearAxleType: 'THRU_AXLE_148x12_BOOST' }),
      wheels({ rearAxleType: 'THRU_AXLE_157x12_SUPERBOOST' }),
    ), 'R-AXL-01');
  });

  test('convertible end caps downgrade a spacing mismatch to a warning', () => {
    warns(e.checkRearAxleMatch(
      frame({ rearAxleType: 'THRU_AXLE_142x12' }),
      wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST', convertibleEndCaps: true }),
    ), 'R-AXL-05');
  });

  test('front hub spacing must match the fork (R-AXL-02)', () => {
    blocks(e.checkFrontAxleMatch(
      fork({ frontAxleType: 'THRU_AXLE_110x15_BOOST' }),
      wheels({ frontAxleType: 'THRU_AXLE_100x15' }),
    ), 'R-AXL-02');
    fits(e.checkFrontAxleMatch(
      fork({ frontAxleType: 'THRU_AXLE_110x15_BOOST' }),
      wheels({ frontAxleType: 'THRU_AXLE_110x15_BOOST' }),
    ));
  });

  test('threaded axles get an info reminder, quick-release frames stay quiet (R-AXL-03)', () => {
    // Advisory only -- there's no second, comparable thread-pitch value in
    // this catalogue to check the frame's against (axles ship bundled with
    // the wheelset). See the comment on checkRearAxleThreadPitch.
    const w = e.checkRearAxleThreadPitch(frame({ rearAxleThreadPitch: 'M12_x_1_5' }), wheels());
    assert.ok(w, 'expected R-AXL-03 to fire');
    assert.equal(w!.id, 'R-AXL-03');
    assert.equal(w!.severity, 'info', 'R-AXL-03 is advisory, never blocking');

    fits(e.checkRearAxleThreadPitch(frame({ rearAxleThreadPitch: 'NONE_QR' }), wheels()));
    // Unpublished thread pitch -- stay quiet rather than assume threaded.
    fits(e.checkRearAxleThreadPitch(frame({ rearAxleThreadPitch: undefined }), wheels()));
  });

  test('dropout type must match thru-axle vs quick-release (R-AXL-04)', () => {
    blocks(e.checkDropoutType(
      frame({ dropoutType: 'QUICK_RELEASE' }),
      wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' }),
    ), 'R-AXL-04');
    fits(e.checkDropoutType(
      frame({ dropoutType: 'THRU_AXLE' }),
      wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' }),
    ));
    // UDH is a thru-axle dropout for this check's purposes.
    fits(e.checkDropoutType(
      frame({ dropoutType: 'UDH' }),
      wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' }),
    ));
    // Unpublished dropout type -- stay quiet rather than assume either way.
    fits(e.checkDropoutType(frame({ dropoutType: undefined }), wheels()));
  });
});

describe('drivetrain', () => {
  test('electronic shifter cannot drive a cable derailleur', () => {
    blocks(e.checkElectronicEcosystem(
      shifter({ cablePullStandard: 'ELECTRONIC_AXS' }),
      rd({ cablePullStandard: 'SHIMANO_MTB' }),
    ), 'R-DRV-03');
  });

  test('the two electronic ecosystems cannot mix', () => {
    blocks(e.checkElectronicEcosystem(
      shifter({ cablePullStandard: 'ELECTRONIC_AXS' }),
      rd({ cablePullStandard: 'ELECTRONIC_DI2' }),
    ), 'R-DRV-03');
  });

  test('matching electronic ecosystems fit', () => {
    fits(e.checkElectronicEcosystem(
      shifter({ cablePullStandard: 'ELECTRONIC_AXS' }),
      rd({ cablePullStandard: 'ELECTRONIC_AXS' }),
    ));
  });

  test('cable pull ratios must match', () => {
    blocks(e.checkShifterDerailleurPull(
      shifter({ cablePullStandard: 'SRAM_X_ACTUATION' }),
      rd({ cablePullStandard: 'SHIMANO_MTB' }),
    ), 'R-DRV-01');
  });

  test('speed counts must match end to end', () => {
    blocks(e.checkCassetteShifterSpeeds(shifter({ speeds: 12 }), cassette({ speeds: 11 })), 'R-DRV-10');
    blocks(e.checkChainSpeeds(chain({ speeds: 12 }), cassette({ speeds: 11 })), 'R-DRV-07');
  });

  test('a dual-rated chain fits every speed count it is rated for', () => {
    // SRAM rate one physical chain (CN-RED-E1) for both 12- and 13-speed.
    // v1 stored a single `speeds` number, so this rule fired a false critical
    // on three real E1-generation builds — a legal part removed from the list
    // entirely, which is the worst failure this engine can produce.
    const dualRated = chain({ speedsMin: 12, speedsMax: 13 });
    fits(e.checkChainSpeeds(dualRated, cassette({ speeds: 12 })));
    fits(e.checkChainSpeeds(dualRated, cassette({ speeds: 13 })));
    // Still blocks outside the rated range.
    blocks(e.checkChainSpeeds(dualRated, cassette({ speeds: 11 })), 'R-DRV-07');

    // And a single-speed chain stays strict.
    fits(e.checkChainSpeeds(chain({ speeds: 12 }), cassette({ speeds: 12 })));
    blocks(e.checkChainSpeeds(chain({ speeds: 12 }), cassette({ speeds: 13 })), 'R-DRV-07');
  });

  test('cassette bigger than the derailleur can handle', () => {
    blocks(e.checkMaxCog(rd({ maxCassetteCogTeeth: 51 }), cassette({ largestCogTeeth: 52 })), 'R-DRV-04');
    fits(e.checkMaxCog(rd({ maxCassetteCogTeeth: 52 }), cassette({ largestCogTeeth: 52 })));
  });

  test('shifter and derailleur speed counts must match (R-DRV-02)', () => {
    blocks(e.checkShifterDerailleurSpeeds(shifter({ speeds: 12 }), rd({ maxSpeeds: 11 })), 'R-DRV-02');
    fits(e.checkShifterDerailleurSpeeds(shifter({ speeds: 12 }), rd({ maxSpeeds: 12 })));
  });

  test('a 2x setup can outrun the derailleur\'s total capacity (R-DRV-05)', () => {
    warns(e.checkTotalCapacity(
      rd({ totalCapacityTeeth: 45 }), cassette({ smallestCogTeeth: 10, largestCogTeeth: 52 }), crank({ chainringCount: 2 }),
    ), 'R-DRV-05');
    fits(e.checkTotalCapacity(
      rd({ totalCapacityTeeth: 56 }), cassette({ smallestCogTeeth: 10, largestCogTeeth: 52 }), crank({ chainringCount: 2 }),
    ));
    // A 1x setup has no second ring to add slack -- stays quiet regardless of capacity.
    fits(e.checkTotalCapacity(rd({ totalCapacityTeeth: 20 }), cassette({ smallestCogTeeth: 10, largestCogTeeth: 52 }), crank({ chainringCount: 1 })));
  });

  test('a short cage struggles with a wide-range cassette (R-DRV-06)', () => {
    warns(e.checkCageLength(rd({ cageLength: 'SHORT_SS' }), cassette({ smallestCogTeeth: 10, largestCogTeeth: 52 })), 'R-DRV-06');
    fits(e.checkCageLength(rd({ cageLength: 'LONG_SGS' }), cassette({ smallestCogTeeth: 10, largestCogTeeth: 52 })));
    fits(e.checkCageLength(rd({ cageLength: 'SHORT_SS' }), cassette({ smallestCogTeeth: 11, largestCogTeeth: 36 })));
  });

  test('SRAM Flattop only runs on an AXS road (XDR) cassette (R-DRV-08)', () => {
    blocks(e.checkChainStandard(
      chain({ chainStandard: 'SRAM_FLATTOP_12' }), cassette({ freehubBodyType: 'HG_11' }),
    ), 'R-DRV-08');
    fits(e.checkChainStandard(chain({ chainStandard: 'SRAM_FLATTOP_12' }), cassette({ freehubBodyType: 'XDR' })));
  });

  test('12-speed SRAM and Shimano chains do not cross over onto the other\'s derailleur (R-DRV-08)', () => {
    blocks(e.checkChainStandard(
      chain({ chainStandard: 'SRAM_EAGLE_12', speeds: 12 }), undefined, rd({ cablePullStandard: 'SHIMANO_MTB' }),
    ), 'R-DRV-08');
    fits(e.checkChainStandard(
      chain({ chainStandard: 'SRAM_EAGLE_12', speeds: 12 }), undefined, rd({ cablePullStandard: 'SRAM_X_ACTUATION' }),
    ));
  });

  test('chain length must cover big-big plus rear centre (R-DRV-09)', () => {
    // required = ceil(2*(430/12.7) + 32/2 + 52/2 + 2) = 112 links.
    warns(e.checkChainLength(
      chain({ links: 110 }), cassette({ largestCogTeeth: 52 }), chainring({ teeth: 32 }), frame({ chainstayLengthMm: 430 }),
    ), 'R-DRV-09');
    fits(e.checkChainLength(
      chain({ links: 112 }), cassette({ largestCogTeeth: 52 }), chainring({ teeth: 32 }), frame({ chainstayLengthMm: 430 }),
    ));
  });
});

describe('freehub', () => {
  test('XD cassette will not go on a Micro Spline hub', () => {
    blocks(e.checkFreehubBody(wheels({ freehubBodyType: 'MICRO_SPLINE' }), cassette({ freehubBodyType: 'XD' })), 'R-FH-04');
  });

  test('XD cassette on an XDR body is a spacer job, not a blocker', () => {
    fits(e.checkFreehubBody(wheels({ freehubBodyType: 'XDR' }), cassette({ freehubBodyType: 'XD' })));
    warns(e.checkXdrSpacer(wheels({ freehubBodyType: 'XDR' }), cassette({ freehubBodyType: 'XD' })), 'R-FH-02');
  });

  test('an HG cassette will not engage a different HG-family hub (R-FH-01)', () => {
    blocks(e.checkFreehubBody(wheels({ freehubBodyType: 'HG_10' }), cassette({ freehubBodyType: 'HG_11' })), 'R-FH-01');
    fits(e.checkFreehubBody(wheels({ freehubBodyType: 'HG_11' }), cassette({ freehubBodyType: 'HG_11' })));
  });

  test('a 10-speed-or-fewer cassette on an 11-speed HG body needs a spacer (R-FH-03)', () => {
    warns(e.checkHgSpacer(wheels({ freehubBodyType: 'HG_11' }), cassette({ speeds: 10 })), 'R-FH-03');
    fits(e.checkHgSpacer(wheels({ freehubBodyType: 'HG_11' }), cassette({ speeds: 11 })));
  });
});

describe('derailleur hanger / UDH', () => {
  test('Transmission derailleur needs a UDH frame', () => {
    blocks(e.checkUdhTransmission(
      frame({ hangerStandard: 'PROPRIETARY' }),
      rd({ mountStandard: 'UDH_DIRECT_MOUNT' }),
    ), 'R-HGR-01');
  });

  test('Transmission derailleur fits a UDH frame', () => {
    fits(e.checkUdhTransmission(frame({ hangerStandard: 'UDH' }), rd({ mountStandard: 'UDH_DIRECT_MOUNT' })));
  });

  test('a normal derailleur still fits a UDH frame', () => {
    fits(e.checkUdhTransmission(frame({ hangerStandard: 'UDH' }), rd({ mountStandard: 'STANDARD_HANGER' })));
  });

  test('proprietary hangers are model-specific (R-HGR-02)', () => {
    blocks(e.checkHangerFit(frame({ hangerStandard: 'PROPRIETARY' }), hanger({ hangerStandard: 'UDH' })), 'R-HGR-02');
    fits(e.checkHangerFit(frame({ hangerStandard: 'PROPRIETARY' }), hanger({ hangerStandard: 'PROPRIETARY' })));
  });

  test('a direct-mount derailleur needs a direct-mount frame interface (R-HGR-03)', () => {
    blocks(e.checkDerailleurMount(
      frame({ hangerStandard: 'PROPRIETARY' }), rd({ mountStandard: 'DIRECT_MOUNT' }),
    ), 'R-HGR-03');
    fits(e.checkDerailleurMount(frame({ hangerStandard: 'DIRECT_MOUNT' }), rd({ mountStandard: 'DIRECT_MOUNT' })));
    // UDH direct-mount is covered by R-HGR-01, not R-HGR-03.
    fits(e.checkDerailleurMount(frame({ hangerStandard: 'PROPRIETARY' }), rd({ mountStandard: 'UDH_DIRECT_MOUNT' })));
  });
});

describe('headset', () => {
  test('steerer taper must match the head tube (R-HS-01)', () => {
    blocks(e.checkHeadsetTaper(
      frame({ headsetTaper: 'TAPERED_1_5_TO_1_125' }), fork({ steererTubeTaper: 'STRAIGHT_1_125' }),
    ), 'R-HS-01');
    fits(e.checkHeadsetTaper(frame({ headsetTaper: 'TAPERED_1_5_TO_1_125' }), fork({ steererTubeTaper: 'TAPERED_1_5_TO_1_125' })));
    // An unpublished frame taper -- common when a manufacturer states
    // headset bearing part numbers but never the taper class those
    // imply -- stays quiet rather than reading null as a mismatch
    // against every fork.
    fits(e.checkHeadsetTaper(frame({ headsetTaper: null }), fork({ steererTubeTaper: 'TAPERED_1_5_TO_1_125' })));
  });

  test('upper and lower cup standards are checked independently (R-HS-02)', () => {
    blocks(e.checkHeadsetCups(
      frame({ headTubeUpperStandard: 'ZS44', headTubeLowerStandard: 'ZS56' }),
      headset({ upperStandard: 'EC44', lowerStandard: 'ZS56' }),
    ), 'R-HS-02');
    fits(e.checkHeadsetCups(
      frame({ headTubeUpperStandard: 'ZS44', headTubeLowerStandard: 'ZS56' }),
      headset({ upperStandard: 'ZS44', lowerStandard: 'ZS56' }),
    ));
    // Unpublished head tube standards -- stay quiet rather than assume a mismatch.
    fits(e.checkHeadsetCups(frame({ headTubeUpperStandard: undefined, headTubeLowerStandard: undefined }), headset()));
  });

  test('crown race seat diameter must match the fork crown (R-HS-03)', () => {
    blocks(e.checkCrownRace(fork({ crownRaceDiameterMm: 40 }), headset({ crownRaceDiameterMm: 30 })), 'R-HS-03');
    fits(e.checkCrownRace(fork({ crownRaceDiameterMm: 40 }), headset({ crownRaceDiameterMm: 40 })));
  });
});

describe('pedals & shoes', () => {
  test('pedal thread must match the crank (R-PDL-01)', () => {
    blocks(e.checkPedalThread(crank({ pedalThread: 'NINE_SIXTEENTHS' }), pedal({ thread: 'HALF_INCH' })), 'R-PDL-01');
    fits(e.checkPedalThread(crank({ pedalThread: 'NINE_SIXTEENTHS' }), pedal({ thread: 'NINE_SIXTEENTHS' })));
    // Unpublished crank pedal thread -- 9/16" is near-universal, but stay quiet rather than assume it.
    fits(e.checkPedalThread(crank({ pedalThread: undefined }), pedal({ thread: 'HALF_INCH' })));
  });

  test('clipless pedals need a shoe with any cleat mounting at all (R-PDL-02)', () => {
    blocks(e.checkCleatSystem(pedal({ cleatSystem: 'SPD' }), shoe({ soleDrilling: 'FLAT_NONE' })), 'R-PDL-02');
    fits(e.checkCleatSystem(pedal({ cleatSystem: 'SPD' }), shoe({ soleDrilling: 'TWO_BOLT' })));
    fits(e.checkCleatSystem(pedal({ cleatSystem: 'FLAT_NONE' }), shoe({ soleDrilling: 'FLAT_NONE' })));
  });

  test('sole drilling must match the cleat\'s bolt pattern (R-PDL-03)', () => {
    blocks(e.checkSoleDrilling(pedal({ cleatSystem: 'SPD_SL' }), shoe({ soleDrilling: 'TWO_BOLT' })), 'R-PDL-03');
    fits(e.checkSoleDrilling(pedal({ cleatSystem: 'SPD' }), shoe({ soleDrilling: 'TWO_BOLT' })));
    fits(e.checkSoleDrilling(pedal({ cleatSystem: 'SPD_SL' }), shoe({ soleDrilling: 'THREE_BOLT' })));
    // A shoe drilled for both patterns fits any cleat system.
    fits(e.checkSoleDrilling(pedal({ cleatSystem: 'SPD_SL' }), shoe({ soleDrilling: 'TWO_AND_THREE_BOLT' })));
  });
});

describe('rider fit — advisory only, never blocks', () => {
  test('frame size range vs rider height (R-FIT-01)', () => {
    const w = e.checkFrameSizeHeight(
      frame({ riderMinHeightCm: 170, riderMaxHeightCm: 185 }), rider({ heightCm: 190 }),
    );
    assert.ok(w, 'expected R-FIT-01 to fire');
    assert.equal(w!.id, 'R-FIT-01');
    assert.notEqual(w!.severity, 'critical', 'R-FIT-01 should never block');
    fits(e.checkFrameSizeHeight(frame({ riderMinHeightCm: 170, riderMaxHeightCm: 185 }), rider({ heightCm: 178 })));
  });

  test('standover clearance vs inseam (R-FIT-02)', () => {
    const w = e.checkStandover(frame({ standoverMm: 800 }), rider({ inseamCm: 80 }));
    assert.ok(w, 'expected R-FIT-02 to fire');
    assert.equal(w!.id, 'R-FIT-02');
    assert.notEqual(w!.severity, 'critical', 'R-FIT-02 should never block');
    fits(e.checkStandover(frame({ standoverMm: 750 }), rider({ inseamCm: 80 })));
  });

  // R-FIT-03 is a deliberate no-op: reach/stack fit is preference-driven,
  // so this is shown to the rider as spec data rather than judged by the
  // engine -- the function always returns null, by design, once its inputs
  // are present (same pattern as the R-BRK-10 no-op elsewhere).
  test('reach/stack is advisory spec data, never a warning (R-FIT-03)', () => {
    fits(e.checkReachStack(frame({ reachMm: 480 }), rider({ heightCm: 190 })));
    fits(e.checkReachStack(frame({ reachMm: 400 }), rider({ heightCm: 160 })));
  });
});

describe('brakes', () => {
  // The distinction that stops adapter-legal builds vanishing.
  test('a bigger rotor is a warning with a remedy, not a blocker', () => {
    const w = e.checkFrontRotorAdapter(fork({ brakeMountType: 'POST_MOUNT_160' }), rotor({ diameterMm: 180 }));
    warns(w, 'R-BRK-03');
    assert.match(w!.remedy ?? '', /adapter/i, 'should name the adapter needed');
  });

  test('a rotor smaller than the native mount is impossible', () => {
    blocks(e.checkFrontRotorAdapter(fork({ brakeMountType: 'POST_MOUNT_180' }), rotor({ diameterMm: 160 })), 'R-BRK-03');
  });

  test('rotor matching the native mount needs nothing', () => {
    fits(e.checkFrontRotorAdapter(fork({ brakeMountType: 'POST_MOUNT_180' }), rotor({ diameterMm: 180 })));
  });

  test('DOT and mineral oil must never be mixed', () => {
    blocks(e.checkBrakeFluid(lever({ fluidType: 'DOT' }), caliper({ fluidType: 'MINERAL_OIL' })), 'R-BRK-07');
    fits(e.checkBrakeFluid(lever({ fluidType: 'DOT' }), caliper({ fluidType: 'DOT' })));
  });

  test('rotor mount must match the hub interface', () => {
    blocks(e.checkRotorHubMount(wheels({ rotorMountStandard: 'CENTERLOCK' }), rotor({ mountStandard: 'SIX_BOLT' })), 'R-BRK-05');
  });

  test('rear/front caliper mount must match the frame/fork (R-BRK-01/02)', () => {
    blocks(e.checkRearBrakeMount(frame({ rearBrakeMountType: 'POST_MOUNT_180' }), caliper({ mountType: 'FLAT_MOUNT' })), 'R-BRK-01');
    blocks(e.checkFrontBrakeMount(fork({ brakeMountType: 'POST_MOUNT_180' }), caliper({ mountType: 'FLAT_MOUNT' })), 'R-BRK-02');
    // Any post-mount caliper fits any post-mount frame/fork -- rotor sizing
    // is a separate adapter question (R-BRK-03), not a mount-family block.
    fits(e.checkRearBrakeMount(frame({ rearBrakeMountType: 'POST_MOUNT_160' }), caliper({ mountType: 'POST_MOUNT' })));
    fits(e.checkFrontBrakeMount(fork({ brakeMountType: 'POST_MOUNT_160' }), caliper({ mountType: 'POST_MOUNT' })));
  });

  test('rotor size vs the frame/fork\'s rated maximum (R-BRK-04)', () => {
    blocks(e.checkRearRotorMax(frame({ maxRotorMmRear: 180 }), rotor({ diameterMm: 203 })), 'R-BRK-04');
    blocks(e.checkFrontRotorMax(fork({ maxRotorMm: 180 }), rotor({ diameterMm: 203 })), 'R-BRK-04');
    fits(e.checkRearRotorMax(frame({ maxRotorMmRear: 203 }), rotor({ diameterMm: 203 })));
    // No published maximum -- stay quiet rather than assume a limit.
    fits(e.checkRearRotorMax(frame({ maxRotorMmRear: null }), rotor({ diameterMm: 203 })));
  });

  test('external Centerlock lockrings can foul 15mm/110mm thru-axle hubs (R-BRK-06)', () => {
    warns(e.checkLockringClearance(
      wheels({ frontAxleType: 'THRU_AXLE_110x15_BOOST' }), rotor({ lockringType: 'EXTERNAL' }),
    ), 'R-BRK-06');
    fits(e.checkLockringClearance(wheels({ frontAxleType: 'THRU_AXLE_110x15_BOOST' }), rotor({ lockringType: 'INTERNAL' })));
    // A hub spacing this rule doesn't apply to -- stays quiet.
    fits(e.checkLockringClearance(wheels({ frontAxleType: 'THRU_AXLE_100x15' }), rotor({ lockringType: 'EXTERNAL' })));
  });

  test('lever and caliper must be the same brand/model system (R-BRK-08)', () => {
    blocks(e.checkBrakeSystemFamily(
      lever({ brakeSystemFamily: 'XTR M9120' }), caliper({ brakeSystemFamily: 'GRX RX820' }),
    ), 'R-BRK-08');
    fits(e.checkBrakeSystemFamily(
      lever({ brakeSystemFamily: 'XTR M9120' }), caliper({ brakeSystemFamily: 'XTR M9120' }),
    ));
    // Unpublished family on either side -- stay quiet rather than assume a mismatch.
    fits(e.checkBrakeSystemFamily(lever({ brakeSystemFamily: undefined }), caliper({ brakeSystemFamily: 'GRX RX820' })));
  });

  test('pad shape is advisory-only and never blocks (R-BRK-10)', () => {
    // Regression guard: padShape is free text on the caliper alone, with no
    // second value anywhere in the data model to compare it against. This
    // locks in that checkPadShape stays a deliberate no-op rather than
    // someone "finishing" it into a check with nothing real to check.
    fits(e.checkPadShape(caliper({ padShape: 'Shimano J05A resin' })));
    fits(e.checkPadShape(caliper({ padShape: undefined })));
    fits(e.checkPadShape(undefined));
  });

  test('rotor thickness must sit within the caliper\'s spec (R-BRK-11)', () => {
    warns(e.checkRotorThickness(
      caliper({ minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.3 }), rotor({ thicknessMm: 1.2 }),
    ), 'R-BRK-11');
    blocks(e.checkRotorThickness(
      caliper({ minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.3 }), rotor({ thicknessMm: 2.5 }),
    ), 'R-BRK-11');
    fits(e.checkRotorThickness(
      caliper({ minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.3 }), rotor({ thicknessMm: 1.8 }),
    ));
    // Unpublished rotor thickness -- stay quiet rather than assume it's out of spec.
    fits(e.checkRotorThickness(caliper({ minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.3 }), rotor({ thicknessMm: null })));
  });

  test('rim brakes need a machined braking surface on the rim (R-BRK-12)', () => {
    blocks(e.checkRimBrakeTrack(caliper({ mountType: 'RIM_BRAKE' }), wheels({ hasBrakeTrack: false })), 'R-BRK-12');
    fits(e.checkRimBrakeTrack(caliper({ mountType: 'RIM_BRAKE' }), wheels({ hasBrakeTrack: true })));
    // A disc caliper has no business with this rule regardless of rim track.
    fits(e.checkRimBrakeTrack(caliper({ mountType: 'POST_MOUNT_180' }), wheels({ hasBrakeTrack: false })));
  });
});

describe('fork ↔ frame', () => {
  test('steerer must be long enough for head tube + headset stack + stem (R-FRK-01)', () => {
    blocks(e.checkSteererLength(
      frame({ headTubeLengthMm: 120 }), fork({ steererLengthMm: 150 }), headset({ stackHeightMm: 20 }),
    ), 'R-FRK-01'); // needs 120+20+40=180, has 150
    fits(e.checkSteererLength(
      frame({ headTubeLengthMm: 120 }), fork({ steererLengthMm: 200 }), headset({ stackHeightMm: 20 }),
    ));
    // Unpublished steerer length -- stay quiet rather than assume too short.
    fits(e.checkSteererLength(frame({ headTubeLengthMm: 120 }), fork({ steererLengthMm: undefined })));
  });

  test('fork travel must not exceed the frame\'s rated maximum (R-FRK-02)', () => {
    blocks(e.checkForkTravel(frame({ maxForkTravelMm: 140 }), fork({ travelMm: 160 })), 'R-FRK-02');
    fits(e.checkForkTravel(frame({ maxForkTravelMm: 140 }), fork({ travelMm: 140 })));
    fits(e.checkForkTravel(frame({ maxForkTravelMm: null }), fork({ travelMm: 160 })));
  });

  test('axle-to-crown must sit within the frame\'s ±10mm design window (R-FRK-03)', () => {
    warns(e.checkAxleToCrown(
      frame({ designAxleToCrownMm: 470 }), fork({ axleToCrownMm: 490 }),
    ), 'R-FRK-03');
    fits(e.checkAxleToCrown(frame({ designAxleToCrownMm: 470 }), fork({ axleToCrownMm: 475 })));
    fits(e.checkAxleToCrown(frame({ designAxleToCrownMm: null }), fork({ axleToCrownMm: 490 })));
  });

  test('mismatched wheel size is a warning normally, an info note when the frame is mullet-approved (R-FRK-04)', () => {
    warns(e.checkForkWheelDiameter(
      frame({ wheelDiameter: 'ISO_622', mulletApproved: false }), fork({ wheelDiameter: 'ISO_584' }),
    ), 'R-FRK-04');
    const w = e.checkForkWheelDiameter(
      frame({ wheelDiameter: 'ISO_622', mulletApproved: true }), fork({ wheelDiameter: 'ISO_584' }),
    );
    assert.ok(w, 'expected R-FRK-04 to still note the mismatch');
    assert.equal(w!.severity, 'info', 'mullet-approved frames downgrade this to info, not silence');
    fits(e.checkForkWheelDiameter(frame({ wheelDiameter: 'ISO_622' }), fork({ wheelDiameter: 'ISO_622' })));
  });

  test('a rigid fork should match the sagged length of the suspension fork it replaces (R-FRK-05)', () => {
    warns(e.checkRigidForkCorrection(
      frame({ designAxleToCrownMm: 470, maxForkTravelMm: 140 }), fork({ isSuspension: false, axleToCrownMm: 500 }),
    ), 'R-FRK-05'); // sagged target ≈ 470-140*0.25=435, 500 is 65mm off
    fits(e.checkRigidForkCorrection(
      frame({ designAxleToCrownMm: 470, maxForkTravelMm: 140 }), fork({ isSuspension: false, axleToCrownMm: 435 }),
    ));
    // A genuine suspension fork isn't what this rule is about.
    fits(e.checkRigidForkCorrection(
      frame({ designAxleToCrownMm: 470, maxForkTravelMm: 140 }), fork({ isSuspension: true, axleToCrownMm: 500 }),
    ));
  });

  test('offset/rake is advisory-only and never blocks (R-FRK-06)', () => {
    // Regression guard, same shape as R-BRK-10: no universal threshold to
    // gate on, so this stays a deliberate no-op regardless of offset.
    fits(e.checkForkOffset(frame(), fork({ offsetMm: 44 })));
    fits(e.checkForkOffset(frame(), fork({ offsetMm: 51 })));
  });
});

describe('rear shock ↔ frame', () => {
  test('eye-to-eye and stroke must match exactly, zero tolerance (R-SHK-01)', () => {
    blocks(e.checkShockSize(
      frame({ shockEyeToEyeMm: 210, shockStrokeMm: 55 }), rearShock({ eyeToEyeMm: 210, strokeMm: 52.5 }),
    ), 'R-SHK-01');
    fits(e.checkShockSize(
      frame({ shockEyeToEyeMm: 210, shockStrokeMm: 55 }), rearShock({ eyeToEyeMm: 210, strokeMm: 55 }),
    ));
    fits(e.checkShockSize(frame({ shockEyeToEyeMm: null }), rearShock()));
  });

  test('trunnion and standard-eyelet mounts are not interchangeable (R-SHK-02)', () => {
    blocks(e.checkShockMount(
      frame({ shockMountType: 'TRUNNION' }), rearShock({ mountType: 'STANDARD_EYELET' }),
    ), 'R-SHK-02');
    fits(e.checkShockMount(frame({ shockMountType: 'TRUNNION' }), rearShock({ mountType: 'TRUNNION' })));
    fits(e.checkShockMount(frame({ shockMountType: undefined }), rearShock({ mountType: 'STANDARD_EYELET' })));
  });

  test('mounting hardware width and bushing diameter must match (R-SHK-03)', () => {
    blocks(e.checkShockHardware(
      frame({ shockHardwareWidthMm: 8 }), rearShock({ hardwareWidthMm: 6 }),
    ), 'R-SHK-03');
    blocks(e.checkShockHardware(
      frame({ shockBushingDiameterMm: 22.2 }), rearShock({ bushingDiameterMm: 12.7 }),
    ), 'R-SHK-03');
    fits(e.checkShockHardware(
      frame({ shockHardwareWidthMm: 8, shockBushingDiameterMm: 22.2 }),
      rearShock({ hardwareWidthMm: 8, bushingDiameterMm: 22.2 }),
    ));
    // Neither figure published on one side -- nothing to compare, stays quiet.
    fits(e.checkShockHardware(frame(), rearShock()));
  });

  test('metric and imperial shock sizing don\'t mix (R-SHK-04)', () => {
    // Heuristic: a frame eye-to-eye divisible by 5 is treated as a metric
    // figure (230/210/205mm are the real-world metric sizes) since there's
    // no separate stored "sizing standard" field on Frame to check against.
    blocks(e.checkShockSizingStandard(
      frame({ shockEyeToEyeMm: 210 }), rearShock({ sizing: 'IMPERIAL' }),
    ), 'R-SHK-04');
    fits(e.checkShockSizingStandard(frame({ shockEyeToEyeMm: 210 }), rearShock({ sizing: 'METRIC' })));
  });

  test('a piggyback reservoir is worth a clearance check, not a block (R-SHK-05)', () => {
    warns(e.checkShockReservoir(frame(), rearShock({ hasReservoir: true })), 'R-SHK-05');
    fits(e.checkShockReservoir(frame(), rearShock({ hasReservoir: false })));
  });

  test('coil spring rate should suit leverage ratio and rider weight (R-SHK-06)', () => {
    const w = e.checkCoilSpringRate(
      frame({ leverageRatio: 2.8, shockStrokeMm: 55 }),
      rearShock({ isCoil: true, springRate: 300 }),
      rider({ weightKg: 90 }),
    );
    warns(w, 'R-SHK-06');
    fits(e.checkCoilSpringRate(
      // Target for a 90kg rider at this leverage/stroke works out to 850lb
      // (riderLb*leverage / ((strokeMm/25.4)*0.3), rounded to the nearest
      // 10) -- 830 sits well inside the ±75lb tolerance.
      frame({ leverageRatio: 2.8, shockStrokeMm: 55 }),
      rearShock({ isCoil: true, springRate: 830 }),
      rider({ weightKg: 90 }),
    ));
    // No rider weight on file -- stay quiet rather than assume a rate is wrong.
    fits(e.checkCoilSpringRate(
      frame({ leverageRatio: 2.8, shockStrokeMm: 55 }), rearShock({ isCoil: true, springRate: 300 }), rider(),
    ));
    // Not a coil shock -- rule doesn't apply.
    fits(e.checkCoilSpringRate(
      frame({ leverageRatio: 2.8, shockStrokeMm: 55 }), rearShock({ isCoil: false, springRate: 300 }), rider({ weightKg: 90 }),
    ));
  });

  test('a linear-leverage frame is a poor match for a coil shock (R-SHK-07)', () => {
    const w = e.checkCoilSuitability(frame({ suitableForCoil: false }), rearShock({ isCoil: true }));
    assert.ok(w, 'expected R-SHK-07 to fire');
    assert.equal(w!.id, 'R-SHK-07');
    assert.equal(w!.severity, 'info', 'R-SHK-07 is advisory, never blocking');
    fits(e.checkCoilSuitability(frame({ suitableForCoil: true }), rearShock({ isCoil: true })));
    fits(e.checkCoilSuitability(frame({ suitableForCoil: false }), rearShock({ isCoil: false })));
  });
});

describe('cockpit', () => {
  test('stem clamp must match bar diameter (R-CKP-01)', () => {
    blocks(e.checkStemBarClamp(stem({ barClampDiameterMm: 31.8 }), handlebar({ clampDiameterMm: 35.0 })), 'R-CKP-01');
    fits(e.checkStemBarClamp(stem({ barClampDiameterMm: 31.8 }), handlebar({ clampDiameterMm: 31.8 })));
  });

  test('stem steerer clamp must match the fork\'s steerer at the stem (R-CKP-02)', () => {
    // Tapered steerers are 1-1/8" (28.6mm) at the stem clamp regardless of
    // the lower bearing size; only a straight 1.5" steerer is 38.1mm there.
    blocks(e.checkStemSteerer(
      fork({ steererTubeTaper: 'TAPERED_1_5_TO_1_125' }), stem({ steererClampMm: 31.8 }),
    ), 'R-CKP-02');
    fits(e.checkStemSteerer(fork({ steererTubeTaper: 'TAPERED_1_5_TO_1_125' }), stem({ steererClampMm: 28.6 })));
    fits(e.checkStemSteerer(fork({ steererTubeTaper: 'STRAIGHT_1_5' }), stem({ steererClampMm: 38.1 })));
  });

  test('shifter/lever control clamp must match the bar\'s control area (R-CKP-03)', () => {
    blocks(e.checkControlClampDiameter(
      handlebar({ controlClampDiameterMm: 22.2 }), shifter({ clampDiameterMm: 23.8 }),
    ), 'R-CKP-03');
    fits(e.checkControlClampDiameter(handlebar({ controlClampDiameterMm: 22.2 }), shifter({ clampDiameterMm: 22.2 })));
    // Unpublished clamp diameter on the control -- stay quiet.
    fits(e.checkControlClampDiameter(handlebar(), shifter({ clampDiameterMm: undefined })));
  });

  test('drop-bar controls don\'t go on a flat bar and vice versa (R-CKP-04)', () => {
    blocks(e.checkBarControlType(handlebar({ barType: 'FLAT' }), shifter({ barType: 'DROP' })), 'R-CKP-04');
    fits(e.checkBarControlType(handlebar({ barType: 'FLAT' }), shifter({ barType: 'FLAT' })));
    fits(e.checkBarControlType(handlebar({ barType: 'DROP' }), shifter({ barType: 'AERO' })));
    fits(e.checkBarControlType(handlebar({ barType: 'FLAT' }), shifter({ barType: undefined })));
  });

  test('an integrated cockpit already includes the bar (R-CKP-05)', () => {
    const w = e.checkIntegratedCockpit(stem({ integratedCockpit: true }), handlebar());
    assert.ok(w, 'expected R-CKP-05 to fire');
    assert.equal(w!.severity, 'info');
    fits(e.checkIntegratedCockpit(stem({ integratedCockpit: false }), handlebar()));
  });

  test('an internally-routed bar needs a frame with somewhere for the cables to go (R-CKP-06)', () => {
    warns(e.checkBarInternalRouting(handlebar({ internalRouting: true }), frame({ cableRouting: 'EXTERNAL' })), 'R-CKP-06');
    fits(e.checkBarInternalRouting(handlebar({ internalRouting: true }), frame({ cableRouting: 'INTERNAL' })));
    fits(e.checkBarInternalRouting(handlebar({ internalRouting: true }), frame({ cableRouting: 'MIXED' })));
    fits(e.checkBarInternalRouting(handlebar({ internalRouting: false }), frame({ cableRouting: 'EXTERNAL' })));
  });

  test('stem length and bar width are fit choices, advisory-only (R-CKP-07)', () => {
    fits(e.checkCockpitFit(stem({ lengthMm: 130 }), handlebar({ widthMm: 800 })));
  });
});

describe('frame mounts & routing', () => {
  test('a chain guide needs matching ISCG tabs, or a BB-mount version fits anything (R-MNT-01)', () => {
    blocks(e.checkChainGuideMount(
      frame({ iscgStandard: 'ISCG_05' }), chainGuide({ mountStandard: 'ISCG_OLD' }),
    ), 'R-MNT-01');
    fits(e.checkChainGuideMount(frame({ iscgStandard: 'ISCG_05' }), chainGuide({ mountStandard: 'ISCG_05' })));
    fits(e.checkChainGuideMount(frame({ iscgStandard: 'ISCG_05' }), chainGuide({ mountStandard: 'BB_MOUNT' })));
    fits(e.checkChainGuideMount(frame({ iscgStandard: undefined }), chainGuide({ mountStandard: 'ISCG_OLD' })));
  });

  test('a wireless drivetrain on an externally-routed frame is worth an info note, not a block (R-MNT-02)', () => {
    // Narrow by design: mechanical cable routing (internal vs external
    // ports) is rarely a hard blocker -- a frame with no internal port can
    // still be run externally -- so this only flags the one genuinely
    // informational case (wireless routing simply going unused), not a
    // general "ports must match" gate. COMPATIBILITY_RULES.md previously
    // overclaimed this as `critical`; corrected to match.
    const w = e.checkCableRouting(frame({ cableRouting: 'EXTERNAL' }), shifter({ cablePullStandard: 'ELECTRONIC_AXS' }));
    assert.ok(w, 'expected R-MNT-02 to fire');
    assert.equal(w!.severity, 'info');
    fits(e.checkCableRouting(frame({ cableRouting: 'INTERNAL' }), shifter({ cablePullStandard: 'ELECTRONIC_AXS' })));
    fits(e.checkCableRouting(frame({ cableRouting: 'EXTERNAL' }), shifter({ cablePullStandard: 'SHIMANO_MTB' })));
  });

  test('a hydraulic lever needs hose ports, not just cable stops (R-MNT-03)', () => {
    warns(e.checkHosePorts(frame({ cableRouting: 'EXTERNAL' }), lever({ isHydraulic: true })), 'R-MNT-03');
    fits(e.checkHosePorts(frame({ cableRouting: 'INTERNAL' }), lever({ isHydraulic: true })));
    fits(e.checkHosePorts(frame({ cableRouting: 'EXTERNAL' }), lever({ isHydraulic: false })));
    // Unpublished isHydraulic -- never guessed, same fix as R-BRK-09.
    fits(e.checkHosePorts(frame({ cableRouting: 'EXTERNAL' }), lever({ isHydraulic: undefined })));
  });

  test('no bottle mounts is worth knowing, not blocking (R-MNT-04)', () => {
    const w = e.checkBottleMounts(frame({ bottleMounts: 0 }));
    assert.ok(w, 'expected R-MNT-04 to fire'); assert.equal(w!.severity, 'info');
    fits(e.checkBottleMounts(frame({ bottleMounts: 2 })));
    fits(e.checkBottleMounts(frame({ bottleMounts: undefined })));
  });

  test('no rack/fender eyelets is worth knowing, not blocking (R-MNT-05)', () => {
    const w = e.checkEyelets(frame({ hasEyelets: false }));
    assert.ok(w, 'expected R-MNT-05 to fire'); assert.equal(w!.severity, 'info');
    fits(e.checkEyelets(frame({ hasEyelets: true })));
  });

  test('a mechanical lever needing compressionless housing is a warning (R-MNT-06)', () => {
    warns(e.checkHousingType(lever({ requiresCompressionless: true })), 'R-MNT-06');
    fits(e.checkHousingType(lever({ requiresCompressionless: false })));
  });
});

describe('tyres and rims', () => {
  test('tyre wider than the frame clears is blocked', () => {
    blocks(e.checkRearTyreClearance(frame({ maxTyreWidthMm: 58 }), wheels(), tyre({ widthMm: 63 })), 'R-TIR-02');
  });

  test('tyre within clearance fits', () => {
    fits(e.checkRearTyreClearance(frame({ maxTyreWidthMm: 63 }), wheels(), tyre({ widthMm: 61 })));
  });

  test('a 650b tyre will not seat on a 700c rim', () => {
    blocks(e.checkRearTyreClearance(frame(), wheels({ wheelDiameter: 'ISO_622' }), tyre({ wheelDiameter: 'ISO_584' })), 'R-TIR-01');
  });

  // Safety rule: on a hookless rim only the bead's interference fit holds
  // the tyre on, so an unapproved tyre can blow off under pressure.
  test('hookless rim rejects a tyre not rated for it', () => {
    blocks(e.checkHookless(wheels({ hookless: true }), tyre({ hooklessSafe: false })), 'R-TIR-04');
    fits(e.checkHookless(wheels({ hookless: true }), tyre({ hooklessSafe: true })));
  });

  test('tyre width outside the rim\'s recommended range warns (R-TIR-03)', () => {
    // 30mm internal rim wants roughly 42-72mm tyres (1.4x-2.4x).
    warns(e.checkTyreRimWidth(wheels({ internalRimWidthMm: 30 }), tyre({ widthMm: 35 })), 'R-TIR-03');
    fits(e.checkTyreRimWidth(wheels({ internalRimWidthMm: 30 }), tyre({ widthMm: 61 })));
  });

  test('a tubeless tyre on a non-tubeless rim warns, not blocks (R-TIR-05)', () => {
    warns(e.checkTubelessRim(wheels({ tubelessReady: false }), tyre({ tubeless: true })), 'R-TIR-05');
    fits(e.checkTubelessRim(wheels({ tubelessReady: true }), tyre({ tubeless: true })));
    fits(e.checkTubelessRim(wheels({ tubelessReady: false }), tyre({ tubeless: false })));
  });

  test('a wide rim pushes a nominally-fitting tyre over the frame limit (R-TIR-09)', () => {
    warns(e.checkRimPlusTyreClearance(
      frame({ maxTyreWidthMm: 63 }),
      wheels({ internalRimWidthMm: 35 }),
      tyre({ widthMm: 60 }),
    ), 'R-TIR-09');
    fits(e.checkRimPlusTyreClearance(frame({ maxTyreWidthMm: 63 }), wheels({ internalRimWidthMm: 30 }), tyre({ widthMm: 61 })));
  });
});

describe('inner tubes', () => {
  test('a Schrader tube in a Presta-drilled rim is impossible, not just a rattle', () => {
    blocks(e.checkValveHole(wheels({ valveHoleType: 'PRESTA' }), tube({ valveType: 'SCHRADER' })), 'R-TIR-06');
  });

  test('the reverse pairing is a warning, not a block — it rattles, it does not jam', () => {
    warns(e.checkValveHole(wheels({ valveHoleType: 'SCHRADER' }), tube({ valveType: 'PRESTA' })), 'R-TIR-06');
  });

  test('a matching valve fits', () => {
    fits(e.checkValveHole(wheels({ valveHoleType: 'PRESTA' }), tube({ valveType: 'PRESTA' })));
  });

  // Regression: checkValveHole/checkValveLength/checkTubeSize used to be
  // called with `frontTube ?? rearTube` in the whole-build aggregator, so
  // whenever a frontTube was picked, a rearTube (and any mismatch on it)
  // was never validated at all — a build with a fine front tube and a
  // Schrader rear tube on a Presta-only wheelset reported fully compatible.
  test('the whole-build aggregation checks the rear tube even when a front tube is also present', () => {
    const build: BikeBuild = {
      wheelset: wheels({ valveHoleType: 'PRESTA' }),
      frontTube: tube({ valveType: 'PRESTA' }),
      rearTube: tube({ valveType: 'SCHRADER' }),
    };
    const rearWarning = e.getCompatibilityWarnings(build).find((w) => w.id === 'R-TIR-06');
    assert.ok(rearWarning, 'expected R-TIR-06 to fire for the rear tube even though the front tube is fine');
    assert.deepEqual(rearWarning!.components, ['wheelset', 'rearTube']);
  });

  test('a valve stem too short to clear a deep rim warns (R-TIR-07)', () => {
    warns(e.checkValveLength(wheels({ rimDepthMm: 45 }), tube({ valveLengthMm: 40 })), 'R-TIR-07');
    fits(e.checkValveLength(wheels({ rimDepthMm: 45 }), tube({ valveLengthMm: 55 })));
    // Unpublished rim depth -- stay quiet rather than assume too short.
    fits(e.checkValveLength(wheels({ rimDepthMm: undefined }), tube({ valveLengthMm: 20 })));
  });

  test('tube diameter must match the tyre, and width range should cover it (R-TIR-08)', () => {
    blocks(e.checkTubeSize(tube({ wheelDiameter: 'ISO_622' }), tyre({ wheelDiameter: 'ISO_584' })), 'R-TIR-08');
    warns(e.checkTubeSize(tube({ minWidthMm: 28, maxWidthMm: 45 }), tyre({ widthMm: 61 })), 'R-TIR-08');
    fits(e.checkTubeSize(tube({ minWidthMm: 28, maxWidthMm: 62 }), tyre({ widthMm: 61 })));
  });
});

describe('seatpost — regressions for two bugs found against real data', () => {
  test('diameter must match the seat tube', () => {
    blocks(e.checkSeatpostDiameter(frame({ seatpostDiameterMm: 31.6 }), post({ diameterMm: 34.9 })), 'R-SP-01');
    fits(e.checkSeatpostDiameter(frame({ seatpostDiameterMm: 31.6 }), post({ diameterMm: 31.6 })));
  });

  // BUG 1: a wireless dropper needs no cable port, so routing is
  // irrelevant. This previously reported a routing mismatch and hid
  // every wireless post.
  test('a wireless dropper fits an internally-routed frame', () => {
    fits(e.checkDropperRouting(
      frame({ seatpostRouting: 'INTERNAL' }),
      post({ isDropper: true, routingType: 'NONE' }),
    ));
  });

  // BUG 2: travel and head sit above the collar, so only part of the
  // post is buried. Comparing total length against max insertion
  // excluded virtually every dropper made.
  test('insertion depth counts the buried length, not the whole post', () => {
    fits(e.checkSeatpostInsertion(
      frame({ maxSeatpostInsertionMm: 270 }),
      post({ totalLengthMm: 440, travelMm: 150, isDropper: true }),
    ));
  });

  test('a post too long to bury is still blocked', () => {
    blocks(e.checkSeatpostInsertion(
      frame({ maxSeatpostInsertionMm: 150 }),
      post({ totalLengthMm: 440, travelMm: 150, isDropper: true }),
    ), 'R-SP-03');
  });

  test('an internally-routed dropper on an externally-routed frame is blocked (R-SP-02)', () => {
    blocks(e.checkDropperRouting(
      frame({ seatpostRouting: 'EXTERNAL' }),
      post({ isDropper: true, routingType: 'INTERNAL' }),
    ), 'R-SP-02');
    // MIXED-routed frames accept either.
    fits(e.checkDropperRouting(
      frame({ seatpostRouting: 'MIXED' }),
      post({ isDropper: true, routingType: 'INTERNAL' }),
    ));
  });

  test('dropper travel beyond the rider\'s usable range is advisory only (R-SP-04)', () => {
    const w = e.checkDropperTravel(post({ isDropper: true, travelMm: 200 }), rider({ inseamCm: 75 }));
    assert.ok(w, 'expected R-SP-04 to fire');
    assert.equal(w!.id, 'R-SP-04');
    assert.equal(w!.severity, 'info', 'R-SP-04 is advisory, never blocking');
    fits(e.checkDropperTravel(post({ isDropper: true, travelMm: 100 }), rider({ inseamCm: 75 })));
  });

  test('seat clamp diameter must match the seat tube collar (R-SP-05)', () => {
    blocks(e.checkSeatClamp(frame({ seatClampDiameterMm: 34.9 }), clamp({ diameterMm: 31.8 })), 'R-SP-05');
    fits(e.checkSeatClamp(frame({ seatClampDiameterMm: 34.9 }), clamp({ diameterMm: 34.9 })));
  });

  test('saddle rail type must match the post\'s clamp (R-SP-06)', () => {
    blocks(e.checkSaddleRails(post({ railClampType: 'ROUND_7MM' }), saddle({ railType: 'OVAL_7X9MM' })), 'R-SP-06');
    fits(e.checkSaddleRails(post({ railClampType: 'ROUND_7MM' }), saddle({ railType: 'ROUND_7MM' })));
  });

  test('a dropper with no remote type set warns (R-SP-07)', () => {
    warns(e.checkDropperRemote(post({ isDropper: true, remoteType: 'NONE' })), 'R-SP-07');
    fits(e.checkDropperRemote(post({ isDropper: true, remoteType: 'CABLE' })));
  });
});

describe('crank & chainring extras', () => {
  test('chainline mismatch against the hub spacing warns (R-CRK-01)', () => {
    warns(e.checkChainline(
      crank({ chainlineMm: 45 }),
      wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' }),
    ), 'R-CRK-01');
    fits(e.checkChainline(crank({ chainlineMm: 52 }), wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' })));
  });

  test('a chainring bigger than the frame allows is blocked (R-CRK-02)', () => {
    blocks(e.checkChainringClearance(frame({ maxChainringTeeth: 36 }), chainring({ teeth: 38 })), 'R-CRK-02');
    fits(e.checkChainringClearance(frame({ maxChainringTeeth: 36 }), chainring({ teeth: 34 })));
  });

  test('a wide Q-factor is a warning, not a block (R-CRK-03)', () => {
    warns(e.checkQFactor(frame(), crank({ qFactorMm: 190 })), 'R-CRK-03');
    fits(e.checkQFactor(frame(), crank({ qFactorMm: 175 })));
  });

  test('crank length outside typical fit guidance is advisory only (R-CRK-04)', () => {
    const w = e.checkCrankLength(crank({ crankLengthMm: 175 }), rider({ inseamCm: 75 }));
    assert.ok(w, 'expected R-CRK-04 to fire');
    assert.equal(w!.id, 'R-CRK-04');
    assert.equal(w!.severity, 'info', 'R-CRK-04 is advisory, never blocking');
    fits(e.checkCrankLength(crank({ crankLengthMm: 155 }), rider({ inseamCm: 75 })));
  });

  test('an under-offset ring on a Boost drivetrain warns about the chainline (R-CHR-03)', () => {
    warns(e.checkChainringOffset(
      chainring({ offsetMm: 0 }),
      wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' }),
    ), 'R-CHR-03');
    fits(e.checkChainringOffset(chainring({ offsetMm: 3 }), wheels({ rearAxleType: 'THRU_AXLE_148x12_BOOST' })));
  });

  test('a 1x setup without a narrow-wide ring warns of chain drop risk (R-CHR-04)', () => {
    warns(e.checkNarrowWide(crank({ chainringCount: 1 }), chainring({ narrowWide: false }), undefined), 'R-CHR-04');
    fits(e.checkNarrowWide(crank({ chainringCount: 1 }), chainring({ narrowWide: true }), undefined));
    // A front derailleur present means it's not a 1x setup -- no ring guidance needed.
    fits(e.checkNarrowWide(crank({ chainringCount: 2 }), chainring({ narrowWide: false }), fd()));
  });
});

describe('front derailleur', () => {
  test('front derailleur mount type must match the frame (R-FD-01)', () => {
    blocks(e.checkFdMount(frame({ fdMountType: 'BRAZE_ON' }), fd({ mountType: 'CLAMP_31_8' })), 'R-FD-01');
    fits(e.checkFdMount(frame({ fdMountType: 'BRAZE_ON' }), fd({ mountType: 'BRAZE_ON' })));
  });

  test('top-pull vs bottom-pull routing must match (R-FD-02)', () => {
    blocks(e.checkFdPullDirection(
      frame({ fdPullDirection: 'TOP_PULL' }), fd({ pullDirection: 'BOTTOM_PULL' }),
    ), 'R-FD-02');
    // Dual-pull derailleurs and dual-pull frames accept either direction.
    fits(e.checkFdPullDirection(frame({ fdPullDirection: 'TOP_PULL' }), fd({ pullDirection: 'DUAL_PULL' })));
    fits(e.checkFdPullDirection(frame({ fdPullDirection: 'DUAL_PULL' }), fd({ pullDirection: 'BOTTOM_PULL' })));
  });

  test('a chainring beyond the derailleur cage\'s rated size warns (R-FD-03)', () => {
    warns(e.checkFdChainring(fd({ maxChainringTeeth: 38 }), chainring({ teeth: 42 })), 'R-FD-03');
    fits(e.checkFdChainring(fd({ maxChainringTeeth: 38 }), chainring({ teeth: 36 })));
  });

  test('front derailleur speed count vs shifter speed count warns (R-FD-04)', () => {
    warns(e.checkFdSpeeds(shifter({ speeds: 12 }), fd({ speeds: 2 })), 'R-FD-04');
    fits(e.checkFdSpeeds(shifter({ speeds: 11 }), fd({ speeds: 11 })));
  });
});

describe('missing data is never guessed', () => {
  test('an absent part yields no opinion', () => {
    fits(e.checkBbShellMatch(undefined, bb()));
    fits(e.checkSpindleMatch(bb(), undefined));
    fits(e.checkUdhTransmission(frame(), undefined));
  });

  test('an unpublished spec yields no opinion', () => {
    // No maxForkTravelMm on the frame — the rule stays quiet rather
    // than assuming a limit.
    fits(e.checkForkTravel(frame({ maxForkTravelMm: null }), fork({ travelMm: 200 })));
    fits(e.checkSeatpostDiameter(frame({ seatpostDiameterMm: null }), post()));
  });

  test('tyre clearance is the exception — unknown is worth warning about', () => {
    warns(e.checkRearTyreClearance(
      frame({ wheelDiameter: 'ISO_622', maxTyreWidthMm650b: null }),
      wheels({ wheelDiameter: 'ISO_584' }),
      tyre({ wheelDiameter: 'ISO_584' }),
    ), 'R-TIR-02');
  });

  test('an unrecorded derailleur mount type is another exception — a UDH Transmission derailleur imported without this field would otherwise pass silently onto a frame it cannot bolt to', () => {
    // Regression: mountStandard === null used to be treated identically to
    // "definitely not UDH-direct", so a real SRAM Transmission derailleur
    // imported with this field unset silently fit any frame.
    warns(e.checkUdhTransmission(
      frame({ hangerStandard: 'PROPRIETARY' }),
      rd({ mountStandard: null }),
    ), 'R-HGR-01');
  });

  test('...but on a UDH frame, an unrecorded mount type is genuinely fine either way', () => {
    fits(e.checkUdhTransmission(frame({ hangerStandard: 'UDH' }), rd({ mountStandard: null })));
  });

  test('a brake lever/caliper with an unpublished isHydraulic never gets guessed as hydraulic', () => {
    // Regression: `?? true` on both sides meant a real mechanical lever
    // with isHydraulic unset, paired with a real mechanical caliper,
    // compared (undefined ?? true) !== (false ?? true) and fired a
    // CRITICAL mismatch on a build that was actually fine.
    fits(e.checkBrakeActuation(lever({ isHydraulic: undefined }), caliper({ isHydraulic: false })));
    fits(e.checkBrakeActuation(lever({ isHydraulic: true }), caliper({ isHydraulic: undefined })));
    // Still fires when both sides are genuinely known and disagree.
    blocks(e.checkBrakeActuation(lever({ isHydraulic: true }), caliper({ isHydraulic: false })), 'R-BRK-09');
  });
});

describe('lockout layer', () => {
  const build: BikeBuild = { frame: frame({ bbShellStandard: 'BSA_73' }) };

  test('only criticals hide a part', () => {
    const candidates = [bb({ partId: 'ok', frameInterface: 'BSA_73' }), bb({ partId: 'no', frameInterface: 'PF92' })];
    const kept = e.filterCompatibleBottomBrackets(build, candidates);
    assert.deepEqual(kept.map((b) => b.partId), ['ok']);
  });

  test('an adapter-resolvable rotor stays selectable', () => {
    const forkBuild: BikeBuild = { fork: fork({ brakeMountType: 'POST_MOUNT_160', maxRotorMm: 200 }) };
    const kept = e.filterCompatibleRotors(forkBuild, [rotor({ partId: 'big', diameterMm: 180 })], 'front');
    assert.equal(kept.length, 1, 'a rotor needing only an adapter must not be hidden');
  });

  test('an empty build hides nothing', () => {
    const candidates = [bb({ partId: 'a' }), bb({ partId: 'b', frameInterface: 'PF92' })];
    assert.equal(e.filterCompatibleBottomBrackets({}, candidates).length, 2);
  });
});

describe('whole-build aggregation', () => {
  test('a coherent build reports compatible', () => {
    const build: BikeBuild = {
      frame: frame(), fork: fork(), bottomBracket: bb(), crankset: crank(),
      wheelset: wheels(), rearTyre: tyre(), frontTyre: tyre(),
      shifter: shifter(), rearDerailleur: rd(), cassette: cassette(), chain: chain(),
    };
    assert.equal(e.isBuildCompatible(build), true,
      'criticals: ' + e.getCompatibilityWarnings(build).filter((w) => w.severity === 'critical').map((w) => w.id).join(', '));
  });

  test('one bad part makes the whole build incompatible', () => {
    const build: BikeBuild = { frame: frame({ bbShellStandard: 'BSA_73' }), bottomBracket: bb({ frameInterface: 'PF92' }) };
    assert.equal(e.isBuildCompatible(build), false);
    assert.ok(e.getCompatibilityWarnings(build).some((w) => w.id === 'R-BB-01'));
  });

  test('warnings alone do not make a build incompatible', () => {
    const build: BikeBuild = {
      fork: fork({ brakeMountType: 'POST_MOUNT_160', maxRotorMm: 200 }),
      frontRotor: rotor({ diameterMm: 180 }),
    };
    assert.equal(e.isBuildCompatible(build), true, 'an adapter warning must not block the build');
    assert.ok(e.getCompatibilityWarnings(build).some((w) => w.id === 'R-BRK-03'));
  });
});
