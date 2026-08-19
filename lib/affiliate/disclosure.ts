// lib/affiliate/disclosure.ts
//
// Affiliate disclosure is a legal requirement, not a courtesy. UK
// advertising rules (CAP Code / ASA) treat an unlabelled affiliate link as
// undisclosed advertising, and the US FTC's endorsement guides say the same
// for any visitor arriving from there. Every link that can earn commission
// has to be labelled where the visitor sees the link -- not buried on a
// terms page.
//
// It is also the thing that makes this tool worth trusting. A compatibility
// engine that quietly favours the parts it earns most from is worthless, so
// the neutrality statement below is a promise the code keeps: no query in
// lib/affiliate/ ranks, filters or sorts by commission, and the
// compatibility engine never reads the affiliate tables at all.
//
// These are strings and constants only -- no React, no markup. The UI layer
// owns presentation; this module owns the wording, so the wording can't
// drift between the part row, the detail page and the checkout list.

/**
 * The label that sits on or beside an individual affiliate link.
 * Short enough for a badge next to a price.
 */
export const AFFILIATE_LINK_LABEL = "Affiliate link";

/**
 * One-line disclosure for a single link or price. Use where a badge alone
 * would be too terse to be clear -- e.g. a part detail page's buy panel.
 */
export const AFFILIATE_DISCLOSURE_INLINE =
  "Affiliate link — we may earn a commission if you buy through it, at no extra cost to you.";

/**
 * Section-level disclosure, for the whole-build checkout list where several
 * links appear together and labelling each one individually would be noise.
 * The per-link label is still required alongside this, not replaced by it.
 */
export const AFFILIATE_DISCLOSURE_SECTION =
  "Some links on this page are affiliate links. If you buy through one, we may earn a commission from the retailer. It costs you nothing extra, and it never changes what we tell you fits.";

/**
 * The standing promise. Show this anywhere prices or buy links appear
 * beside compatibility results, and on the site's disclosure page.
 *
 * This is a factual claim about the code, so keep it true: nothing in
 * lib/affiliate/ may ever be wired into lib/compatibility/.
 */
export const COMMISSION_NEUTRALITY_STATEMENT =
  "Commission never influences compatibility results. Which parts fit is decided by published specifications alone — we do not rank, hide or favour a part because it earns us money, and the compatibility engine has no access to pricing or affiliate data.";

/**
 * Longer form for a dedicated disclosure / "how we make money" page.
 * Split into paragraphs so the UI can lay them out without parsing.
 */
export const AFFILIATE_DISCLOSURE_PAGE: readonly string[] = [
  "This site is free to use and is funded by affiliate commission. When you click a buy link and complete a purchase, the retailer pays us a small percentage of the sale. You pay the same price either way.",
  COMMISSION_NEUTRALITY_STATEMENT,
  "Prices and stock come from retailer product feeds and can change between our last update and your visit. The retailer's own page is always the authority — check it before you buy.",
  "We only show a price against a part when we can match the retailer's product to that exact part by a manufacturer identifier. Where we cannot, we show no price rather than a guess.",
];

/**
 * `rel` value for every outbound affiliate link.
 *
 * `sponsored` is what Google asks for on paid/affiliate links, `nofollow`
 * is the older equivalent kept for crawlers that don't understand it, and
 * `noopener` closes the reverse-tabnabbing hole that `target="_blank"`
 * otherwise opens.
 */
export const AFFILIATE_LINK_REL = "sponsored nofollow noopener";

/**
 * Per-link disclosure naming the retailer, e.g.
 * "Affiliate link — we may earn a commission from Ribble Cycles."
 *
 * Naming the shop is clearer than a generic label when several retailers
 * appear in one list, which is exactly the whole-build checkout case.
 */
export function disclosureForRetailer(retailerDisplayName: string): string {
  return `Affiliate link — we may earn a commission from ${retailerDisplayName} if you buy through it, at no extra cost to you.`;
}

/**
 * Everything the UI needs to render one compliant outbound link.
 *
 * Deliberately bundled: the offer helpers return this shape rather than a
 * bare URL, so it is not possible to get a tracked link out of this module
 * without also getting the disclosure text that legally has to accompany
 * it. Dropping the disclosure then becomes a visible act in the UI code,
 * not an omission.
 */
export interface DisclosedLink {
  /** The tracked URL. */
  readonly url: string;
  /** Short badge text. */
  readonly label: string;
  /** Full sentence, naming the retailer. */
  readonly disclosure: string;
  /** Value for the anchor's `rel` attribute. */
  readonly rel: string;
}

export function toDisclosedLink(url: string, retailerDisplayName: string): DisclosedLink {
  return {
    url,
    label: AFFILIATE_LINK_LABEL,
    disclosure: disclosureForRetailer(retailerDisplayName),
    rel: AFFILIATE_LINK_REL,
  };
}
