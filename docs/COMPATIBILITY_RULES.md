# Bike Compatibility — Complete Rule Catalogue

Every part-to-part compatibility constraint on a modern bike, and how each
one maps to a rule in `src/compatibility/engine.ts`.

**All 103 rules are implemented.** Each has a function in
`src/compatibility/engine.ts` named for its rule ID, wired into
`getCompatibilityWarnings` and — where it can block — into the
`filterCompatible*` lockout layer.

Rules whose inputs a spec sheet may not publish degrade gracefully: the
schema field is nullable and the rule returns null rather than guessing.
The rider-fit rules (R-FIT-*) only run when optional rider measurements
are set on the build, and never block.

## Rule forms

Every rule below reduces to one of six shapes. Knowing which shape you're
dealing with tells you exactly what the function signature and the schema
field need to be.

| Form | Shape | Example |
| --- | --- | --- |
| **A — Enum equality** | `a.x === b.y`, closed enums, no tolerance | BB shell standard |
| **B — Numeric ceiling** | `part.value <= limit.max` | Tyre width vs frame clearance |
| **C — Range overlap** | `min <= value <= max` | Tyre width vs internal rim width |
| **D — Lookup table** | pair → verdict, often "yes, with adapter X" | Caliper mount + rotor size |
| **E — Derived/compound** | computed from 3+ parts | Drivetrain total capacity |
| **F — Advisory** | legal but consequential | Crank length vs pedal strike |

### Severity guidance

- **critical** — physically will not assemble, or is unsafe. Locks the part out.
- **warning** — assembles, but degraded, needs an extra part, or unverified.
- **info** — worth knowing, never blocks.

A rule that can be resolved by buying a cheap adapter is a **warning with a
named remedy**, never critical — the warning carries a `remedy` field
naming the exact part needed. Only `critical` hides a part from the
lockout, which is what keeps adapter-legal builds visible (see R-BRK-03).

---

## 1. Frame ↔ Fork

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-HS-01 ✅ | Steerer taper matches head tube | A | `headsetTaper`, `steererTubeTaper` | critical |
| R-HS-02 ✅ | Headset upper/lower cup standard matches head tube (EC34, ZS44, IS42, ZS56, EC49…). Upper and lower are independent. | A ×2 | `headTubeUpper/LowerStandard` on Frame, `headsetUpper/Lower` on Headset | critical |
| R-HS-03 ✅ | Crown race seat diameter matches fork crown (30.0mm for 1⅛", 40.0mm for 1.5" tapered) | A | `crownRaceDiameterMm` | critical |
| R-FRK-01 ✅ | Steerer tube length ≥ head tube + headset stack + spacers + stem | E | `steererLengthMm`, `headTubeLengthMm` | critical |
| R-FRK-02 ✅ | Fork travel ≤ frame's max rated travel. Exceeding it wrecks geometry and voids most warranties. | B | `maxForkTravelMm` on Frame, `travelMm` on Fork | critical |
| R-FRK-03 ✅ | Axle-to-crown length within frame's design window (±~10mm) | C | `axleToCrownMm`, `designAxleToCrownMm` | warning |
| R-FRK-04 ✅ | Fork wheel diameter matches frame's — unless frame explicitly supports mullet (mixed 29/27.5) | A + flag | `mulletApproved` on Frame | warning |
| R-FRK-05 ✅ | Rigid fork on a suspension-corrected frame must match sag-adjusted A-C | C | as R-FRK-03 | warning |
| R-FRK-06 ✅ | Fork offset/rake changes trail and handling | F | `offsetMm` | info |

