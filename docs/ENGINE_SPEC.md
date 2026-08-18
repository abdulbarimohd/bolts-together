# Compatibility Engine — Consolidated Spec

**Purpose:** the single portable reference for the Build My Bike compatibility
engine, distilled from ~20 Claude sessions, `SESSION_LOG.md` (59 KB),
`COMPATIBILITY_RULES.md` (19 KB) and the live code. Written so a rebuild can
reimplement the engine from this file alone, without re-reading the chat history.

**Status of the current implementation:** 103 rules, all implemented in
`src/compatibility/engine.ts`, 132 tests in `engine.test.ts`, running live at
`api-production-9a87.up.railway.app`.

---

## 1. The three ideas that make this work

Everything else is detail. These three are the product.

### 1.1 True lockout, not flagging
A part that physically cannot fit is **removed from the list entirely** — it
never appears as an option. This is the core differentiator from a spec sheet or
a forum. Flagging after selection is what everyone else does.

### 1.2 Three severities, not a boolean
| Severity | Behaviour | Meaning |
|---|---|---|
| `critical` | **Hidden** from the list | Physically won't assemble, or unsafe |
| `warning` | **Stays selectable**, names the exact fix | Works, but needs a part or is degraded |
| `info` | Never blocks | Worth knowing |

**The load-bearing invariant:** anything a cheap adapter or spacer resolves is a
`warning` carrying a `remedy` field that names the exact part — *never* a
`critical`. Collapsing this to a boolean silently deletes thousands of legal
builds. "Needs a £12 spacer" and "cannot work" are different problems.

### 1.3 Abstain on missing data
Every rule returns `null` (no opinion) when an input field is unset, rather than
guessing a default. Nullable schema fields are deliberate. A tool that
confidently says an incompatible part fits is worse than no tool.

The one deliberate exception: **tyre clearance**, where a missing figure is
important enough to raise a `warning` about its own absence.

---

## 2. Data provenance model

Every `Part` carries:
- `dataSource` enum, in descending trust:
  `MANUFACTURER_SPEC` > `RETAILER_LISTING` > `DATA_FEED` > `COMMUNITY` >
  `ESTIMATED` > `UNVERIFIED`
- `sourceUrl`, `dataNotes`, `verifiedAt`, `verifiedBy`

Prices are **UK RRP in pence, VAT-inclusive, nullable** — manufacturer spec
sheets carry no RRP, and inventing one is not acceptable.

This is surfaced in the UI as a provenance badge. It is not decoration: it is
what lets the engine say "I don't know" out loud.

---

## 3. Schema patterns worth keeping

- **Class-table inheritance.** One base `Part` table (brand, name, price, weight,
  `type` discriminator) with a 1:1 child table per category joined on `partId`.
- **Closed enums for every compatibility-relevant field.** Exact string matching
  only. Never fuzzy-match "close" standards — Boost 148×12 and Super Boost
  157×12 are not compatible despite both being Boost-era.
- **`Price` is an append-only log**, one row per (part, vendor, timestamp).
  Current price = most recent row. Price history is then free.
- **`BuildPart.slot`** names `front`/`rear` explicitly for tyres, tubes and
  rotors. Never infer position from insertion order — this caused real bugs
  twice (a good front masking a broken rear; left/right shifter speed
  resolution).
- **`Discipline` enum** (`ROAD` / `GRAVEL` / `MTB`) filters the catalogue.

---

## 4. The six rule forms

The form determines the function signature and the schema field shape.

| Form | Shape | Example |
|---|---|---|
| A | Enum equality (closed, no tolerance) | BB shell standard |
| B | Numeric ceiling (`value <= limit`) | Tyre width vs frame clearance |
| C | Range overlap (`min <= v <= max`) | Tyre width vs internal rim width |
| D | Lookup table → verdict, often "yes, with adapter X" | Caliper mount + rotor size |
| E | Derived / compound (3+ parts) | Drivetrain total capacity |
| F | Advisory (legal but consequential) | Crank length vs pedal strike |

**Function contract:** one pure function per rule ID, named for that ID.
`checkX(a, b) => null | { severity, title, message, components[], remedy? }`.
Aggregated by `getCompatibilityWarnings(build)`. The same functions power the
`filterCompatible*` lockout layer — one source of truth, two consumers.

---

## 5. The 27 part categories

`Frame`, `Fork`, `Headset`, `BottomBracket`, `Crankset`, `Chainring`,
`Shifter`, `RearDerailleur`, `FrontDerailleur`, `Cassette`, `Chain`,
`Wheelset`, `Tyre`, `Tube`, `BrakeCaliper`, `BrakeLever`, `Rotor`,
`RearShock`, `Seatpost`, `SeatClamp`, `Saddle`, `Handlebar`, `Stem`,
`Pedal`, `Shoe`, `ChainGuide`, `DerailleurHanger`.

