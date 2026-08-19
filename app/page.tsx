import type { ReactNode } from "react";
import { Hover, Reveal, Stagger } from "@/components/motion";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardEyebrow,
  CardFooter,
  CardHeader,
  CardTitle,
  Spec,
  SpecGrid,
  SpecList,
  StatusPill,
} from "@/components/ui";
import { accent, line, state, surface, text, type } from "@/lib/design/tokens";

/**
 * Design system showcase — Phase 4.
 *
 * This is NOT the landing page. It is a plain, honest inventory of the
 * primitives so they can be reviewed in one place, and it is meant to be
 * deleted when the real homepage is built. Everything on it is a component
 * from `components/ui` or `components/motion`; nothing is styled ad hoc.
 */

export const metadata = {
  title: "Design system",
  description:
    "The Bolts Together design system: tokens, motion primitives and UI primitives.",
};

/* -------------------------------------------------------------------------
 * Local layout helpers. Not primitives — they exist only to structure this
 * one page, and go with it.
 * ---------------------------------------------------------------------- */

function Section({
  id,
  number,
  title,
  intro,
  children,
}: {
  id: string;
  number: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-grid py-16 sm:py-20">
      <Reveal className="mb-10 max-w-2xl">
        <p className="mb-3 font-mono text-micro tracking-caps text-accent">
          {number}
        </p>
        <h2 className="text-3xl font-semibold text-text">{title}</h2>
        <p className="mt-3 text-base text-text-muted">{intro}</p>
      </Reveal>
      {children}
    </section>
  );
}

