/**
 * Bolts Together — design tokens, typed.
 *
 * This is the JS-side mirror of the `@theme` block in `app/globals.css`. It
 * exists for contexts that cannot read CSS custom properties cheaply or at
 * all: the React Three Fiber hero (Phase 5), canvas work, and any chart or
 * animation library that wants a raw colour string.
 *
 * These two files are the ONLY places a hex value should appear in this
 * codebase. They must be changed together — there is a lint-free but very
 * real risk of drift here, and the mitigation is that both files say so.
 *
 * For anything rendered as DOM, prefer the Tailwind utility (`bg-panel`,
 * `text-state-fits`) or `var(--color-panel)` over importing from here. The
 * cascade should stay the source of truth for the page.
 */

/* ---------------------------------------------------------------------------
 * Colour
 * ------------------------------------------------------------------------- */

/** Surfaces, from the page ground upward. */
export const surface = {
  /** Page ground. */
  ink: "#0A0C10",
  /** Insets, wells, code blocks — recedes below the ground. */
  well: "#06080B",
  /** A raised card. */
  panel: "#141821",
  /** A panel sitting on top of a panel. */
  panelRaised: "#1B2130",
} as const;

/** Hairlines: borders, dividers, the blueprint grid itself. */
export const line = {
  grid: "#1E2634",
  gridStrong: "#2C3648",
} as const;

/** Text, in descending prominence. */
export const text = {
  default: "#E6EAF2",
  muted: "#97A1B5",
  faint: "#5D6879",
  /** For text sitting on an accent-filled surface. */
  onAccent: "#0A0C10",
} as const;

/** Safety orange. Primary actions, focus, emphasis. */
export const accent = {
  default: "#FF5D2E",
  hover: "#FF7346",
} as const;

/**
 * Semantic state colour. NEVER decoration.
 *
 * Each of these carries exactly one meaning and maps onto the compatibility
 * engine's severities:
 *
 * | token     | engine severity | meaning                                  |
 * |-----------|-----------------|------------------------------------------|
 * | `fits`    | (no warning)    | the part genuinely fits                  |
 * | `adapter` | `warning`       | fixable; the UI must name the remedy     |
 * | `blocked` | `critical`      | the part is removed from the list        |
 *
 * Engine severity `info` deliberately has no colour — info never blocks and
 * never needs to shout, so it renders in `text.muted`.
 *
 * `adapter` currently shares its value with `accent.default`. The two are
 * kept as separate tokens so they can diverge later without a find/replace.
 */
export const state = {
  fits: "#3DDC97",
  adapter: "#FF5D2E",
  blocked: "#FF4D4D",
} as const;

/** Focus ring. Deliberately the accent, so focus is unmistakable. */
export const focus = accent.default;

/* ---------------------------------------------------------------------------
 * Typography
 * ------------------------------------------------------------------------- */

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * The type scale. `size` is in rem to match the CSS; `px` is the computed
 * value at a 16px root, provided because 3D and canvas contexts think in
 * pixels.
 */
export const type = {
  micro: { size: "0.6875rem", px: 11, lineHeight: 1.18, tracking: "0.09em" },
  xs: { size: "0.75rem", px: 12, lineHeight: 1.45, tracking: "0.01em" },
  sm: { size: "0.8125rem", px: 13, lineHeight: 1.5, tracking: "0.005em" },
  base: { size: "0.9375rem", px: 15, lineHeight: 1.6, tracking: "0em" },
  lg: { size: "1.0625rem", px: 17, lineHeight: 1.65, tracking: "-0.005em" },
  xl: { size: "1.25rem", px: 20, lineHeight: 1.4, tracking: "-0.01em" },
  "2xl": { size: "1.5rem", px: 24, lineHeight: 1.3, tracking: "-0.015em" },
  "3xl": { size: "1.875rem", px: 30, lineHeight: 1.22, tracking: "-0.02em" },
  "4xl": { size: "2.5rem", px: 40, lineHeight: 1.12, tracking: "-0.025em" },
  "5xl": { size: "3.25rem", px: 52, lineHeight: 1.06, tracking: "-0.03em" },
  "6xl": { size: "4.25rem", px: 68, lineHeight: 1, tracking: "-0.035em" },
} as const;

/**
 * Font stacks. The `--font-geist-*` variables are set by `next/font/local` in
 * `app/layout.tsx` from the self-hosted files in `app/fonts/`. Nothing here
 * reaches a CDN.
 */
export const fontFamily = {
  sans: 'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  /** Reserved for part numbers, measurements and standards. Not for prose. */
  mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

/* ---------------------------------------------------------------------------
 * Space and shape
 * ------------------------------------------------------------------------- */

/** 4px base. Tailwind derives its whole numeric scale from this. */
export const spacingBase = 4;

/** `space(6)` === 24px === Tailwind's `p-6`. */
export function space(steps: number): number {
  return steps * spacingBase;
}

export const radius = {
  xs: "2px",
  sm: "3px",
  md: "5px",
  lg: "8px",
  xl: "12px",
  "2xl": "18px",
  full: "9999px",
} as const;

export const shadow = {
  panel: "0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px -12px rgb(0 0 0 / 0.6)",
  lift: "0 2px 4px rgb(0 0 0 / 0.35), 0 18px 40px -18px rgb(0 0 0 / 0.8)",
  glowAccent:
    "0 0 0 1px rgb(255 93 46 / 0.35), 0 12px 32px -14px rgb(255 93 46 / 0.55)",
  insetLine: "inset 0 1px 0 0 rgb(255 255 255 / 0.04)",
} as const;

/* ---------------------------------------------------------------------------
 * Motion
 * ------------------------------------------------------------------------- */

/**
 * Four curves, and only four. Anything that moves picks one of these.
 * Keeping the set this small is what stops "rich motion" turning into
 * "inconsistent motion".
 */
export const ease = {
  /** Reveals, enters, anything arriving. */
  entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Leaves, collapses, anything departing. */
  exit: "cubic-bezier(0.7, 0, 0.84, 0)",
  /** Hovers and small state changes. */
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Lift and pop-in. The only curve permitted to overshoot. */
  overshoot: "cubic-bezier(0.34, 1.4, 0.64, 1)",
} as const;

/** Durations in milliseconds. */
export const duration = {
  instant: 90,
  fast: 160,
  base: 280,
  slow: 520,
  slower: 820,
  /** The continuous ambient layer. */
  ambient: 14000,
} as const;

/** Shared motion constants used by the primitives in `components/motion/`. */
export const motion = {
  /** Delay between staggered siblings, in ms. */
  staggerStep: 70,
  /** How far a `<Reveal>` travels, in px. */
  revealDistance: 18,
  /** Fraction of an element that must be visible before it reveals. */
  revealThreshold: 0.15,
  /** Bottom margin on the reveal observer — starts the animation early. */
  revealRootMargin: "0px 0px -10% 0px",
} as const;

/* ---------------------------------------------------------------------------
 * Convenience
 * ------------------------------------------------------------------------- */

/** Everything, in one object, for anywhere that wants to iterate. */
export const tokens = {
  surface,
  line,
  text,
  accent,
  state,
  focus,
  fontWeight,
  fontFamily,
  type,
  radius,
  shadow,
  ease,
  duration,
  motion,
  spacingBase,
} as const;

export type Tokens = typeof tokens;
export type StateColour = keyof typeof state;
export type TypeStep = keyof typeof type;
export type EaseName = keyof typeof ease;
export type DurationName = keyof typeof duration;