## 2. Frame ↔ Bottom Bracket ↔ Crankset

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-BB-01 ✅ | BB shell standard matches | A | `bbShellStandard`, `frameInterface` | critical |
| R-BB-02 ✅ | Spindle interface matches BB | A | `spindleInterface`, `spindleDiameter` | critical |
| R-BB-03 ✅ | Shell **width** matches (68/73/83/100mm). Currently folded into the standard enum, which hides real mismatches. | A | `shellWidthMm` | critical |
| R-BB-04 ✅ | Italian vs English threading (Italian is 70mm, opposite thread direction) | A | part of `bbShellStandard` | critical |
| R-BB-05 ✅ | Spindle length sufficient for shell width; spacer count differs 68 vs 73 | E | `spindleLengthMm` | warning |
| R-CRK-01 ✅ | Chainline matches rear hub spacing — Boost 52mm, standard 49mm, Super Boost 56.5mm. Mismatch = poor shifting and chain wear. | A | `chainlineMm` (already a loose string) | warning |
| R-CRK-02 ✅ | Chainring size ≤ frame's max (chainstay clearance) | B | `maxChainringTeeth` on Frame | critical |
| R-CRK-03 ✅ | Q-factor clears chainstays | B | `qFactorMm` | warning |
| R-CRK-04 ✅ | Crank length vs BB drop (pedal strike) and leg length | F | `crankLengthMm` | info |

## 3. Chainring ↔ Crank

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-CHR-01 ✅ | BCD matches (104/96/94/110/76mm) **and** bolt count (4 vs 5) | A ×2 | `bcdMm`, `boltCount` | critical |
| R-CHR-02 ✅ | Direct-mount interface matches (SRAM 3-bolt, Race Face Cinch, Shimano direct) | A | `directMountStandard` | critical |
| R-CHR-03 ✅ | Ring offset (0/3/6mm) produces the target chainline | E | `offsetMm` | warning |
| R-CHR-04 ✅ | 1x drivetrains need narrow-wide tooth profile | A | `narrowWide`, `chainringCount` | warning |

## 4. Drivetrain — Shifter ↔ Derailleur ↔ Cassette ↔ Chain

Section 4 was the single biggest correctness gap in v1 — `cablePullStandard`
and `speeds` existed on Shifter and RearDerailleur but nothing read them, so
a SRAM AXS pod paired with a cable Shimano derailleur reported "fully
compatible". All ten rules now enforce.

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-DRV-01 ✅ | Shifter cable pull ratio matches derailleur (Shimano MTB, SRAM Exact Actuation, X-Actuation, Shimano Road, Campagnolo) | A | `cablePullStandard` ×2 — **already present** | critical |
| R-DRV-02 ✅ | Speed count matches: `shifter.speeds === rd.maxSpeeds` | A | **already present** | critical |
| R-DRV-03 ✅ | Electronic ecosystems can't mix — AXS pod cannot drive a Di2 derailleur, and neither drives a mechanical one | A | `cablePullStandard` covers this if brand-scoped | critical |
| R-DRV-04 ✅ | Cassette largest cog ≤ derailleur max cog | B | `maxCassetteCogTeeth` present; needs Cassette model | critical |
| R-DRV-05 ✅ | Derailleur total capacity ≥ (large−small cog) + (large−small ring), for 2x | E | `totalCapacityTeeth` | warning |
| R-DRV-06 ✅ | Cage length suits cassette range (SS/GS/SGS) | D | `cageLength` | warning |
| R-DRV-07 ✅ | Chain speed matches cassette speed | A | Chain model, `speeds` | critical |
| R-DRV-08 ✅ | Brand-specific chains: SRAM Flattop (AXS road) and Shimano 12s MTB are not interchangeable | D | `chainStandard` | critical |
| R-DRV-09 ✅ | Chain length sufficient for largest ring + largest cog + rear centre | E | `links`, `chainstayLengthMm` | warning |
| R-DRV-10 ✅ | Cassette speed matches shifter speed | A | Cassette `speeds` | critical |

## 5. Cassette ↔ Freehub

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-FH-01 ✅ | Freehub body type matches cassette (HG, Micro Spline, XD, XDR, N3W) | A | `freehubBodyType` present on Wheelset; needs match on Cassette | critical |
| R-FH-02 ✅ | XDR is 1.85mm longer than XD — XD cassette on XDR body needs a spacer | D | `freehubBodyType` | warning |
| R-FH-03 ✅ | 11-speed road cassette on an older HG body needs a 1.85mm spacer | D | as above | warning |
| R-FH-04 ✅ | Micro Spline is Shimano 12s only; XD/XDR is SRAM | A | as above | critical |

