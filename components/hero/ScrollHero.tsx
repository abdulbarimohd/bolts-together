'use client';

// components/hero/ScrollHero.tsx
//
// The landing hero: an exploded road bike that resolves into a complete bike as
// you scroll. 97 frames drawn full-bleed to a canvas, indexed by scroll.
//
// WHY A FRAME SEQUENCE AND NOT A <video>
// Scrubbing video means setting currentTime on every scroll event. Mobile
// Safari is unreliable about that, and a normal MP4 only carries keyframes every
// few seconds, so seeking between them forces a whole chunk to decode and the
// scrub stutters. Preloaded images indexed by scroll behave the same everywhere.
//
// WHY CANVAS AND NOT AN <img> WITH A CHANGING src
// Swapping src decodes on the main thread and flickers. Drawing an
// already-decoded image is a paint, not a decode.
//
// SMOOTHNESS comes from three things, all of which matter:
//   1. Every frame is decode()d during preload, so the first draw of a frame is
//      never the first time the browser decodes it. This was the main source of
//      stutter -- onload fires before decode, so drawing still paid that cost.
//   2. The drawn position eases toward the scroll position each rAF rather than
//      snapping to it, so a coarse mouse wheel does not jump several frames.
//   3. The canvas keeps drawing while the eased value catches up, instead of
//      only redrawing on scroll events.
//
// The callouts name checks the ENGINE performs -- bottom bracket shell, axle
// spacing, freehub body. They are deliberately NOT specifications of this
// particular bike: the video is a generic render, and claiming it has a specific
// shell standard would be inventing data about a product that does not exist.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../motion/usePrefersReducedMotion';

const FRAME_COUNT = 97;
const SRC_W = 864;
const SRC_H = 496;

function framePath(i: number): string {
  return '/hero/frames/f' + String(i + 1).padStart(3, '0') + '.webp';
}

const CALLOUTS: { at: number; label: string; detail: string }[] = [
  { at: 0.06, label: 'Frame first', detail: 'Every other list narrows to what genuinely fits it' },
  { at: 0.3, label: 'Bottom bracket shell', detail: 'BSA, PressFit and T47 are not interchangeable' },
  { at: 0.52, label: 'Axle spacing', detail: 'Checked independently, front and rear' },
  { at: 0.72, label: 'Freehub body', detail: 'Micro Spline, XD and HG each take their own cassette' },
  { at: 0.9, label: 'It bolts together', detail: '103 rules across 27 part categories' },
];