function Swatch({
  name,
  hex,
  className,
  note,
}: {
  name: string;
  hex: string;
  className: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`size-11 shrink-0 rounded-md border border-grid ${className}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">{name}</p>
        <p className="font-mono text-xs tabular-nums text-text-faint">{hex}</p>
        {note ? <p className="mt-0.5 text-xs text-text-faint">{note}</p> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Sample data. Real standards, deliberately: the type has to be tested
 * against the strings it will actually carry.
 * ---------------------------------------------------------------------- */

const typeScale = [
  { cls: "text-micro tracking-caps uppercase", name: "micro", px: type.micro.px, use: "Column heads, unit suffixes" },
  { cls: "text-xs", name: "xs", px: type.xs.px, use: "Dense table text, captions" },
  { cls: "text-sm", name: "sm", px: type.sm.px, use: "Secondary UI text" },
  { cls: "text-base", name: "base", px: type.base.px, use: "Default UI text" },
  { cls: "text-lg", name: "lg", px: type.lg.px, use: "Lead paragraphs" },
  { cls: "text-xl font-semibold", name: "xl", px: type.xl.px, use: "Card titles" },
  { cls: "text-2xl font-semibold", name: "2xl", px: type["2xl"].px, use: "Section subheads" },
  { cls: "text-3xl font-semibold", name: "3xl", px: type["3xl"].px, use: "Section heads" },
  { cls: "text-4xl font-semibold", name: "4xl", px: type["4xl"].px, use: "Page titles" },
  { cls: "text-5xl font-semibold", name: "5xl", px: type["5xl"].px, use: "Display" },
  { cls: "text-6xl font-bold", name: "6xl", px: type["6xl"].px, use: "Hero only" },
];

const frameRows = [
  {
    frame: "Ribble Gravel SL",
    bb: "T47 86mm",
    axle: "142x12",
    steerer: "1-1/8 – 1-1/2 tapered",
    post: "27.2",
    tyre: "45",
    status: "fits" as const,
    verdict: "Fits",
  },
  {
    frame: "Canyon Grizl CF SL",
    bb: "BB86",
    axle: "142x12",
    steerer: "1-1/8 – 1-1/4 tapered",
    post: "27.2",
    tyre: "50",
    status: "adapter" as const,
    verdict: "Needs a 1-1/4 lower race",
  },
  {
    frame: "Cannondale Topstone Al",
    bb: "BSA 68mm",
    axle: "142x12",
    steerer: "1-1/8 – 1-1/2 tapered",
    post: "27.2",
    tyre: "42",
    status: "blocked" as const,
    verdict: "Shell thread mismatch",
  },
  {
    frame: "Specialized Diverge",
    bb: "BSA 68mm",
    axle: "142x12",
    steerer: "1-1/8 – 1-1/2 tapered",
    post: "27.2",
    tyre: "47",
    status: "info" as const,
    verdict: "Hanger not yet verified",
  },
];

/* ---------------------------------------------------------------------- */

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      {/* ---------------- Masthead ---------------- */}
      <header className="relative isolate overflow-hidden py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="bt-blueprint animate-drift pointer-events-none absolute inset-0 -z-10 [--grid-size:32px] opacity-60 [mask-image:radial-gradient(90%_70%_at_30%_0%,black,transparent)]"
        />
        <div
          aria-hidden="true"
          className="animate-scan pointer-events-none absolute inset-x-0 -z-10 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent"
        />

        <Reveal>
          <p className="font-mono text-micro tracking-caps text-accent">
            Bolts Together · Phase 4
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold text-text sm:text-5xl">
            The design system, on one page.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-text-muted">
            Tokens, motion primitives and UI primitives, shown plainly so they
            can be judged. This page is a specimen sheet, not the homepage —
            someone else builds that on top of what is here.
          </p>
        </Reveal>

        <Stagger className="mt-8 flex flex-wrap gap-2" delay={200}>
          <Badge tone="accent">Dark only</Badge>
          <Badge>Technical blueprint</Badge>
          <Badge>Tailwind v4 · @theme</Badge>
          <Badge mono>BB86 · 148x12 BOOST · M12x1.0</Badge>
        </Stagger>
      </header>

      {/* ---------------- 01 Colour ---------------- */}
      <Section
        id="colour"
        number="01 / Colour"
        title="Every colour, defined once"
        intro="Nine tokens carry the entire interface. Three more carry meaning and nothing else. There is no light theme, so none of this has a counterpart to keep in sync."
      >
        <Stagger className="grid gap-8 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Surfaces</CardEyebrow>
                <CardTitle>Ground upward</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4">
              <Swatch name="ink" hex={surface.ink} className="bg-ink" note="Page ground" />
              <Swatch name="well" hex={surface.well} className="bg-well" note="Insets, code" />
              <Swatch name="panel" hex={surface.panel} className="bg-panel" note="A card" />
              <Swatch
                name="panel-raised"
                hex={surface.panelRaised}
                className="bg-panel-raised"
                note="A card on a card"
              />
              <Swatch name="grid" hex={line.grid} className="bg-grid" note="Hairlines" />
              <Swatch
                name="grid-strong"
                hex={line.gridStrong}
                className="bg-grid-strong"
                note="Hover borders"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Text and accent</CardEyebrow>
                <CardTitle>Three weights of voice</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4">
              <Swatch name="text" hex={text.default} className="bg-text" note="Primary" />
              <Swatch name="text-muted" hex={text.muted} className="bg-text-muted" note="Secondary" />
              <Swatch name="text-faint" hex={text.faint} className="bg-text-faint" note="Labels, hints" />
              <Swatch name="accent" hex={accent.default} className="bg-accent" note="Actions, focus" />
              <Swatch
                name="accent-hover"
                hex={accent.hover}
                className="bg-accent-hover"
                note="Hover only"
              />
            </CardBody>
          </Card>

          <Card glow>
            <CardHeader>
              <div>
                <CardEyebrow>Semantic state</CardEyebrow>
                <CardTitle>Never decoration</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4">
              <Swatch
                name="state-fits"
                hex={state.fits}
                className="bg-state-fits"
                note="No warning — the part fits"
              />
              <Swatch
                name="state-adapter"
                hex={state.adapter}
                className="bg-state-adapter"
                note="Engine severity: warning"
              />
              <Swatch
                name="state-blocked"
                hex={state.blocked}
                className="bg-state-blocked"
                note="Engine severity: critical"
              />
              <p className="mt-1 border-t border-grid pt-4 text-sm text-text-muted">
                Engine severity <code className="text-text">info</code> is given
                no colour on purpose. It never blocks anything, and spending a
                fourth colour on it would weaken the other three.
              </p>
            </CardBody>
            <CardFooter>
              <span className="text-xs text-text-faint">
                These three appear only in <code>StatusPill</code>.
              </span>
            </CardFooter>
          </Card>
        </Stagger>
      </Section>

      {/* ---------------- 02 Type ---------------- */}
      <Section
        id="type"
        number="02 / Type"
        title="One grotesk, one mono"
        intro="Geist for everything, self-hosted from app/fonts. Geist Mono reserved for part numbers, measurements and standards — never for prose."
      >
        <Card>
          <CardBody className="divide-y divide-grid">
            {typeScale.map((step) => (
              <div
                key={step.name}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <div className="flex w-40 shrink-0 items-baseline gap-3">
                  <code className="font-mono text-xs tabular-nums text-accent">
                    text-{step.name}
                  </code>
                  <span className="font-mono text-xs tabular-nums text-text-faint">
                    {step.px}px
                  </span>
                </div>
                <p className={`min-w-0 flex-1 truncate text-text ${step.cls}`}>
                  Bolts Together
                </p>
                <span className="hidden shrink-0 text-xs text-text-faint lg:block">
                  {step.use}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Stagger className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Mono</CardEyebrow>
                <CardTitle>Standards and part numbers</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <SpecList>
                <Spec layout="row" label="Bottom bracket" value="BB86" />
                <Spec layout="row" label="Rear spacing" value="148x12" unit="BOOST" />
                <Spec layout="row" label="Hanger thread" value="M12x1.0" />
                <Spec layout="row" label="Seatpost" value="27.2" unit="mm" />
                <Spec
                  layout="row"
                  label="Derailleur hanger"
                  value=""
                  unknown
                  hint="Abstained — no manufacturer source"
                />
              </SpecList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Tabular numerals</CardEyebrow>
                <CardTitle>Columns that do not jitter</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <SpecList>
                <Spec layout="row" align="right" label="Frame" value="1,180" unit="g" />
                <Spec layout="row" align="right" label="Fork" value="411" unit="g" />
                <Spec layout="row" align="right" label="Wheelset" value="1,489" unit="g" />
                <Spec layout="row" align="right" label="Groupset" value="2,647" unit="g" />
                <Spec layout="row" align="right" label="Total" value="8,914" unit="g" />
              </SpecList>
              <p className="mt-4 text-xs text-text-faint">
                Every digit occupies the same width, so a running total can
                update without the column shifting under the reader.
              </p>
            </CardBody>
          </Card>
        </Stagger>
      </Section>

      {/* ---------------- 03 Motion ---------------- */}
      <Section
        id="motion"
        number="03 / Motion"
        title="Four primitives, no one-offs"
        intro="Reveal, Stagger, Hover and RouteTransition. Rich motion stays coherent only if every page reaches for the same small set — so new effects extend a primitive rather than appearing inline."
      >
        <Stagger className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Reveal</CardEyebrow>
                <CardTitle>Fade and rise</CardTitle>
              </div>
              <Badge mono>18px</Badge>
            </CardHeader>
            <CardBody className="text-sm text-text-muted">
              One IntersectionObserver flips an attribute; the animation itself
              lives in CSS, so its timing is edited in one place. Every heading
              and paragraph on this page came in through it.
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Stagger</CardEyebrow>
                <CardTitle>One beat apart</CardTitle>
              </div>
              <Badge mono>70ms</Badge>
            </CardHeader>
            <CardBody className="text-sm text-text-muted">
              A single observer on the container; the offsets are pure CSS
              nth-child. Children are neither cloned nor wrapped, so it drops
              straight into an existing grid — including this one.
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Hover</CardEyebrow>
                <CardTitle>Lift and glow</CardTitle>
              </div>
              <Badge mono>3px</Badge>
            </CardHeader>
            <CardBody className="text-sm text-text-muted">
              Exported as a class list as well as a component, so a Card and a
              Hover wrapper move identically instead of two near-misses.
            </CardBody>
          </Card>
        </Stagger>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Hover className="rounded-lg border border-grid bg-panel p-6">
            <p className="text-micro tracking-caps text-text-faint uppercase">
              Hover
            </p>
            <p className="mt-2 text-base text-text">lift</p>
          </Hover>
          <Hover glow className="rounded-lg border border-grid bg-panel p-6">
            <p className="text-micro tracking-caps text-text-faint uppercase">
              Hover glow
            </p>
            <p className="mt-2 text-base text-text">lift + accent glow</p>
          </Hover>
          <Hover
            spotlight
            className="rounded-lg border border-grid bg-panel p-6"
          >
            <p className="text-micro tracking-caps text-text-faint uppercase">
              Hover spotlight
            </p>
            <p className="mt-2 text-base text-text">pointer-tracked</p>
          </Hover>
        </div>

        <Reveal className="mt-8">
          <Card tone="well" blueprint>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="text-micro tracking-caps text-accent uppercase">
                  Reduced motion
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  Every primitive checks{" "}
                  <code className="text-text">prefers-reduced-motion</code>{" "}
                  before it builds an observer or attaches a listener, and CSS
                  backs that up globally. Where motion is removed, the state
                  change stays: a hover that vanishes entirely is a regression,
                  not an accommodation. Turn the setting on and this page still
                  reads — it simply stops moving.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="animate-breathe inline-block size-2 rounded-full bg-state-fits"
                />
                <span className="font-mono text-xs text-text-faint">
                  ambient layer
                </span>
              </div>
            </CardBody>
          </Card>
        </Reveal>
      </Section>

      {/* ---------------- 04 UI primitives ---------------- */}
      <Section
        id="primitives"
        number="04 / Primitives"
        title="The parts everything is built from"
        intro="Button, Card, Badge, StatusPill and Spec. If a screen needs something that is not here, the primitive is what should grow — not the screen."
      >
        <Stagger className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Button</CardEyebrow>
                <CardTitle>Four variants, three sizes</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Start a build</Button>
                <Button variant="secondary">Load a bike</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger">Remove part</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="/" variant="secondary">
                  As a link
                </ButtonLink>
                <span className="text-xs text-text-faint">
                  Tab to any control — one accent focus ring, everywhere.
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Badge and StatusPill</CardEyebrow>
                <CardTitle>Labels versus verdicts</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Gravel</Badge>
                <Badge tone="outline">Road</Badge>
                <Badge tone="accent">New</Badge>
                <Badge mono>SRAM XPLR AXS</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-grid pt-5">
                <StatusPill status="fits" />
                <StatusPill status="adapter" />
                <StatusPill status="blocked" />
                <StatusPill status="info" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status="fits" size="sm" live />
                <StatusPill status="adapter" size="sm">
                  1-1/4 lower race
                </StatusPill>
                <StatusPill status="blocked" size="sm" iconOnly />
              </div>
              <p className="text-xs text-text-faint">
                Colour is never the only signal: each status carries its own
                glyph and its own words as well.
              </p>
            </CardBody>
          </Card>
        </Stagger>

        <Reveal className="mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardEyebrow>Spec</CardEyebrow>
                <CardTitle>Label and measured value</CardTitle>
              </div>
              <Badge mono>tabular</Badge>
            </CardHeader>
            <CardBody>
              <SpecGrid columns={4}>
                <Spec label="Bottom bracket" value="BB86" hint="86.5mm press-fit" />
                <Spec label="Spindle" value="28.99" unit="mm" />
                <Spec label="Chainline" value="45" unit="mm" />
                <Spec label="Max tyre" value="50" unit="mm" />
                <Spec label="Rear axle" value="142x12" />
                <Spec label="Rotor mount" value="Flat mount" />
                <Spec label="Cable pull" value="1.0" unit="mm/click" />
                <Spec label="Hanger" value="" unknown hint="No verified source" />
              </SpecGrid>
            </CardBody>
            <CardFooter>
              <span className="text-xs text-text-faint">
                Missing data renders as &ldquo;not verified&rdquo;. Nothing is
                ever filled in with a plausible-looking number.
              </span>
            </CardFooter>
          </Card>
        </Reveal>
      </Section>

      {/* ---------------- 05 Wide content ---------------- */}
      <Section
        id="tables"
        number="05 / Wide content"
        title="The page never scrolls sideways"
        intro="Spec tables are wider than a phone. They scroll inside their own container, so the page itself stays put — narrow this window and only the table moves."
      >
        <Reveal>
          <Card className="overflow-hidden">
            <div className="bt-scroll-x">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-grid">
                    {[
                      "Frame",
                      "BB shell",
                      "Rear axle",
                      "Steerer",
                      "Seatpost",
                      "Max tyre",
                      "Verdict",
                    ].map((head) => (
                      <th
                        key={head}
                        scope="col"
                        className="px-4 py-3 text-micro font-medium tracking-caps text-text-faint uppercase"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {frameRows.map((row) => (
                    <tr
                      key={row.frame}
                      className="border-b border-grid last:border-b-0 transition-colors duration-[var(--duration-fast)] hover:bg-panel-raised"
                    >
                      <th
                        scope="row"
                        className="px-4 py-3 text-sm font-medium text-text"
                      >
                        {row.frame}
                      </th>
                      <td className="px-4 py-3 font-mono text-sm text-text-muted">
                        {row.bb}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-muted">
                        {row.axle}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-muted">
                        {row.steerer}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-muted">
                        {row.post}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-muted">
                        {row.tyre}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} size="sm">
                          {row.verdict}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>
        <Reveal className="mt-4">
          <p className="text-xs text-text-faint">
            Illustrative rows only — these are not verified compatibility
            results, and nothing on this page should be read as one.
          </p>
        </Reveal>
      </Section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-grid pt-10">
        <Reveal className="flex flex-col gap-2">
          <p className="text-sm text-text-muted">
            Tokens live in{" "}
            <code className="text-text">app/globals.css</code> and{" "}
            <code className="text-text">lib/design/tokens.ts</code>. Those two
            files are the only place a hex value belongs.
          </p>
          <p className="text-xs text-text-faint">
            Replace this page when the real homepage is built.
          </p>
        </Reveal>
      </footer>
    </main>
  );
}
