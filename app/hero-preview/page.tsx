import type { Metadata } from 'next';
import ScrollHero from '@/components/hero/ScrollHero';

// A preview route for the Phase 5 hero, kept separate from app/page.tsx so the
// design-system specimen sheet stays intact until the real landing page lands.
// Delete this once the hero is placed on the homepage.
export const metadata: Metadata = {
  title: 'Hero preview',
  robots: { index: false, follow: false },
};

export default function HeroPreviewPage() {
  return (
    <main className="bg-ink text-text">
      <ScrollHero />

      {/* Something to scroll into, so the sticky section releases naturally and
          the end of the sequence can be checked. */}
      <section className="mx-auto max-w-3xl px-5 py-32">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
          Preview only
        </p>
        <p className="mt-4 text-text-muted">
          The hero above is decorative. It shows a generic render, not a build
          anyone has configured, and the callouts name checks the engine runs
          rather than specifications of this bike.
        </p>
      </section>
    </main>
  );
}
