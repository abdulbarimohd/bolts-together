#!/usr/bin/env node
// scripts/agents-status.mjs
//
// Terminal dashboard for background agents and workflows.
//
//   node scripts/agents-status.mjs            one snapshot
//   node scripts/agents-status.mjs --watch    refresh every 3s
//   node scripts/agents-status.mjs --all      include finished and stopped
//
// Claude Code has its own task panel; this is for when you want the same view in
// a terminal, on a second monitor, or after the panel has scrolled away.
//
// It reads agent transcripts but never prints their CONTENT — only derived
// counts — so output stays a fixed size however much the agents write.

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const WATCH = process.argv.includes('--watch')
const ALL = process.argv.includes('--all')
const IDLE_AFTER_MS = 120_000

const PROJECTS = join(homedir(), '.claude', 'projects')

/** Newest session directory that actually holds subagent transcripts. */
function findSession() {
  if (!existsSync(PROJECTS)) return null
  const found = []
  for (const project of readdirSync(PROJECTS)) {
    const projectPath = join(PROJECTS, project)
    let sessions
    try {
      sessions = readdirSync(projectPath)
    } catch {
      continue
    }
    for (const session of sessions) {
      const subagents = join(projectPath, session, 'subagents')
      if (!existsSync(subagents)) continue
      found.push({ subagents, mtime: statSync(subagents).mtimeMs })
    }
  }
  if (!found.length) return null
  found.sort((a, b) => b.mtime - a.mtime)
  return found[0].subagents
}

/**
 * Count tool calls and find the last one, without retaining the transcript.
 * Parsed line-by-line so a 3 MB JSONL doesn't become 3 MB of objects.
 */
function readTranscript(file) {
  let tools = 0
  let lastTool = null
  let done = false

  let raw
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return { tools, lastTool, done, bytes: 0 }
  }

  for (const line of raw.split('\n')) {
    if (!line.startsWith('{')) continue
    let ev
    try {
      ev = JSON.parse(line)
    } catch {
      continue
    }
    const content = ev.message?.content
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'tool_use') {
          tools++
          lastTool = block.name
        }
      }
    }
    if (ev.type === 'result') done = true
  }

  return { tools, lastTool, done, bytes: raw.length }
}

const C = {
  dim: (t) => `\x1b[90m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  amber: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
}

function render() {
  const dir = findSession()
  if (!dir) {
    console.log('No subagent directory found — nothing has run yet.')
    return
  }

  const now = Date.now()
  const rows = []

  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.meta.json')) continue

    const id = name.replace('agent-', '').replace('.meta.json', '')
    const metaPath = join(dir, name)
    const jsonlPath = join(dir, `agent-${id}.jsonl`)

    let meta
    try {
      meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    } catch {
      continue
    }

    const t = existsSync(jsonlPath)
      ? readTranscript(jsonlPath)
      : { tools: 0, lastTool: null, done: false, bytes: 0 }

    const idleMs = existsSync(jsonlPath) ? now - statSync(jsonlPath).mtimeMs : Infinity

    const state = meta.stoppedByUser
      ? 'stopped'
      : t.done
        ? 'done'
        : idleMs > IDLE_AFTER_MS
          ? 'idle'
          : 'live'

    if (!ALL && (state === 'done' || state === 'stopped')) continue

    rows.push({
      id: id.slice(0, 9),
      state,
      task: (meta.description ?? '?').slice(0, 40),
      tools: t.tools,
      lastTool: (t.lastTool ?? '-').slice(0, 13),
      idleMs,
      mb: (t.bytes / 1048576).toFixed(1),
    })
  }

  rows.sort((a, b) => a.idleMs - b.idleMs)

  const dot = {
    live: C.green('●'),
    idle: C.amber('●'),
    done: C.dim('●'),
    stopped: C.red('✕'),
  }

  console.clear()
  console.log(`${C.bold('Background agents')}  ${C.dim(new Date().toLocaleTimeString())}`)
  console.log('')

  if (!rows.length) {
    console.log(C.dim('  nothing running — use --all to include finished and stopped'))
  } else {
    console.log(C.dim('    ID         TASK                                     TOOLS   IDLE  LAST CALL      SIZE'))
    for (const r of rows) {
      const idle =
        r.idleMs === Infinity
          ? '  -'
          : r.idleMs < 60_000
            ? `${Math.round(r.idleMs / 1000)}s`
            : `${Math.round(r.idleMs / 60_000)}m`
      console.log(
        `  ${dot[r.state]} ${r.id.padEnd(10)} ${r.task.padEnd(40)} ` +
          `${String(r.tools).padStart(5)} ${idle.padStart(6)}  ${C.dim(r.lastTool.padEnd(13))} ${(r.mb + 'M').padStart(6)}`,
      )
    }
    const live = rows.filter((r) => r.state === 'live').length
    console.log('')
    console.log(C.dim(`  ${live} live · ${rows.length - live} idle`))
  }

  if (WATCH) console.log(C.dim('\n  watching — ctrl-c to stop'))
}

render()
if (WATCH) setInterval(render, 3000)