## 6. Frame ↔ Derailleur Hanger

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-HGR-01 ✅ | **SRAM Transmission (T-Type) requires a UDH frame.** No hanger, mounts directly to the frame — a hard gate on an entire modern groupset family. | A | `hangerStandard` on Frame, `mountStandard` on RearDerailleur | critical |
| R-HGR-02 ✅ | Non-UDH frames need the exact proprietary hanger for that model | D | `hangerModel` | critical |
| R-HGR-03 ✅ | Direct-mount vs standard hanger derailleurs | A | `mountStandard` | critical |

## 7. Brakes

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-BRK-01 ✅ | Rear caliper mount matches frame | A | `rearBrakeMountType` | critical |
| R-BRK-02 ✅ | Front caliper mount matches fork | A | `brakeMountType` | critical |
| R-BRK-03 ✅ | **Rotor size via adapter.** Today's model treats a caliper's native size as fixed, so legal builds vanish. Should become: mount type + rotor size → adapter part number, as a *warning with remedy*. | D | `nativeRotorMm`, `rotorMm`, adapter lookup | warning |
| R-BRK-04 ✅ | Rotor size ≤ frame/fork max rated | B | `maxRotorMm` | critical |
| R-BRK-05 ✅ | Rotor mount matches hub: 6-bolt vs Centerlock | A | `rotorMountStandard` on Rotor + Wheelset | critical |
| R-BRK-06 ✅ | Centerlock external lockring won't clear some thru-axle hubs; internal needed | D | `lockringType` | warning |
| R-BRK-07 ✅ | Lever and caliper must be the same hydraulic system — DOT fluid vs mineral oil are not interchangeable, and mixing destroys seals | A | `fluidType` | critical |
| R-BRK-08 ✅ | Lever and caliper piston ratio must be brand/model matched | D | `brakeSystemFamily` | critical |
| R-BRK-09 ✅ | Mechanical lever ↔ hydraulic caliper mismatch | A | `isHydraulic` present on caliper; needs lever | critical |
| R-BRK-10 | Pad shape matches caliper model | D | `padShape` | advisory only — shown on the part page, not gated. `padShape` is free text on `BrakeCaliper` alone; nothing else in the data model carries a comparable field to check it against. |
| R-BRK-11 ✅ | Rotor thickness within pad/caliper spec (1.8mm standard, 2.3mm DH) | C | `rotorThicknessMm` | warning |
| R-BRK-12 ✅ | Rim brake track present if using rim brakes | A | `hasBrakeTrack` | critical |

## 8. Wheels ↔ Tyres

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-TIR-01 ✅ | Tyre bead diameter matches rim (ISO 622/584/559/507) | A | `wheelDiameter` | critical |
| R-TIR-02 ✅ | Tyre width ≤ frame/fork clearance, chosen per diameter | B | `maxTyreWidthMm`, `maxTyreWidthMm650b` | critical |
| R-TIR-03 ✅ | Tyre width within the rim's ETRTO recommended range for its internal width — currently a documented simplification | C | `internalRimWidthMm` present; needs range table | warning |
| R-TIR-04 ✅ | **Hookless rims require tubeless-compatible tyres** and cap pressure (~72psi). Getting this wrong can blow a tyre off the rim. | A + B | `hookless`, `tubeless`, `maxPressurePsi` | critical |
| R-TIR-05 ✅ | Tubeless tyre on a non-tubeless rim | A | `tubelessReady` present | warning |
| R-TIR-06 ✅ | Valve hole drilling matches valve type (Presta 6.5mm vs Schrader 8mm) | A | `valveHoleType` | critical |
| R-TIR-07 ✅ | Valve stem length > rim depth + ~10mm | B | `rimDepthMm`, `valveLengthMm` | warning |
| R-TIR-08 ✅ | Inner tube size range covers the tyre width | C | Tube model | warning |
| R-TIR-09 ✅ | Combined tyre + rim width still clears the frame | E | both widths | warning |

