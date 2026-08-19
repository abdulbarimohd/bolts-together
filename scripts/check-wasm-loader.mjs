#!/usr/bin/env node
//
// Build-time guard: does the bundled Worker load WebAssembly the way workerd
// can actually execute it?
//
// WHY THIS EXISTS
//
// Prisma 7's query compiler is a 3.6 MB WebAssembly module. Cloudflare blocks
// *dynamic* WASM compilation, so the module has to be imported statically and
// compiled by wrangler at deploy time. Next.js/Turbopack does not emit that
// shape on its own — it emits a Node-only loader that reads the .wasm off disk
// with `fs.createReadStream` and hands it to `WebAssembly.compileStreaming`.
// Neither exists in workerd.
//
// `@opennextjs/cloudflare` fixes this at build time by rewriting Turbopack's
// loader to a generated `loadWasmChunk` switch of static `import()` calls,
// which the bundler can see and wrangler can precompile.
//
// The rewrite is an ast-grep rule keyed on the loader's *function name*, and
// that name is not stable across Next releases:
//
//   next 16.2.x  ->  function loadWebAssemblyModule(...)   <- the rule matches
//   next 16.3.x  ->  an exported `compileModule` helper    <- the rule misses
//
// When the rule misses it does not error. It rewrites nothing, the unused
// `loadWasmChunk` helper is tree-shaken away, and the Node-only loader ships.
// `next build`, `opennextjs-cloudflare build`, `wrangler deploy --dry-run`,
// `tsc --noEmit` and the unit suite all pass — the tests run the generated
// client under Node, where compiling WASM from a buffer is perfectly legal.
// The first sign of trouble is a 500 from the deployed Worker:
//
//   TypeError: WebAssembly.compileStreaming is not a function
//
// That silent failure is the real hazard, so this script turns it into a build
// failure. Upstream: opennextjs/opennextjs-cloudflare#1335 and #1342.
//
// Run between `opennextjs-cloudflare build` and `opennextjs-cloudflare deploy`.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BUNDLE = resolve("./.open-next/server-functions/default/handler.mjs");

if (!existsSync(BUNDLE)) {
  console.error(
    `[wasm-check] No bundle at ${BUNDLE}.\n` +
      `            Run \`opennextjs-cloudflare build\` first.`,
  );
  process.exit(1);
}

const bundle = readFileSync(BUNDLE, "utf8");

const count = (needle) => bundle.split(needle).length - 1;

// The two Node/browser streaming APIs workerd does not implement. Either one
// surviving into the bundle means a WASM load will throw at runtime.
const streaming =
  count("WebAssembly.compileStreaming") + count("WebAssembly.instantiateStreaming");

// The workerd-safe replacement OpenNext generates. Present *and referenced*
// means the rewrite landed; tree-shaking removes it when it did not.
const staticLoader = count("loadWasmChunk");

// Only meaningful if this build actually carries a WASM module. A build with
// no WASM at all is trivially fine and must not fail the guard.
const usesWasm = /\.wasm\b/.test(bundle);

console.log(
  `[wasm-check] ${BUNDLE.replace(process.cwd(), ".")}\n` +
    `             streaming compile calls : ${streaming} (must be 0)\n` +
    `             loadWasmChunk references: ${staticLoader} (must be > 0 when WASM is present)\n` +
    `             bundle references .wasm : ${usesWasm}`,
);

const problems = [];

if (streaming > 0) {
  problems.push(
    "The bundle still calls WebAssembly.compileStreaming/instantiateStreaming.\n" +
      "  workerd does not implement either, so every query through Prisma's WASM\n" +
      "  query compiler will throw at runtime while every build check stays green.",
  );
}

if (usesWasm && staticLoader === 0) {
  problems.push(
    "The bundle carries a .wasm module but has no `loadWasmChunk` static-import\n" +
      "  switch, which means OpenNext's Turbopack wasm-loader rewrite did not apply.",
  );
}

if (problems.length > 0) {
  console.error(
    `\n[wasm-check] FAILED — this build would deploy and then 500 on every database route.\n\n` +
      problems.map((p) => `  - ${p}`).join("\n\n") +
      `\n\n  Almost certainly a \`next\` upgrade. @opennextjs/cloudflare rewrites the\n` +
      `  Turbopack wasm loader by function name, and Next renames it between minors:\n` +
      `  16.2.x exposes \`loadWebAssemblyModule\` (rewritten correctly), 16.3.x exposes\n` +
      `  \`compileModule\` (missed entirely). \`next\` and \`@opennextjs/cloudflare\` are a\n` +
      `  coupled pair and are pinned exactly in package.json for this reason.\n\n` +
      `  Fix: pin \`next\` back to the last version this adapter patches, or upgrade\n` +
      `  \`@opennextjs/cloudflare\` to a release that handles the newer loader shape.\n` +
      `  Tracking: https://github.com/opennextjs/opennextjs-cloudflare/issues/1335\n`,
  );
  process.exit(1);
}

console.log("[wasm-check] OK — WASM is statically imported and workerd-compatible.");