The engine reads **27 fields on `Frame` alone** — it is by far the richest
entity, which is why the frame must be picked first.

---

## 6. The 103 rules

Severity in brackets. `crit` = hides the part.

### §1 Frame ↔ Fork (6)
- **R-HS-01** steerer taper vs head tube [crit]
- **R-HS-02** headset upper/lower cup standard, checked **independently** (EC34, ZS44, IS42, ZS56, EC49) [crit]
- **R-HS-03** crown race seat diameter — 30.0mm for 1⅛", 40.0mm for 1.5" tapered [crit]
- **R-FRK-01** steerer length ≥ head tube + headset stack + spacers + stem [crit]
- **R-FRK-02** fork travel ≤ frame `maxForkTravelMm` [crit]
- **R-FRK-03** axle-to-crown within ±~10mm window [warn]
- **R-FRK-04** fork wheel diameter matches frame unless `mulletApproved` [warn]
- **R-FRK-05** rigid fork on suspension-corrected frame vs sag-adjusted A-C [warn]
- **R-FRK-06** offset/rake affects trail [info]

### §2 Frame ↔ BB ↔ Crankset (9)
- **R-BB-01** `bbShellStandard` vs `frameInterface` [crit]
- **R-BB-02** spindle interface / diameter [crit]
- **R-BB-03** shell width 68/73/83/100mm [crit] — *known weakness: currently folded into the standard enum, which hides real mismatches*
- **R-BB-04** Italian vs English threading (Italian is 70mm, opposite thread direction) [crit]
- **R-BB-05** spindle length vs shell width; spacer count differs 68 vs 73 [warn]
- **R-CRK-01** chainline vs rear hub spacing — Boost 52mm, standard 49mm, Super Boost 56.5mm [warn]
- **R-CRK-02** chainring teeth ≤ frame max, chainstay clearance [crit]
- **R-CRK-03** Q-factor clears chainstays [warn]
- **R-CRK-04** crank length vs BB drop / pedal strike / leg length [info]

### §3 Chainring ↔ Crank (4)
- **R-CHR-01** BCD (104/96/94/110/76mm) **AND** bolt count (4 vs 5) [crit]
- **R-CHR-02** direct-mount interface (SRAM 3-bolt, Race Face Cinch, Shimano DM) [crit]
- **R-CHR-03** ring offset 0/3/6mm → target chainline [warn]
- **R-CHR-04** 1x requires narrow-wide profile [warn]

### §4 Drivetrain (10) — *the biggest correctness gap in v1*
`cablePullStandard` and `speeds` existed but nothing read them, so a SRAM AXS pod
plus a cable Shimano derailleur reported "fully compatible".
- **R-DRV-01** cable pull ratio (Shimano MTB, SRAM Exact Actuation, X-Actuation, Shimano Road, Campagnolo) [crit]
- **R-DRV-02** `shifter.speeds === rd.maxSpeeds` [crit]
- **R-DRV-03** electronic ecosystems can't mix — AXS ≠ Di2 ≠ mechanical [crit]
- **R-DRV-04** largest cog ≤ `maxCassetteCogTeeth` [crit]
- **R-DRV-05** total capacity ≥ (cog range) + (ring range) for 2x [warn]
- **R-DRV-06** cage length SS/GS/SGS suits range [warn]
- **R-DRV-07** chain speed = cassette speed [crit]
- **R-DRV-08** SRAM Flattop (AXS road) vs Shimano 12s MTB chains not interchangeable [crit]
- **R-DRV-09** chain length for largest ring + largest cog + rear centre [warn]
- **R-DRV-10** cassette speed = shifter speed [crit]

### §5 Cassette ↔ Freehub (4)
- **R-FH-01** body type: HG, Micro Spline, XD, XDR, N3W [crit]
- **R-FH-02** XDR is 1.85mm longer than XD — XD cassette on XDR needs a spacer [warn]
- **R-FH-03** 11-speed road cassette on older HG body needs a 1.85mm spacer [warn]
- **R-FH-04** Micro Spline is Shimano 12s only; XD/XDR is SRAM [crit]

### §6 Frame ↔ Hanger (3)
- **R-HGR-01** SRAM Transmission (T-Type) **requires a UDH frame** — a hard gate on an entire modern groupset family [crit]
- **R-HGR-02** non-UDH frames need the exact proprietary `hangerModel` [crit]
- **R-HGR-03** direct-mount vs standard hanger [crit]