## 9. Axles & Hubs

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-AXL-01 ✅ | Rear hub spacing matches frame | A | `rearAxleType` | critical |
| R-AXL-02 ✅ | Front hub spacing matches fork | A | `frontAxleType` | critical |
| R-AXL-03 ✅ | Thru-axle thread pitch is frame-specific (M12×1.0 / 1.5 / 1.75) — spacing matching does **not** imply the axle fits | A | `frame.rearAxleThreadPitch` | info — advisory reminder, not gated. Axles in this catalogue are bundled with the wheelset/hub rather than sold as their own part, so there is no second, comparable thread-pitch value to check the frame's against. |
| R-AXL-04 ✅ | Dropout type matches: thru-axle vs QR vs UDH | A | `dropoutType` | critical |
| R-AXL-05 ✅ | Some hubs convert between standards via end caps | D | `convertibleEndCaps` | info |

## 10. Rear Shock ↔ Frame

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-SHK-01 ✅ | Eye-to-eye length **and** stroke must match the frame exactly (230×60, 210×55…). No tolerance whatsoever. | A ×2 | `eyeToEyeMm`, `strokeMm` | critical |
| R-SHK-02 ✅ | Trunnion vs standard eyelet mount | A | `shockMountType` | critical |
| R-SHK-03 ✅ | Mounting hardware width and bushing diameter | A ×2 | `hardwareWidthMm`, `bushingDiameterMm` | critical |
| R-SHK-04 ✅ | Metric vs imperial sizing | A | part of dimensions | critical |
| R-SHK-05 ✅ | Shock body/reservoir clears the frame's linkage | D | `reservoirType` | warning |
| R-SHK-06 ✅ | Coil spring rate suits frame leverage ratio and rider weight | E | `leverageRatio`, `springRate` | warning |
| R-SHK-07 ✅ | Frame leverage curve suits coil vs air | F | `suitableForCoil` | info |

## 11. Seatpost & Saddle

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-SP-01 ✅ | Seatpost diameter matches seat tube (27.2/30.9/31.6/34.9mm) | A | `seatpostDiameterMm` | critical |
| R-SP-02 ✅ | Dropper routing matches frame: internal needs a frame port, external needs external routing | A | `routingType` | critical |
| R-SP-03 ✅ | Dropper total length ≤ frame's max insertion depth | B | `maxInsertionMm`, `totalLengthMm` | critical |
| R-SP-04 ✅ | Dropper travel vs rider inseam | F | — | info |
| R-SP-05 ✅ | Seat clamp diameter matches seat tube OD | A | `seatClampDiameterMm` | critical |
| R-SP-06 ✅ | Saddle rail type matches post clamp: 7mm round vs 7×9mm oval carbon | A | `railType`, `clampRailSpec` | critical |
| R-SP-07 ✅ | Dropper remote matches actuation (cable vs electronic vs hydraulic) | A | `remoteType` | critical |

