/**
 * Motion primitives.
 *
 * Four things move on this site, and these are them. New motion is added by
 * extending a primitive, never by writing a one-off effect in a page — that
 * is the rule that keeps "rich and continuous" from becoming "inconsistent".
 *
 * Every primitive honours `prefers-reduced-motion`, and every one degrades to
 * "visible, static" rather than "hidden".
 *
 * Note: this barrel pulls in client modules. Server components that only want
 * `hoverClasses` should import it from `./hoverClasses` directly.
 */
export { Reveal } from "./Reveal";
export type { RevealProps } from "./Reveal";

export { Stagger } from "./Stagger";
export type { StaggerProps } from "./Stagger";

export { Hover } from "./Hover";
export type { HoverProps } from "./Hover";

export { hoverClasses } from "./hoverClasses";
export type { HoverOptions } from "./hoverClasses";

export { RouteTransition } from "./RouteTransition";
export type { RouteTransitionProps } from "./RouteTransition";

export { useInView } from "./useInView";
export type { UseInViewOptions } from "./useInView";

export { usePrefersReducedMotion } from "./usePrefersReducedMotion";
