'use client';

// components/hero/ScrollHero.tsx
//
// The landing hero: an exploded road bike that resolves into a complete bike as
// you scroll. 97 frames drawn to a canvas, indexed by scroll progress.
//
// WHY A FRAME SEQUENCE AND NOT A <video>
// Scrubbing video means setting currentTime on every scroll event. Mobile
// Safari is unreliable about that, and a normal MP4 only carries keyframes every
// few seconds, so seeking between them forces a whole chunk to decode and the
// scrub stutters. Preloaded images indexed by scroll are the technique Apple use
// on product pages, and they behave the same everywhere.
//
// WHY CANVAS AND NOT AN <img> WITH A CHANGING src
// Swapping src decodes on the main thread and flickers between frames. Drawing
// an already-decoded image to a canvas is a paint, not a decode.
//
// The callouts name checks the ENGINE performs -- bottom bracket shell, axle
// spacing, freehub body. They are deliberately NOT specifications of this
// particular bike: the video is a generic render, and claiming it has a specific
// shell standard would be inventing data about a product that does not exist.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../motion/usePrefersReducedMotion';

const FRAME_COUNT = 97;
const FRAME_W = 864;
const FRAME_H = 496;

function framePath(i: number): string {
  return '/hero/frames/f' + String(i + 1).padStart(3, '0') + '.webp';
}

/**
 * Callouts keyed to assembly progress. Each names a real category of check the
 * compatibility engine runs, in roughly the order the relevant parts arrive.
 */
const CALLOUTS: { at: number; label: string; detail: string }[] = [
  { at: 0.18, label: 'Frame first', detail: 'Every other list narrows to what fits it' },
  { at: 0.38, label: 'Bottom bracket shell', detail: 'BSA, PressFit and T47 are not interchangeable' },
  { at: 0.56, label: 'Axle spacing', detail: 'Checked independently, front and rear' },
  { at: 0.74, label: 'Freehub body', detail: 'Micro Spline, XD and HG each take their own cassette' },
  { at: 0.92, label: 'A build that bolts together', detail: '103 rules across 27 categories' },
];

export default function ScrollHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastDrawn = useRef(-1);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  /** Draw frame `index`, skipping the work if it is already on screen. */
  const draw = useCallback((index: number) => {
    if (index === lastDrawn.current) return;
    const img = framesRef.current[index];
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    lastDrawn.current = index;
  }, []);

  // Load frames. The first is fetched eagerly so the hero is never blank; the
  // rest stream in afterwards and the scrub snaps to the nearest frame present.
  useEffect(() => {
    let cancelled = false;
    framesRef.current = new Array(FRAME_COUNT).fill(null);

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (!cancelled) framesRef.current[i] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = framePath(i);
      });

    // Reduced motion only ever shows the final assembled frame, so there is no
    // reason to pull the other 96 down.
    if (reducedMotion) {
      void load(FRAME_COUNT - 1).then(() => {
        if (cancelled) return;
        setReady(true);
        draw(FRAME_COUNT - 1);
      });
      return () => {
        cancelled = true;
      };
    }

    void load(0).then(() => {
      if (cancelled) return;
      setReady(true);
      draw(0);
      // Sequential rather than parallel: 97 simultaneous requests would fight
      // the rest of the page for connections during first paint.
      void (async () => {
        for (let i = 1; i < FRAME_COUNT; i += 1) {
          if (cancelled) return;
          await load(i);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [draw, reducedMotion]);

  // Map scroll position through the section to 0..1.
  useEffect(() => {
    if (reducedMotion) return;

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = sectionRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) return;

        const p = Math.min(1, Math.max(0, -rect.top / scrollable));
        setProgress(p);

        // Snap back to the nearest loaded frame while the sequence streams in.
        let idx = Math.min(FRAME_COUNT - 1, Math.round(p * (FRAME_COUNT - 1)));
        while (idx > 0 && !framesRef.current[idx]) idx -= 1;
        draw(idx);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, reducedMotion]);

  const active = CALLOUTS.reduce(
    (acc, c, i) => (progress >= c.at ? i : acc),
    reducedMotion ? CALLOUTS.length - 1 : -1,
  );

  return (
    <section
      ref={sectionRef}
      aria-label="A bike assembling from its parts"
      // Three viewports of scroll gives the assembly room to read as a sequence
      // rather than a flicker. Reduced motion collapses it to a single screen.
      className={reducedMotion ? 'relative' : 'relative h-[300svh]'}
    >
      <div className="sticky top-0 flex min-h-svh flex-col items-center justify-center overflow-hidden px-5">
        {/* The cyan cast belongs to the render, not the interface. The UI accent
            stays orange and keeps its semantic duty elsewhere on the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 42%, rgba(110,231,249,0.09) 0%, transparent 62%)',
          }}
        />

        <p className="relative mb-7 font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
          103 rules · 27 categories
        </p>

        <h1 className="relative mb-10 max-w-3xl text-balance text-center text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-text sm:text-5xl">
          Build a bike that actually bolts together
        </h1>

        {/* Contained at native size rather than full-bleed: the source is
            864x496, and stretching past that only makes it soft. */}
        <div className="relative w-full max-w-[864px]">
          <div className="relative overflow-hidden rounded-sm border border-grid bg-well">
            <canvas
              ref={canvasRef}
              width={FRAME_W}
              height={FRAME_H}
              className="block h-auto w-full"
              style={{ aspectRatio: String(FRAME_W) + ' / ' + String(FRAME_H) }}
            />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
                  Loading
                </span>
              </div>
            )}
          </div>

          {/* A measure of assembly, not a decorative bar. */}
          {!reducedMotion && (
            <div aria-hidden className="relative h-px w-full bg-grid">
              <div
                className="h-px bg-[#6EE7F9]"
                style={{ width: String(progress * 100) + '%' }}
              />
            </div>
          )}
        </div>

        {/* Callouts name checks the engine runs. They describe the product's
            behaviour, never this render's specifications. */}
        <div className="relative mt-8 h-16 w-full max-w-[864px]">
          {CALLOUTS.map((c, i) => (
            <div
              key={c.label}
              className="absolute inset-x-0 top-0 text-center transition-opacity duration-300"
              style={{ opacity: i === active ? 1 : 0 }}
              aria-hidden={i !== active}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6EE7F9]">
                {c.label}
              </p>
              <p className="mt-2 text-sm text-text-muted">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
