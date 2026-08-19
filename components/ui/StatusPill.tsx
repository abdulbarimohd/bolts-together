import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/design/cx";

/**
 * The four things the compatibility engine can say about a part.
 *
 * These map onto the engine's severities (`lib/compatibility/engine.ts`):
 *
 * | status    | engine severity | behaviour                                  |
 * |-----------|-----------------|--------------------------------------------|
 * | `fits`    | no warning      | the part genuinely fits                    |
 * | `adapter` | `warning`       | selectable; the copy must name the remedy  |
 * | `blocked` | `critical`      | the part is removed from the list          |
 * | `info`    | `info`          | never blocks; never colour-coded           |
 *
 * `info` is intentionally uncoloured. The three state colours are the site's
 * only semantic colour, and spending one on a note that changes nothing would
 * dilute the other two.
 */
export type Status = "fits" | "adapter" | "blocked" | "info";

/** The engine's severity union, restated locally so the design system does
 *  not import from the compatibility engine. */
export type EngineSeverity = "critical" | "warning" | "info";

/**
 * Engine severity to pill status. Pass `null` for "no warning was returned",
 * which is the engine's way of saying the part fits.
 *
 * Note it does NOT map "the engine abstained" to `fits` — abstention comes
 * back as an explicit `info` warning, never as `null`, precisely so missing
 * data can never be rendered as a green tick.
 */
export function severityToStatus(severity: EngineSeverity | null): Status {
  switch (severity) {
    case "critical":
      return "blocked";
    case "warning":
      return "adapter";
    case "info":
      return "info";
    default:
      return "fits";
  }
}

const tones: Record<Status, string> = {
  fits: "text-state-fits bg-state-fits/10 border-state-fits/35",
  adapter: "text-state-adapter bg-state-adapter/10 border-state-adapter/35",
  blocked: "text-state-blocked bg-state-blocked/10 border-state-blocked/35",
  info: "text-text-muted bg-panel-raised border-grid",
};

const defaultLabels: Record<Status, string> = {
  fits: "Fits",
  adapter: "Needs an adapter",
  blocked: "Blocked",
  info: "Note",
};

function StatusIcon({ status }: { status: Status }) {
  // Inline SVG, currentColor, no icon dependency and no emoji.
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-3.5 shrink-0",
    "aria-hidden": true,
  };

  switch (status) {
    case "fits":
      return (
        <svg {...common}>
          <path d="M3 8.5 6.4 12 13 4.5" />
        </svg>
      );
    case "adapter":
      // A spanner: the remedy, not just an alarm.
      return (
        <svg {...common}>
          <path d="M10.6 2.2a3.6 3.6 0 0 0-4.4 4.6L2.4 10.6a1.4 1.4 0 0 0 2 2l3.8-3.8a3.6 3.6 0 0 0 4.6-4.4l-2 2-1.8-.4-.4-1.8Z" />
        </svg>
      );
    case "blocked":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M4.4 4.4 11.6 11.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M8 7.4v3.4M8 5.2h.01" />
        </svg>
      );
  }
}

export interface StatusPillProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  status: Status;
  /** Overrides the default label. Keep it short — the colour carries most of it. */
  children?: ReactNode;
  size?: "sm" | "md";
  /** Hides the label and shows only the icon. Still labelled for screen readers. */
  iconOnly?: boolean;
  /** Slowly pulses the icon. Only for a live, changing verdict. */
  live?: boolean;
}

/**
 * The compatibility verdict.
 *
 * Colour is never the only signal: every status also carries a distinct glyph
 * and a text label, so the pill still reads for anyone who cannot separate the
 * green from the red.
 */
export function StatusPill({
  status,
  children,
  size = "md",
  iconOnly = false,
  live = false,
  className,
  ...rest
}: StatusPillProps) {
  const label = children ?? defaultLabels[status];

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "gap-1 px-2 py-0.5 text-micro" : "gap-1.5 px-2.5 py-1 text-xs",
        iconOnly && "px-1.5",
        tones[status],
        className,
      )}
      {...rest}
    >
      {/* inline-flex, not a bare span: `transform` and sizing do not apply to
          inline boxes, so an inline wrapper would silently drop the pulse. */}
      <span className={cx("inline-flex", live && "animate-breathe")}>
        <StatusIcon status={status} />
      </span>
      {iconOnly ? (
        <span className="sr-only">
          {typeof label === "string" ? label : defaultLabels[status]}
        </span>
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