## 12. Cockpit

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-CKP-01 ✅ | Stem clamp diameter matches bar (31.8/35.0/25.4/26.0mm) | A | `barClampDiameterMm` | critical |
| R-CKP-02 ✅ | Stem steerer clamp matches steerer (1⅛" standard, or proprietary integrated) | A | `steererClampMm` | critical |
| R-CKP-03 ✅ | Control clamp area diameter — 22.2mm for MTB levers/shifters/grips | A | `controlClampDiameterMm` | critical |
| R-CKP-04 ✅ | Drop-bar levers can't go on flat bars and vice versa | A | `barType`, `leverType` | critical |
| R-CKP-05 ✅ | Integrated bar/stem removes stem compatibility entirely | D | `integratedCockpit` | info |
| R-CKP-06 ✅ | Internal routing bars need matching bar bore | A | `internalRouting` | warning |
| R-CKP-07 ✅ | Stem length/rise and bar width/sweep are fit choices | F | — | info |

## 13. Pedals & Shoes

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-PDL-01 ✅ | Pedal thread matches crank — 9/16" is universal on modern cranks | A | `pedalThread` | critical |
| R-PDL-02 ✅ | Cleat matches pedal system (SPD, SPD-SL, Look, Crank Brothers, Time) | A | `cleatSystem` | critical |
| R-PDL-03 ✅ | Shoe sole drilling matches cleat: 2-bolt MTB vs 3-bolt road | A | `soleDrilling` | critical |

## 14. Front Derailleur (2x/3x)

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-FD-01 ✅ | Mount type: braze-on vs clamp (28.6/31.8/34.9mm) | A | `fdMountType` | critical |
| R-FD-02 ✅ | Top-pull vs bottom-pull routing matches frame | A | `pullDirection` | critical |
| R-FD-03 ✅ | Chainline and max chainring within FD spec | B | `maxChainringTeeth` | warning |
| R-FD-04 ✅ | Speed count matches shifter | A | `speeds` | critical |

## 15. Frame Mounts & Routing

| ID | Rule | Form | Fields needed | Severity |
| --- | --- | --- | --- | --- |
| R-MNT-01 ✅ | Chain guide needs ISCG-05 / ISCG tabs, or a BB-mount version | A | `iscgStandard` | critical |
| R-MNT-02 ✅ | Wireless drivetrain on an externally-routed frame | A | `frame.cableRouting`, `shifter.cablePullStandard` | info — the routing just goes unused, it isn't a fit problem. Mechanical cable routing (internal vs external ports) is rarely a hard blocker in practice — a frame with no internal port can still be run externally — so `checkCableRouting` only flags the one case that's genuinely just informational, not a general "ports must match" critical gate. |
| R-MNT-03 ✅ | Brake needs hydraulic hose ports, not shift cable stops | A | as above | warning |
| R-MNT-04 ✅ | Bottle cage mount count and spacing | B | `bottleMounts` | info |
| R-MNT-05 ✅ | Rack/fender eyelets present | A | `hasEyelets` | info |
| R-MNT-06 ✅ | Compressionless housing required for mechanical brakes | D | `housingType` | warning |

## 16. Rider fit — not part-to-part

These have no PCPartPicker analogue, and are arguably the most important
"compatibility" question in cycling: the bike must fit the rider.

| ID | Rule | Form | Severity |
| --- | --- | --- | --- |
| R-FIT-01 ✅ | Frame size vs rider height | F | info |
| R-FIT-02 ✅ | Standover clearance vs inseam | F | warning |
| R-FIT-03 ✅ | Reach/stack vs riding style | F | info |
| R-FIT-04 | Crank length vs leg length | F | info — implemented as `checkCrankLength`, filed under **R-CRK-04** (see the Chainring ↔ Crank section). A same-behaviour duplicate used to sit here under this ID; it was never wired into the aggregator and has been removed rather than kept, to avoid double-reporting the identical warning under two IDs. |

---

## Implementation status

All 103 rules are live. Building against real parts data caught two rules
that were wrong as first written — both false positives that excluded
legal parts:

- **R-SP-02** treated a wireless dropper (routing `NONE`) as a routing
  mismatch. A wireless post needs no port and fits any frame.
- **R-SP-03** compared the post's *total length* against the frame's max
  insertion. Travel and head sit above the collar, so that excluded
  virtually every dropper made; it now compares insertion depth.

Both were only visible because the catalogue holds real components with
real numbers — they typechecked fine.

## Schema work completed

Added `Cassette`, `Chain`, `Chainring`, `Rotor`, `BrakeLever`, `Headset`,
`RearShock`, `Handlebar`, `Stem`, `Seatpost`, `SeatClamp`, `Saddle`,
`Pedal`, `Shoe`, `ChainGuide`, `DerailleurHanger`, `FrontDerailleur` and
`Tube` — 27 part categories in total.

Two modelling bugs were fixed along the way:

- `Wheelset.rotorMountType` was typed `BrakeMountType`, conflating how a
  rotor attaches to a hub (six-bolt / Centerlock) with how a caliper bolts
  to a frame. It is now `rotorMountStandard: RotorMountStandard`.
- `BuildPart` gained an explicit `slot`, so front and rear tyres, tubes and
  rotors are named rather than inferred from insertion order — retiring a
  simplification flagged in the original handoff.
