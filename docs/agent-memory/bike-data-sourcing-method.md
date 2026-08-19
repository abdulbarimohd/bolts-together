---
name: bike-data-sourcing-method
description: The two-phase research→verify agent pattern and near-miss traps used when sourcing Build My Bike part data
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1bc9ea93-bb77-42b6-8d56-e57c3c5c943a
  modified: 2026-08-18T21:29:07.616Z
---

When sourcing component data for [[build-my-bike-project]], the user's
established method is **two-phase: a research agent, then a separate adversarial
verify agent, before anything is written to the database.**

**Why:** it measurably works. One pass produced 129 findings of which the verify
phase REJECTED 19 and DOWNGRADED 20 — roughly 30% would have been wrong. The
user also explicitly instructed delegating per section ("use agents for every
section, use one delegate"), and found fanning out **one agent per component
category across all bikes** better than one agent per bike.

**How to apply:**
- Match parts by **brand AND exact model number, never name similarity.** Real
  traps already hit: Shimano 105 `R7100` (12sp) vs `R7000` (11sp); Tiagra "4700"
  vs `RD-R4000`; SRAM `XG-1391` (13sp) vs `CN-RED-E1`.
- Read the **live rendered DOM**, not an AI text summary of a page — a
  summarised pass once invented a "48/31" chainring spec that did not exist.
- A manufacturer's *current* product page is not automatically right for a
  specific model year. Canyon's live page described a 2026 redesign while the
  data under verification was MY24/25. Always confirm the page's model year.
- Check git and migration state directly before trusting any "next steps" list,
  even one written minutes earlier.
- Import scripts are idempotent (`findFirst` before `create`) — safe to re-run.
- Prefer abstaining to writing an approximation; see [[bike-data-accuracy-rule]].
