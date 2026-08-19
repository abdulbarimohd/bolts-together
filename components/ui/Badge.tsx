import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/design/cx";

export type BadgeTone = "neutral" | "outline" | "accent";

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
  /**
   * Sets the label in the mono face with tabular figures. Use for standards,
   * part numbers and measurements — `BB86`, `148x12 BOOST`, `M12x1.0`.
   */
  mono?: boolean;
  children?: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-panel-raised text-text-muted border-grid",
  outline: "bg-transparent text-text-muted border-grid",
  accent: "bg-accent/12 text-accent border-accent/35",
};

/**
 * A non-semantic label: category, discipline, standard, count.
 *
 * Deliberately has no fits / blocked / adapter tones. Those three colours mean
 * something specific about compatibility and are only ever rendered by
 * `StatusPill`. If a badge could be mistaken for a compatibility verdict, it
 * is the wrong component.
 */
export function Badge({
  tone = "neutral",
  mono = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5",
        "text-micro font-medium",
        mono
          ? "font-mono tabular-nums tracking-normal"
          : "tracking-caps uppercase",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
