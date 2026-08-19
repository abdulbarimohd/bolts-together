---
name: build-my-bike-project
description: "Build My Bike — the user's PCPartPicker-style UK bike build/compatibility tool; stack, hosting and where the context lives"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1bc9ea93-bb77-42b6-8d56-e57c3c5c943a
  modified: 2026-08-18T21:28:34.553Z
---

**Build My Bike** (renamed from "Bike PartPicker" on 2026-08-16) is the user's
main side project: a self-hosted, UK-market, PCPartPicker-style build tool for
bikes, intended to be affiliate-monetised.

- **On disk:** `C:\Users\abdul\Documents\bike-partpicker\` — the folder kept the
  old name; only the product branding changed. Repo:
  `github.com/abdulbarimohd/bike-part-picker`, branch `main`.
- **Stack:** Next.js App Router + Tailwind (`web/`), Express + TypeScript API
  (`src/`), Prisma + PostgreSQL, Docker Compose for local.
- **Production:** web on Vercel (`build-my-bike.vercel.app`), API + Postgres on
  Railway project `bike-partpicker-api`
  (`api-production-9a87.up.railway.app`). Both verified live and serving real
  data on 2026-08-18.
- **Core idea:** true *lockout*, not flagging — parts that physically cannot fit
  never appear in the list. 103 rules across 16 subsystems, one named function
  per rule ID in `src/compatibility/engine.ts`, catalogued in
  `COMPATIBILITY_RULES.md`. Severity decides behaviour: `critical` hides a part,
  `warning` keeps it selectable and names the exact remedy/adapter, `info` never
  blocks.
- **Read these first when resuming:** `RESUME_PROMPT.md` and `SESSION_LOG.md`
  (the log is the real history and is far more current than
  `PROJECT_CONTEXT.md`, which lags behind the git log).

Governed by [[bike-data-accuracy-rule]]; visual decisions in
[[build-my-bike-branding]].
