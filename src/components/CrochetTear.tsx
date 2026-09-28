import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';

const SAMPLES = 10;
const COARSE_QUERY = '(pointer: coarse)';

type Point = { x: number; y: number };

function hash(i: number, j: number, k = 0) {
  let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0;
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

/** Draws one strand, cut and frayed in proportion to its damage */
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
        y += droop * k * k * 1.6;
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

/** A yarn between two knots: a few loosely twisted plies with a slight sag */
function thread(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  plies: number,
  damage: number,
  rand: () => number,
  fray: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const sag = (rand() - 0.5) * len * 0.12;
  for (let p = 0; p < plies; p += 1) {
    const off = (p - (plies - 1) / 2) * 1.3;
    const twist = rand() * Math.PI * 2;
    strand(
      ctx,
      (t) => {
        const w = off * Math.cos(t * Math.PI * 3 + twist) + sag * 4 * t * (1 - t);
        return [a.x + dx * t + nx * w, a.y + dy * t + ny * w];
      },
      damage,
      rand,
      fray,
    );
  }
}

export function CrochetTear() {
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
    let sx = 70;
    let sy = 46;
    let cols = 0;
    let rows = 0;
    let knots: Point[] = [];
    let damage: number[] = [];
    let dirty = true;
    let drawnNegative: boolean | null = null;

    const knotAt = (i: number, j: number) => knots[j * cols + i];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      sx = width < 768 ? 54 : 74;
      sy = sx * 0.64;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nextCols = Math.ceil(width / sx) + 2;
      const nextRows = Math.ceil(height / sy) + 2;
      const nextKnots: Point[] = [];
      const nextDamage: number[] = [];
      for (let j = 0; j < nextRows; j += 1) {
        for (let i = 0; i < nextCols; i += 1) {
          // Honeycomb: every other row sits half a stitch over
          nextKnots.push({
            x: (i - 0.5 + (j % 2) * 0.5) * sx + (hash(i, j, 1) - 0.5) * sx * 0.12,
            y: (j - 0.5) * sy + (hash(i, j, 2) - 0.5) * sy * 0.14,
          });
          // What is already torn stays torn through a resize
          nextDamage.push(i < cols && j < rows ? damage[j * cols + i] : 0);
        }
      }
      knots = nextKnots;
      damage = nextDamage;
      cols = nextCols;
      rows = nextRows;
      dirty = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const tear = (x: number, y: number, radius: number, strength: number) => {
      for (let n = 0; n < knots.length; n += 1) {
        const d = Math.hypot(knots[n].x - x, knots[n].y - y);
        if (d > radius) continue;
        const next = Math.min(1, damage[n] + (1 - d / radius) * strength);
        if (next !== damage[n]) {
          damage[n] = next;
          dirty = true;
        }
      }
    };

    const onPointer = (event: PointerEvent) => {
      if (!onScreen.current || event.pointerType === 'touch') return;
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) return;
      tear(x, y, sx * 0.9, 0.22);
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
        tear(Math.random() * width, Math.random() * height, sx * (0.7 + Math.random() * 0.8), 0.55);
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    if (coarse) window.addEventListener('scroll', onScroll, { passive: true });

    const draw = (negative: boolean) => {
      const ink = negative ? '235, 234, 231' : '20, 21, 24';
      const fray = sx * 0.3;
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // The open mesh: chains along the row and legs out to the rows either side
      ctx.beginPath();
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const here = knotAt(i, j);
          const dHere = damage[j * cols + i];
          const rand = rng(hash(i, j, 3));
          const link = (ii: number, jj: number, plies: number) => {
            if (ii < 0 || ii >= cols || jj >= rows) return;
            const d = Math.max(dHere, damage[jj * cols + ii]);
            thread(ctx, here, knotAt(ii, jj), plies, d, rand, fray);
          };
          link(i + 1, j, 2);
          const shift = j % 2;
          link(i - 1 + shift, j + 1, 3);
          link(i + shift, j + 1, 3);
        }
      }
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(${ink}, 0.22)`;
      ctx.stroke();

      // The clusters: a tight fan of stitches bunched at each knot
      ctx.beginPath();
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const k = knotAt(i, j);
          const d = damage[j * cols + i];
          const rand = rng(hash(i, j, 4));
          const up = (i + j) % 2 === 0 ? -1 : 1;
          for (let s = 0; s < 5; s += 1) {
            const spread = (s - 2) * 0.22;
            const reach = sy * (0.26 + rand() * 0.08);
            const tip = {
              x: k.x + Math.sin(spread) * reach,
              y: k.y + up * Math.cos(spread) * reach,
            };
            const base = { x: k.x + (s - 2) * 0.8, y: k.y - up * sy * 0.06 };
            strand(ctx, (t) => [base.x + (tip.x - base.x) * t, base.y + (tip.y - base.y) * t], d, rand, fray * 0.6);
          }
        }
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${ink}, 0.27)`;
      ctx.stroke();

      // Thins the mesh behind the passage so the type reads over it
      const hush = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width * 0.42, height * 0.36));
      hush.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
      hush.addColorStop(0.6, 'rgba(0, 0, 0, 0.6)');
      hush.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(width / 2, height / 2);
      ctx.scale(1, 0.72);
      ctx.translate(-width / 2, -height / 2);
      ctx.fillStyle = hush;
      ctx.fillRect(0, 0, width, height / 0.72);
      ctx.restore();
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
