# Bolts Together

A UK bike compatibility engine and build tool. Pick a frame and every other part
list narrows to what genuinely fits it — parts that physically can't work are
removed from the list, not flagged after you've chosen them.

Successor to **Build My Bike** (previously *Bike PartPicker*), rebuilt from the
ground up. The predecessor remains at
`C:\Users\abdul\Documents\bike-partpicker\` and is the source of the
compatibility engine and the verified part data.

## Status

Pre-Phase-1. The repo currently holds planning and specification documents only —
no application code yet.

| Doc | What it is |
|---|---|
| [`PLAN.md`](PLAN.md) | The phased build plan, decisions taken, and risks |
| [`docs/ENGINE_SPEC.md`](docs/ENGINE_SPEC.md) | The compatibility engine in full — all 103 rules, portable, no chat history needed |
| [`docs/COMPATIBILITY_RULES.md`](docs/COMPATIBILITY_RULES.md) | The original rule catalogue carried over from the predecessor |

## Stack

- **Frontend** — Next.js (App Router) on Vercel
- **Database** — Neon (serverless Postgres) via Prisma
- **3D** — React Three Fiber, decorative hero only

## The three principles

These are carried over deliberately and should not be relitigated:

1. **True lockout.** A part that physically cannot fit is removed from the list
   entirely, not flagged after selection.
2. **Three severities, never a boolean.** `critical` hides a part; `warning`
   keeps it selectable and names the exact remedy; `info` never blocks. Anything
   a cheap adapter solves is a warning, never a block.
3. **Abstain on missing data.** Rules return `null` rather than guessing. Every
   part carries provenance (`dataSource`, `sourceUrl`). Nothing is ever
   fabricated to fill a gap.

See `docs/ENGINE_SPEC.md` §1 for why each of these is load-bearing.
