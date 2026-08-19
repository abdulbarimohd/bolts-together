// lib/affiliate/registry.ts
//
// The one place that knows which networks exist.
//
// A row in AffiliateNetwork names an `adapterKey`; this maps that key to an
// implementation. Adding Impact or Partnerize later means writing
// networks/impact.ts and adding one line here — everything downstream
// (ingest, offers, the UI) is written against the interface and needs no
// change at all.
//
// A retailer joining a network that already has an adapter needs no code:
// insert a Retailer row and a RetailerFeed row.

import { awinAdapter } from "./networks/awin";
import { AffiliateConfigError, type AffiliateNetworkAdapter } from "./types";

const ADAPTERS: readonly AffiliateNetworkAdapter[] = [awinAdapter];

const BY_KEY = new Map(ADAPTERS.map((adapter) => [adapter.key, adapter]));

export function listAdapters(): readonly AffiliateNetworkAdapter[] {
  return ADAPTERS;
}

export function hasAdapter(adapterKey: string): boolean {
  return BY_KEY.has(adapterKey);
}

/**
 * Look up an adapter, or fail with a message naming the ones that exist.
 *
 * Throwing rather than returning undefined: an unknown adapter key means a
 * database row refers to code that was never written, and continuing would
 * silently stop ingesting a retailer's prices — the kind of failure nobody
 * notices for a month.
 */
export function getAdapter(adapterKey: string): AffiliateNetworkAdapter {
  const adapter = BY_KEY.get(adapterKey);
  if (!adapter) {
    throw new AffiliateConfigError(
      `No affiliate adapter registered for "${adapterKey}". ` +
        `Registered adapters: ${[...BY_KEY.keys()].join(", ") || "(none)"}. ` +
        `Either fix AffiliateNetwork.adapterKey, or add an implementation in lib/affiliate/networks/ ` +
        `and register it in lib/affiliate/registry.ts.`,
    );
  }
  return adapter;
}
