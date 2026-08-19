/**
 * UI primitives.
 *
 * The whole application is built from these. Anything that looks like a
 * button, a panel, a label, a verdict or a measurement should be one of
 * these — not a fresh set of utilities on a bare `div`.
 *
 * All of them are server components. Add `"use client"` in the page or
 * feature that needs interactivity, not here.
 */
export { Button, ButtonLink } from "./Button";
export type {
  ButtonProps,
  ButtonLinkProps,
  ButtonVariant,
  ButtonSize,
} from "./Button";

export {
  Card,
  CardHeader,
  CardTitle,
  CardEyebrow,
  CardBody,
  CardFooter,
} from "./Card";
export type { CardProps } from "./Card";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";

export { StatusPill, severityToStatus } from "./StatusPill";
export type { StatusPillProps, Status, EngineSeverity } from "./StatusPill";

export { Spec, SpecGrid, SpecList } from "./Spec";
export type { SpecProps, SpecGridProps } from "./Spec";