export default function ScrollHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);

  const targetRef = useRef(0); // where the scroll says we should be, 0..1
  const easedRef = useRef(0); // where we are actually drawing, 0..1
  const rafRef = useRef<number | null>(null);
  const lastDrawn = useRef(-1);

  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  /** Size the backing store to the element, accounting for DPR. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      lastDrawn.current = -1; // force a redraw at the new size
    }
  }, []);

  /** Draw frame `index` scaled to COVER the canvas, centred. */
  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = framesRef.current[index];
    if (!img) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const scale = Math.max(canvas.width / SRC_W, canvas.height / SRC_H);
    const w = SRC_W * scale;
    const h = SRC_H * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.drawImage(img, x, y, w, h);
    lastDrawn.current = index;
  }, []);

  // Preload. decode() matters here: onload resolves before the bitmap is
  // decoded, so without it the first draw of each frame pays a decode cost
  // mid-scroll, which is exactly what reads as stutter.
  useEffect(() => {
    let cancelled = false;
    framesRef.current = new Array(FRAME_COUNT).fill(null);

    const load = async (i: number) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i);
      try {
        await img.decode();
      } catch {
        // Fall back to onload; a frame that never arrives is simply skipped.
        await new Promise<void>((r) => {
          img.onload = () => r();
          img.onerror = () => r();
        });
      }
      if (cancelled) return;
      framesRef.current[i] = img;
      setLoaded((n) => n + 1);
    };

    if (reducedMotion) {
      void load(FRAME_COUNT - 1).then(() => {
        if (!cancelled) {
          resize();
          draw(FRAME_COUNT - 1);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      await load(0);
      if (cancelled) return;
      resize();
      draw(0);
      // Sequential: 97 parallel requests would fight the rest of the page for
      // connections during first paint.
      for (let i = 1; i < FRAME_COUNT; i += 1) {
        if (cancelled) return;
        await load(i);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draw, resize, reducedMotion]);

  // A single rAF loop reads scroll, eases toward it, and draws. Easing here
  // rather than snapping is what turns a coarse wheel notch into a glide.
  useEffect(() => {
    if (reducedMotion) return;

    const readScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      targetRef.current = Math.min(1, Math.max(0, -rect.top / scrollable));
    };

    const tick = () => {
      readScroll();

      // Critically damped-ish approach: fast enough to feel responsive, slow
      // enough to smooth a mouse wheel's discrete steps.
      const diff = targetRef.current - easedRef.current;
      easedRef.current += diff * 0.14;
      if (Math.abs(diff) < 0.0005) easedRef.current = targetRef.current;

      let idx = Math.min(FRAME_COUNT - 1, Math.round(easedRef.current * (FRAME_COUNT - 1)));
      while (idx > 0 && !framesRef.current[idx]) idx -= 1;
      if (idx !== lastDrawn.current) draw(idx);

      setProgress(easedRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    const onResize = () => {
      resize();
      lastDrawn.current = -1;
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [draw, resize, reducedMotion]);

  const active = CALLOUTS.reduce(
    (acc, c, i) => (progress >= c.at ? i : acc),
    reducedMotion ? CALLOUTS.length - 1 : 0,
  );

  return (
    <section
      ref={sectionRef}
      aria-label="A bike assembling from its parts"
      className={reducedMotion ? 'relative' : 'relative h-[400svh]'}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-ink">
        {/* Full-bleed. The source is 864x496, so covering a large screen scales
            it up and softens it -- accepted deliberately in exchange for the
            image filling the frame rather than sitting in a letterbox. */}
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {/* Vignette: darkens the edges so the type stays legible over the
            brightest part of the render without dimming the bike itself. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 45%, transparent 35%, rgba(10,12,16,0.55) 78%, rgba(10,12,16,0.9) 100%)',
          }}
        />

        {/* Headline, top. Sits clear of the bike, which occupies the centre. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 px-6 pt-[max(2rem,7svh)] text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6EE7F9]">
            103 rules · 27 categories
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.03em] text-text sm:text-5xl lg:text-6xl">
            Build a bike that actually bolts together
          </h1>
        </div>

        {/* Callouts, overlaid at the bottom where they cannot be scrolled past.
            Previously these sat below the canvas and were simply never seen. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-[max(2.5rem,9svh)]">
          <div className="relative mx-auto h-20 max-w-2xl">
            {CALLOUTS.map((c, i) => (
              <div
                key={c.label}
                className="absolute inset-x-0 top-0 text-center transition-all duration-500"
                style={{
                  opacity: i === active ? 1 : 0,
                  transform: `translateY(${i === active ? 0 : 8}px)`,
                }}
                aria-hidden={i !== active}
              >
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#6EE7F9]">
                  {c.label}
                </p>
                <p className="mt-2 text-base text-text-muted sm:text-lg">{c.detail}</p>
              </div>
            ))}
          </div>

          {/* Assembly progress — a measure, not decoration. */}
          {!reducedMotion && (
            <div aria-hidden className="mx-auto mt-6 h-px w-full max-w-2xl bg-grid">
              <div className="h-px bg-[#6EE7F9]" style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          {/* Honest about the load, rather than pretending the scrub is ready. */}
          {!reducedMotion && loaded < FRAME_COUNT && (
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
              Loading {loaded} / {FRAME_COUNT}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
