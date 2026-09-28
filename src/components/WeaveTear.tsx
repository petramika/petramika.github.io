import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';

const STRANDS = 5;
const SAMPLES = 10;
const COARSE_QUERY = '(pointer: coarse)';

type Tile = { damage: number; seed: number };

function hash(i: number, j: number) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rng(seed: number) {
  let a = Math.floor(seed * 4294967296) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one strand, cut and frayed in proportion to the tile's damage */
function strand(
  ctx: CanvasRenderingContext2D,
  at: (t: number) => [number, number],
  damage: number,
  rand: () => number,
  fray: number,
) {
  const breaks = damage > 0 && rand() < damage * 1.4;
  const cut = 0.25 + rand() * 0.5;
  const gap = breaks ? Math.min(0.5, damage * (0.25 + rand() * 0.35)) : 0;
  const droopA = (rand() - 0.5) * fray * damage;
  const droopB = (rand() - 0.5) * fray * damage;

  const run = (from: number, to: number, droop: number, atStart: boolean) => {
    if (to - from < 0.02) return;
    for (let s = 0; s <= SAMPLES; s += 1) {
      const t = from + ((to - from) * s) / SAMPLES;
      let [x, y] = at(t);
      // The loose end curls away from the line it came off
      const k = atStart ? 1 - s / SAMPLES : s / SAMPLES;
      if (gap > 0) {
        x += droop * k * k;
        y += droop * k * k;
      }
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };

  if (gap === 0) {
    run(0, 1, 0, false);
    return;
  }
  run(0, cut - gap, droopA, false);
  run(cut + gap, 1, droopB, true);
}

export function WeaveTear() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coarse = window.matchMedia(COARSE_QUERY).matches;
    let width = 0;
    let height = 0;
    let size = 56;
    let cols = 0;
    let rows = 0;
    let tiles: Tile[] = [];
    let dirty = true;
    let drawnNegative: boolean | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      size = width < 768 ? 42 : 58;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nextCols = Math.ceil(width / size) + 1;
      const nextRows = Math.ceil(height / size) + 1;
      // What is already torn stays torn through a resize
      const next: Tile[] = [];
      for (let j = 0; j < nextRows; j += 1) {
        for (let i = 0; i < nextCols; i += 1) {
          const old = i < cols && j < rows ? tiles[j * cols + i] : undefined;
          next.push({ damage: old?.damage ?? 0, seed: hash(i, j) });
        }
      }
      tiles = next;
      cols = nextCols;
      rows = nextRows;
      dirty = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const tear = (x: number, y: number, radius: number, strength: number) => {
      const i0 = Math.max(0, Math.floor((x - radius) / size));
      const i1 = Math.min(cols - 1, Math.floor((x + radius) / size));
      const j0 = Math.max(0, Math.floor((y - radius) / size));
      const j1 = Math.min(rows - 1, Math.floor((y + radius) / size));
      for (let j = j0; j <= j1; j += 1) {
        for (let i = i0; i <= i1; i += 1) {
          const d = Math.hypot((i + 0.5) * size - x, (j + 0.5) * size - y);
          if (d > radius) continue;
          const tile = tiles[j * cols + i];
          const next = Math.min(1, tile.damage + (1 - d / radius) * strength);
          if (next !== tile.damage) {
            tile.damage = next;
            dirty = true;
          }
        }
      }
    };

    const onPointer = (event: PointerEvent) => {
      if (!onScreen.current || event.pointerType === 'touch') return;
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) return;
      tear(x, y, size * 1.1, 0.22);
    };

    let lastScroll = window.scrollY;
    let travelled = 0;
    const onScroll = () => {
      const delta = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      if (!onScreen.current) return;
      travelled += delta;
      while (travelled > 36) {
        travelled -= 36;
        tear(Math.random() * width, Math.random() * height, size * (0.8 + Math.random() * 0.9), 0.55);
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    if (coarse) window.addEventListener('scroll', onScroll, { passive: true });

    const draw = (negative: boolean) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.strokeStyle = negative ? 'rgba(235, 234, 231, 0.3)' : 'rgba(20, 21, 24, 0.26)';
      ctx.beginPath();

      const bow = size * 0.16;
      const sag = size * 0.05;
      const fray = size * 0.35;

      for (let j = 0; j < rows; j += 1) {
        // Vertical bands in a row all lean the same way, and the next row leans back
        const b = j % 2 === 0 ? bow : -bow;
        for (let i = 0; i < cols; i += 1) {
          const tile = tiles[j * cols + i];
          const rand = rng(tile.seed);
          const x0 = i * size;
          const y0 = j * size;
          const vertical = (i + j) % 2 === 0;

          for (let k = 0; k < STRANDS; k += 1) {
            const f = k / (STRANDS - 1);
            if (vertical) {
              const x = x0 + f * size;
              strand(ctx, (t) => [x + 2 * t * (1 - t) * b, y0 + t * size], tile.damage, rand, fray);
            } else {
              const y = y0 + f * size;
              // Ends follow the lean of the vertical bands either side
              const shift = 2 * f * (1 - f) * b;
              const s = i % 2 === 0 ? sag : -sag;
              strand(
                ctx,
                (t) => [x0 + shift + t * size, y + Math.sin(Math.PI * t) * s],
                tile.damage,
                rand,
                fray,
              );
            }
          }
        }
      }
      ctx.stroke();
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const negative = document.documentElement.classList.contains('negative-mode');
      if (!dirty && negative === drawnNegative) return;
      dirty = false;
      drawnNegative = negative;
      draw(negative);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [onScreen]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
