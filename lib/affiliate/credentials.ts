// lib/affiliate/credentials.ts
//
// Credentials come from the environment and only from the environment.
// Nothing in this repo may contain a real key, and nothing may contain a
// fake one shaped like a real one either -- a plausible-looking placeholder
// is worse than an obvious gap, because it turns "not configured yet" into
// "configured wrongly, failing in a way nobody can explain".
//
// Two more rules this module exists to enforce:
//
//   * A missing credential is a *clear message*, never a crash. The ingest
//     script has to be safe to run before Awin has issued anything.
//   * A secret never appears in a log line, an error message or a stored
//     `sourceDescription`. Some networks (Awin among them) put the API key
//     in the feed URL's path, so any URL that gets printed goes through
//     `redactSecrets` first.

import { AffiliateConfigError, type CredentialStatus, type NetworkCredentials } from "./types";

export type EnvLike = Readonly<Record<string, string | undefined>>;

function present(env: EnvLike, name: string): boolean {
  const value = env[name];
  return typeof value === "string" && value.trim() !== "";
}

/** Which of `required` are absent. Names only; values are never read out. */
export function checkEnvVars(required: readonly string[], env: EnvLike): CredentialStatus {
  const missing = required.filter((name) => !present(env, name));
  return { ready: missing.length === 0, missing };
}

/**
 * Read a network's credentials.
 *
 * Throws `AffiliateConfigError` naming every missing variable at once --
 * one round trip for whoever is setting them up, rather than discovering
 * them one failed run at a time.
 */
export function readEnvVars(
  networkKey: string,
  required: readonly string[],
  optional: readonly string[],
  env: EnvLike,
): NetworkCredentials {
  const { missing } = checkEnvVars(required, env);
  if (missing.length > 0) {
    throw new AffiliateConfigError(
      `Affiliate network "${networkKey}" is not configured. Missing environment ` +
        `variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
      missing,
    );
  }

  const values: Record<string, string> = {};
  for (const name of [...required, ...optional]) {
    if (present(env, name)) values[name] = env[name]!.trim();
  }
  return { networkKey, values };
}

/**
 * Replace every credential value in a string with "***".
 *
 * Used on any URL or message about to be logged or persisted. Sorted
 * longest-first so a short secret that happens to be a substring of a
 * longer one can't leave the longer one partly visible.
 */
export function redactSecrets(text: string, credentials: NetworkCredentials): string {
  const secrets = Object.values(credentials.values)
    .filter((value) => value.length >= 4)
    .sort((a, b) => b.length - a.length);

  let out = text;
  for (const secret of secrets) out = out.split(secret).join("***");
  return out;
}

/**
 * A human-readable, copy-pasteable explanation of what to set.
 *
 * Printed by the ingest script when credentials are absent. It says what
 * is missing and where to put it, and deliberately shows no example
 * values: an example key in the docs is the thing people paste by mistake.
 */
export function describeMissingCredentials(
  networkKey: string,
  missing: readonly string[],
): string {
  return [
    `Affiliate network "${networkKey}" has no credentials, so there is nothing to ingest yet.`,
    "",
    `Missing: ${missing.join(", ")}`,
    "",
    "Set these in .env (local scripts) and with `wrangler secret put NAME` (deployed).",
    "The values come from the network's publisher dashboard — they are not in this repo",
    "and must not be committed to it.",
  ].join("\n");
}