### §7 Brakes (12)
- **R-BRK-01** rear caliper mount vs frame [crit]
- **R-BRK-02** front caliper mount vs fork [crit]
- **R-BRK-03** rotor size via adapter — mount + rotor size → adapter part number, as a **warning with remedy** [warn]
- **R-BRK-04** rotor ≤ frame/fork `maxRotorMm` [crit]
- **R-BRK-05** rotor mount vs hub — 6-bolt vs Centerlock [crit]
- **R-BRK-06** Centerlock external lockring vs some thru-axle hubs [warn]
- **R-BRK-07** DOT fluid vs mineral oil — mixing destroys seals [crit]
- **R-BRK-08** lever/caliper piston ratio via `brakeSystemFamily` (plain string equality) [crit]
- **R-BRK-09** mechanical lever ↔ hydraulic caliper [crit]
- **R-BRK-10** pad shape — **deliberate no-op**, advisory only (`padShape` is free text on the caliper alone, nothing to compare against)
- **R-BRK-11** rotor thickness — 1.8mm standard, 2.3mm DH [warn]
- **R-BRK-12** rim brake track present if rim brakes [crit]

### §8 Wheels ↔ Tyres (9)
- **R-TIR-01** bead diameter vs rim — ISO 622/584/559/507 [crit]
- **R-TIR-02** tyre width ≤ frame/fork clearance, **chosen per diameter** (`maxTyreWidthMm` vs `maxTyreWidthMm650b` are physically different numbers) [crit]
- **R-TIR-03** width within rim ETRTO range for internal width [warn] — *simplification: uses ~1.4×–2.4× approximation, not the full ETRTO table*
- **R-TIR-04** hookless rims require tubeless tyres and cap pressure ~72psi — getting this wrong can blow a tyre off the rim [crit]
- **R-TIR-05** tubeless tyre on non-tubeless rim [warn]
- **R-TIR-06** valve hole drilling — Presta 6.5mm vs Schrader 8mm [crit]
- **R-TIR-07** valve stem length > rim depth + ~10mm [warn]
- **R-TIR-08** tube size range covers tyre width [warn]
- **R-TIR-09** combined tyre + rim width still clears frame [warn]

### §9 Axles & Hubs (5)
- **R-AXL-01** rear hub spacing vs frame [crit]
- **R-AXL-02** front hub spacing vs fork [crit]
- **R-AXL-03** thru-axle thread pitch M12×1.0/1.5/1.75 — **info only**, because axles are bundled with the wheelset here, so there is no second value to compare [info]
- **R-AXL-04** dropout type — thru-axle vs QR vs UDH [crit]
- **R-AXL-05** hubs converting via `convertibleEndCaps` [info]

### §10 Rear Shock ↔ Frame (7)
- **R-SHK-01** eye-to-eye **AND** stroke must match exactly (230×60, 210×55) — no tolerance whatsoever [crit]
- **R-SHK-02** trunnion vs standard eyelet [crit]
- **R-SHK-03** hardware width + bushing diameter [crit]
- **R-SHK-04** metric vs imperial sizing [crit]
- **R-SHK-05** shock body/reservoir clears linkage [warn]
- **R-SHK-06** coil spring rate vs leverage ratio and rider weight [warn]
- **R-SHK-07** leverage curve suits coil vs air [info]

### §11 Seatpost & Saddle (7)
- **R-SP-01** diameter 27.2/30.9/31.6/34.9mm [crit]
- **R-SP-02** dropper routing vs frame ports [crit] — *was wrong first time: treated a wireless dropper (`routing: NONE`) as a mismatch*
- **R-SP-03** dropper length ≤ max insertion [crit] — *was wrong first time: compared total length, excluding virtually every dropper made; must compare insertion depth*
- **R-SP-04** dropper travel vs inseam [info]
- **R-SP-05** seat clamp diameter vs seat tube OD [crit]
- **R-SP-06** saddle rail type — 7mm round vs 7×9mm oval carbon [crit]
- **R-SP-07** dropper remote — cable vs electronic vs hydraulic [crit]

### §12 Cockpit (7)
- **R-CKP-01** stem clamp vs bar 31.8/35.0/25.4/26.0mm [crit]
- **R-CKP-02** stem steerer clamp — 1⅛" or proprietary integrated [crit]
- **R-CKP-03** control clamp area 22.2mm for MTB levers/shifters/grips [crit]
- **R-CKP-04** drop-bar levers can't go on flat bars and vice versa [crit]
- **R-CKP-05** integrated bar/stem removes stem compatibility entirely [info]
- **R-CKP-06** internal-routing bars need matching bore [warn]
- **R-CKP-07** stem length/rise, bar width/sweep are fit choices [info]

### §13 Pedals & Shoes (3)
- **R-PDL-01** pedal thread — 9/16" universal on modern cranks [crit]
- **R-PDL-02** cleat vs pedal system — SPD, SPD-SL, Look, Crank Brothers, Time [crit]
- **R-PDL-03** sole drilling — 2-bolt MTB vs 3-bolt road [crit]

