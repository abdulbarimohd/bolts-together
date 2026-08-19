'use client';

// components/hero/ScrollHero.tsx
//
// The landing hero. An exploded road bike resolves into a complete bike as you
// scroll -- but it is a BACKGROUND, not a gate. Content scrolls over the top of
// it the whole way down, so the reader is never parked on a screen waiting for
// an animation to finish before the page will let them past.
//
// STRUCTURE
//   section (tall)
//     sticky h-svh, z-0   <- the canvas, pinned while the section passes
//     relative -mt-[100svh], z-10  <- panels, pulled up to scroll OVER it
//
// WHY A FRAME SEQUENCE AND NOT A <video>
// Scrubbing video means setting currentTime on every scroll event. Mobile
// Safari is unreliable about that, and a normal MP4 only carries keyframes
// every few seconds, so seeking forces a whole chunk to decode and stutters.
//
// WHY CANVAS AND NOT AN <img> WITH A CHANGING src
// Swapping src decodes on the main thread and flickers. Drawing an
// already-decoded image is a paint, not a decode.
//
// SMOOTHNESS comes from three things:
//   1. Every frame is decode()d during preload. onload resolves BEFORE the
//      bitmap is decoded, so without this the first draw of each frame pays a
//      decode cost mid-scroll -- the main source of stutter.
//   2. The drawn position eases toward the scroll position each rAF instead of
//      snapping, so one coarse wheel notch glides rather than jumping frames.
//   3. Drawing continues while the eased value catches up, not only on scroll.
//
// The panel headings name checks the ENGINE performs. They are deliberately NOT
// specifications of this bike: the render is generic, and claiming it has a
// specific shell standard would be inventing data about a product that does not
// exist.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../motion/usePrefersReducedMotion';

const FRAME_COUNT = 97;
const SRC_W = 1728;
const SRC_H = 992;

function framePath(i: number): string {
  return '/hero/frames/f' + String(i + 1).padStart(3, '0') + '.webp';
}

const PANELS: { label: string; title: string; body: string }[] = [
  {
    label: 'Frame first',
    title: 'Start with the frame, and everything else narrows',
    body: 'Pick a frame and every other list shows only what genuinely fits it. No need to already know the standards.',
  },
  {
    label: 'Bottom bracket shell',
    title: 'A “92mm bottom bracket” is four incompatible shells',
    body: 'BSA, PressFit and T47 are not interchangeable, and none of it fails loudly. A part simply does not fit, and you find out after it is unwrapped.',
  },
  {
    label: 'Axle spacing',
    title: 'Front and rear are checked independently',
    body: 'Boost 148×12 and Super Boost 157×12 are not compatible despite both being Boost-era. The engine compares exact standards, never close ones.',
  },
  {
    label: 'Freehub body',
    title: 'The cassette has to match the hub it slides onto',
    body: 'Micro Spline is Shimano 12-speed only. XD and XDR are SRAM. Get it wrong and the cassette will not engage the splines at all.',
  },
  {
    label: 'It bolts together',
    title: 'A finished build is one already checked',
    body: '103 rules across 27 part categories. Parts that cannot physically work are removed from the list, not flagged after you have chosen them.',
  },
];

export default function ScrollHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);

  const targetRef = useRef(0);
  const easedRef = useRef(0);
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
      lastDrawn.current = -1;
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
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    lastDrawn.current = index;
  }, []);

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
        if (cancelled) return;
        resize();
        draw(FRAME_COUNT - 1);
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
      for (let i = 1; i < FRAME_COUNT; i += 1) {
        if (cancelled) return;
        await load(i);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draw, resize, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        if (scrollable > 0) {
          targetRef.current = Math.min(1, Math.max(0, -rect.top / scrollable));
        }
      }

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

  return (
    <section ref={sectionRef} className="relative bg-ink">
      {/* Background layer. Sticky rather than fixed so it releases cleanly when
          the section ends and the rest of the page takes over. */}
      <div className="sticky top-0 z-0 h-svh w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-label="A bike assembling from its parts"
          role="img"
          className="absolute inset-0 block h-full w-full"
        />
        {/* Vignette keeps type legible over the render's bright centre without
            dimming the bike itself. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(130% 95% at 50% 45%, transparent 30%, rgba(10,12,16,0.62) 76%, rgba(10,12,16,0.94) 100%)',
          }}
        />
      </div>

      {/* Content scrolls OVER the background. The negative margin pulls it up
          so the first panel sits on the hero rather than below it. */}
      <div className="relative z-10 -mt-[100svh]">
        {/* Opening screen: headline only, so the exploded bike is seen clean. */}
        <div className="flex h-svh flex-col items-center justify-center px-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6EE7F9]">
            103 rules · 27 categories
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.03em] text-text sm:text-5xl lg:text-6xl">
            Build a bike that actually bolts together
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-text-muted sm:text-lg">
            Pick a frame. Every other part list narrows to what genuinely fits it.
          </p>
        </div>

        {/* Panels pass over the assembling bike, alternating side so the centre
            of the frame stays visible. */}
        {PANELS.map((p, i) => (
          <div
            key={p.label}
            className={
              'flex h-svh items-center px-6 ' +
              (i % 2 === 0 ? 'justify-start' : 'justify-end')
            }
          >
            <div className="w-full max-w-md rounded-sm border border-grid bg-panel/85 p-7 backdrop-blur-sm sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6EE7F9]">
                {p.label}
              </p>
              <h2 className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-text">
                {p.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-muted">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Assembly progress, fixed to the foot of the viewport for the duration
          of the section. A measure, not decoration. */}
      {!reducedMotion && (
        <div
          aria-hidden
          className="pointer-events-none sticky bottom-0 z-20 -mt-px h-px w-full bg-grid"
        >
          <div className="h-px bg-[#6EE7F9]" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {!reducedMotion && loaded < FRAME_COUNT && (
        <p className="pointer-events-none sticky bottom-3 z-20 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
          Loading {loaded} / {FRAME_COUNT}
        </p>
      )}
    </section>
  );
}
