# Agent memory — portable copy

Claude Code's auto memory is **machine-local**. The docs are explicit that these
files "are not shared across machines or cloud environments", so moving to a new
machine loses them unless they're carried in the repo.

This directory is that carry. It's a copy of
`~/.claude/projects/C--Users-abdul--claude/memory/` as of the last commit that
touched it.

## To restore on a new machine

Copy these files into that machine's memory directory:

```bash
cp docs/agent-memory/*.md ~/.claude/projects/<encoded-project-path>/memory/
```

The encoded path is the project directory with separators replaced — Claude Code
creates it on first run, so start a session there once and the directory will exist.

Alternatively, just point a new session at [`../../RESUME.md`](../../RESUME.md),
which restates the load-bearing parts in prose. The memory files add nuance and
history; `RESUME.md` is the minimum viable handoff.

## What's here

| File | Why it matters |
|---|---|
| `bike-data-accuracy-rule.md` | The governing rule: never fabricate a spec, abstain instead. Everything else follows from this. |
| `bike-data-sourcing-method.md` | Two-phase research→verify agents, and the model-number traps that have actually caused errors. |
| `bolts-together-rebuild.md` | Every locked decision for this rebuild — stack, palette, type, motion, hosting. Don't re-ask these. |
| `bolts-together-infra.md` | Live Neon/Cloudflare IDs, the direct-vs-pooled connection split, and the environment gotchas that cost real time. |
| `awin-phase7-reminder.md` | Standing reminder to raise the Awin credentials and feed-coverage question at Phase 7. |
| `build-my-bike-*.md` | Context on the predecessor project, its abandoned work, and its retired branding. |

## Keeping it current

This is a snapshot, not a live mirror. If the memory files change materially,
re-copy them and commit. A stale copy that contradicts the live memory is worse
than none — it would hand a new machine decisions that have since been reversed.