### §14 Front Derailleur (4)
- **R-FD-01** braze-on vs clamp 28.6/31.8/34.9mm [crit]
- **R-FD-02** top-pull vs bottom-pull routing [crit]
- **R-FD-03** chainline and max chainring within FD spec [warn]
- **R-FD-04** speed count vs shifter [crit]

### §15 Frame Mounts & Routing (6)
- **R-MNT-01** chain guide needs ISCG-05 / ISCG tabs or BB-mount version [crit]
- **R-MNT-02** wireless drivetrain on externally-routed frame — **info, not critical** (routing just goes unused) [info]
- **R-MNT-03** brake needs hydraulic hose ports not shift cable stops [warn]
- **R-MNT-04** bottle cage mount count/spacing [info]
- **R-MNT-05** rack/fender eyelets present [info]
- **R-MNT-06** compressionless housing for mechanical brakes [warn]

### §16 Rider fit (4) — *advisory only, never block*
Only run when optional rider height / inseam / weight are set on the build. These
compare a part against **you**, not against another part — the only rules that
do, and the reason PCPartPicker has no equivalent.
- **R-FIT-01** frame size vs rider height [info]
- **R-FIT-02** standover vs inseam [warn]
- **R-FIT-03** reach/stack vs riding style [info]
- **R-FIT-04** **retired** — crank length vs leg length lives at R-CRK-04; the duplicate was never wired into the aggregator

---

## 7. Known defects and limitations to fix in a rebuild

**Open bugs**
- `Chain.speeds` is a single `Int`. SRAM rates one physical chain for both 12 and
  13-speed, which this cannot express → false `R-DRV-07` block on 3 E1-gen builds.
  **Fix: model as a speed range, or a set.**
- `bbShellWidthMm` is an `Int` and cannot hold 85.5.
- `CablePullStandard` has no microSHIFT value → blocks Topstone 3/4 drivetrains.

**Schema gaps that block real data**
- No honest representation for proprietary non-round cockpits and seatposts
  (Cannondale SystemBar R-One, Trek Aero RSL, D-shaped aero posts). `Handlebar`,
  `Stem` and `Seatpost` all require round diameters. Parts were deliberately not
  created rather than faked.
- `Stem` has no clamp-height field, so R-FRK-01 uses an industry-typical constant.

**Simplifications that are deliberate, not bugs**
- Chain length (R-DRV-09) and coil spring rate (R-SHK-06) use standard shop
  formulas, not manufacturer charts.
- 2x total capacity (R-DRV-05) assumes a 14t ring difference when exact ring
  sizes are unknown.
- R-TIR-03/09 use the ~1.4×–2.4× internal-width approximation, not full ETRTO.

**Bug classes that bit hard — guard against these on any rewrite**
1. **Guessing with `??`.** `isHydraulic ?? true` silently invented verdicts.
   Always `== null` → abstain.
2. **Front/rear collapse.** `frontTube ?? rearTube` let a good front mask a
   broken rear. Every paired component needs an explicit `slot` parameter and
   two calls.
3. **Insertion-order dependence.** Mechanical 2x drop-bar shifter pairs store
   `speeds: 2` on the left lever and real cassette speeds on the right. Resolving
   "the shifter" without left/right awareness fired false criticals.
4. **Convention drift in free-text keys.** `brakeSystemFamily: "Shimano GRX"` vs
   the catalogue's `"GRX"` — R-BRK-08 is plain string equality, so this blocked a
   legal pairing. Either enum it or normalise on write.
5. **Doc/code drift.** Two rules' documented severities disagreed with the code.
   Generate the public rules reference **from the engine**, not by hand — the
   current site already does this.

---

## 8. Test methodology worth reusing

Coverage was measured by `comm -23` between rule IDs in the catalogue and IDs
**explicitly asserted** via `blocks()` / `warns()` helpers in the test file. A
bare `fits()` does not count as coverage: a rule can execute during a test
without its ID ever being asserted. This raised real coverage from 39 to 132
tests and found rules that had never been checked at all.

---

## 9. Sourcing methodology (why the data is trustworthy)

- **Two-phase agents:** a research agent, then a separate adversarial verify
  agent, before any DB write. One pass produced 129 findings of which verify
  REJECTED 19 and DOWNGRADED 20 — ~30% would have been wrong.
- **Match on brand AND exact model number, never name similarity.** Real traps
  hit: Shimano 105 `R7100` (12sp) vs `R7000` (11sp); Tiagra "4700" vs `RD-R4000`;
  SRAM `XG-1391` (13sp) vs `CN-RED-E1`.
- **Read the live rendered DOM, not an AI summary** — a summarised pass once
  invented a "48/31" chainring spec that did not exist.
- **A manufacturer's current product page is not automatically right for a given
  model year.** Canyon's live page described a 2026 redesign while the data under
  verification was MY24/25.
- 99 Spokes was demoted from spec source to catalogue index after its export was
  found to be lossy and partly wrong.
