---
name: bike-data-accuracy-rule
description: "On Build My Bike, never fabricate or approximate part data — abstain instead; this is the project's load-bearing rule"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1bc9ea93-bb77-42b6-8d56-e57c3c5c943a
  modified: 2026-08-18T21:28:41.983Z
---

On [[build-my-bike-project]], **never guess, approximate or fabricate part
specs.** If a figure isn't verified, leave it null and let the engine abstain.

**Why:** it came from an explicit early instruction from the user — verify the
data is accurate rather than "making something like a calculator that says 3
plus 2 is 7." A tool that confidently says an incompatible part fits is worse
than no tool. The user has re-checked this across the whole project, and it has
already prevented at least two real near-misses (a manufacturer page silently
describing a newer model year; Cannondale Topstone/Grizl alloy hangers, which
was correctly abstained on rather than guessed).

**How to apply:**
- Every `Part` carries a `dataSource` provenance enum —
  `MANUFACTURER_SPEC` > `RETAILER_LISTING` > `DATA_FEED` > `COMMUNITY` >
  `ESTIMATED` > `UNVERIFIED` — plus a `sourceUrl`. Populate both.
- Compatibility rules return `null` (abstain) on missing data instead of
  assuming. Don't "helpfully" add a fallback default.
- When sourcing, corroborate against the manufacturer's own page **and confirm
  the page describes the same model year** as the data being verified.
- Prices are UK RRP in pence, VAT-inclusive, nullable — no invented RRPs.
- Leaving a category empty is the correct outcome when data isn't available;
  the UI already degrades gracefully ("not fitted").
