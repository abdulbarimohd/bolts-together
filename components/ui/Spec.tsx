import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/design/cx";

export interface SpecProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** What the measurement is. Set in the sans face, small caps. */
  label: ReactNode;
  /** The measurement itself. Always mono, always tabular. */
  value: ReactNode;
  /** Unit or suffix, set quieter than the value. */
  unit?: ReactNode;
  /** A short clarification under the value. */
  hint?: ReactNode;
  /** `stack` puts the label above; `row` puts it on the same line. */
  layout?: "stack" | "row";
  /** Right-aligns the value. Use in tables of numbers. */
  align?: "left" | "right";
  /**
   * Renders in place of a value when the data is genuinely unknown.
   * Never substitute a plausible-looking number here — this project abstains
   * rather than guesses, and the UI has to be able to say so.
   */
  unknown?: boolean;
}

/**
 * A label and its measured value.
 *
 * The value is always mono with tabular figures, so a column of spindle
 * diameters or shell widths lines up digit for digit and does not jitter when
 * a value changes. This is the component that carries every part number,
 * measurement and standard in the app — `BB86`, `148x12 BOOST`, `M12x1.0`.
 */
export function Spec({
  label,
  value,
  unit,
  hint,
  layout = "stack",
  align = "left",
  unknown = false,
  className,
  ...rest
}: SpecProps) {
  const valueBlock = (
    <span
      className={cx(
        "font-mono text-sm tabular-nums lining-nums",
        unknown ? "text-text-faint italic" : "text-text",
      )}
    >
      {unknown ? "not verified" : value}
      {unit && !unknown ? (
        <span className="ml-1 text-text-muted">{unit}</span>
      ) : null}
    </span>
  );

  const labelBlock = (
    <span className="text-micro font-medium tracking-caps text-text-faint uppercase">
      {label}
    </span>
  );

  if (layout === "row") {
    return (
      <div
        className={cx(
          "flex items-baseline justify-between gap-4 border-b border-grid py-2 last:border-b-0",
          className,
        )}
        {...rest}
      >
        {labelBlock}
        <span className={cx("flex flex-col", align === "right" && "items-end")}>
          {valueBlock}
          {hint ? (
            <span className="text-xs text-text-faint">{hint}</span>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cx("flex flex-col gap-1", align === "right" && "items-end", className)}
      {...rest}
    >
      {labelBlock}
      {valueBlock}
      {hint ? <span className="text-xs text-text-faint">{hint}</span> : null}
    </div>
  );
}

export interface SpecGridProps extends ComponentPropsWithoutRef<"div"> {
  /** Columns at the widest breakpoint. Collapses to one on small screens. */
  columns?: 2 | 3 | 4;
}

const columnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/** A grid of stacked `Spec`s. Marks itself tabular so every child aligns. */
export function SpecGrid({
  columns = 3,
  className,
  children,
  ...rest
}: SpecGridProps) {
  return (
    <div
      data-tabular=""
      className={cx("grid grid-cols-1 gap-x-6 gap-y-5", columnClasses[columns], className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** A vertical list of `Spec layout="row"`. The default read-out for a part. */
export function SpecList({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div data-tabular="" className={cx("flex flex-col", className)} {...rest}>
      {children}
    </div>
  );
}
