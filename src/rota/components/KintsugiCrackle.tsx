import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';
import { canvasDpr } from '../data/device';

/**
 * Crackled glaze with a gold seam running through it. The crackle is drawn
 * once into an offscreen canvas; each frame only copies it and strokes the
 * gold as far as the scroll has taken the repair, and a frame whose repair
 * has not moved is skipped entirely.
 *
 * The canvas is re-inverted like the photographs, so each mode carries its
 * own palette.
 */

const PALETTES = {
  light: {
    glaze: '#f5f3ee',
    sheen: '255, 255, 255',
    ink: '70, 64, 56',
    page: '251, 251, 251',
    goldHalo: '214, 168, 72',
    gold: '#b5842a',
    goldLight: '#f1d68a',
  },
  dark: {
    glaze: '#0b0b0c',
    sheen: '40, 38, 36',
    ink: '196, 190, 180',
    page: '4, 4, 4',
    goldHalo: '212, 164, 70',
    gold: '#d2a347',
    goldLight: '#ffe6a1',
  },
};

type Point = { x: number; y: number };
type Seam = { points: Point[]; lengths: number[]; total: number };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wobblyLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, rand: () => number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.moveTo(a.x, a.y);
  for (const k of [0.33, 0.66]) {
    const off = (rand() - 0.5) * len * 0.16;
    ctx.lineTo(a.x + dx * k + nx * off, a.y + dy * k + ny * off);
  }
  ctx.lineTo(b.x, b.y);
}

function measure(points: Point[]): Seam {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(
      lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y),
    );
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
}

/** A fracture wandering across the piece, from one edge towards the other */
function fracture(start: Point, heading: number, reach: number, rand: () => number): Point[] {
  const points = [start];
  let { x, y } = start;
  let angle = heading;
  let travelled = 0;
  while (travelled < reach) {
    const step = 14 + rand() * 22;
    angle += (rand() - 0.5) * 0.9;
    angle += (heading - angle) * 0.25;
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
    travelled += step;
    points.push({ x, y });
  }
  return points;
}

function buildSeams(width: number, height: number, rand: () => number): Seam[] {
  const seams: Seam[] = [];
  const reach = Math.hypot(width, height) * 1.1;
  const mains = [
    fracture({ x: -10, y: height * (0.12 + rand() * 0.2) }, 0.35, reach, rand),
    fracture({ x: width * (0.55 + rand() * 0.3), y: -10 }, 1.95, reach, rand),
    fracture({ x: -10, y: height * (0.6 + rand() * 0.25) }, -0.28, reach, rand),
  ];
  for (const main of mains) {
    seams.push(measure(main));
    // A couple of short branches off each main line, gilded after it
    for (let b = 0; b < 2; b += 1) {
      const from = main[Math.floor(main.length * (0.25 + rand() * 0.5))];
      const heading = rand() * Math.PI * 2;
      seams.push(measure(fracture(from, heading, 60 + rand() * 120, rand)));
    }
  }
  return seams;
}

function tracePartial(ctx: CanvasRenderingContext2D, seam: Seam, amount: number): Point | null {
  if (amount <= 0) return null;
  const limit = seam.total * Math.min(1, amount);
  const { points, lengths } = seam;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    if (lengths[i] >= limit) {
      const k = (limit - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      const tip = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * k,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * k,
      };
      ctx.lineTo(tip.x, tip.y);
      return tip;
    }
    ctx.lineTo(points[i].x, points[i].y);
  }
  return points[points.length - 1];
}

export function KintsugiCrackle() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glaze = document.createElement('canvas');
    const gctx = glaze.getContext('2d');
    if (!gctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let seams: Seam[] = [];
    let builtFor = '';
    let lastRepair = -1;

    const build = (negative: boolean) => {
      const tone = negative ? PALETTES.dark : PALETTES.light;
      const rand = mulberry32(1987);

      glaze.width = canvas.width;
      glaze.height = canvas.height;
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gctx.fillStyle = tone.glaze;
      gctx.fillRect(0, 0, width, height);
      const sheen = gctx.createRadialGradient(
        width * 0.35, height * 0.3, 0,
        width * 0.35, height * 0.3, Math.max(width, height) * 0.8,
      );
      sheen.addColorStop(0, `rgba(${tone.sheen}, 0.55)`);
      sheen.addColorStop(1, `rgba(${tone.sheen}, 0)`);
      gctx.fillStyle = sheen;
      gctx.fillRect(0, 0, width, height);

      // Craquelé: a jittered lattice with some joins left out, so cells vary
      const cell = width < 768 ? 44 : 62;
      const cols = Math.ceil(width / cell) + 2;
      const rows = Math.ceil(height / cell) + 2;
      const grid: Point[][] = [];
      for (let i = 0; i < cols; i += 1) {
        grid.push([]);
        for (let j = 0; j < rows; j += 1) {
          grid[i].push({
            x: (i - 0.5) * cell + (rand() - 0.5) * cell * 0.85,
            y: (j - 0.5) * cell + (rand() - 0.5) * cell * 0.85,
          });
        }
      }
      gctx.lineCap = 'round';
      gctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass += 1) {
        gctx.beginPath();
        for (let i = 0; i < cols; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            const p = grid[i][j];
            if (i + 1 < cols && rand() < 0.8 && (rand() < 0.5) === (pass === 0)) wobblyLine(gctx, p, grid[i + 1][j], rand);
            if (j + 1 < rows && rand() < 0.8 && (rand() < 0.5) === (pass === 0)) wobblyLine(gctx, p, grid[i][j + 1], rand);
            if (i + 1 < cols && j + 1 < rows && rand() < 0.18) wobblyLine(gctx, p, grid[i + 1][j + 1], rand);
          }
        }
        gctx.lineWidth = pass === 0 ? 0.9 : 0.55;
        gctx.strokeStyle = `rgba(${tone.ink}, ${pass === 0 ? 0.3 : 0.18})`;
        gctx.stroke();
      }

      seams = buildSeams(width, height, rand);
      gctx.beginPath();
      for (const seam of seams) tracePartial(gctx, seam, 1);
      gctx.lineWidth = 1.3;
      gctx.strokeStyle = `rgba(${tone.ink}, 0.5)`;
      gctx.stroke();

      // Fade to the page top and bottom, so the stack joins without a cut
      const top = gctx.createLinearGradient(0, 0, 0, height * 0.16);
      top.addColorStop(0, `rgba(${tone.page}, 1)`);
      top.addColorStop(1, `rgba(${tone.page}, 0)`);
      gctx.fillStyle = top;
      gctx.fillRect(0, 0, width, height * 0.16);
      const bottom = gctx.createLinearGradient(0, height * 0.8, 0, height);
      bottom.addColorStop(0, `rgba(${tone.page}, 0)`);
      bottom.addColorStop(1, `rgba(${tone.page}, 1)`);
      gctx.fillStyle = bottom;
      gctx.fillRect(0, height * 0.8, width, height * 0.2 + 2);
    };

    const resize = () => {
      width = host.clientWidth || 1200;
      height = host.clientHeight || 600;
      dpr = canvasDpr(width);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      builtFor = '';
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Arriving and holding both repair; scrolling back up breaks it again
    const runway = host.closest('[data-stack-runway]') ?? host;
    const repairNow = () => {
      const box = runway.getBoundingClientRect();
      const view = window.innerHeight;
      const raw = (view - box.top) / (view + box.height * 0.5);
      return Math.max(0, Math.min(1, raw / 0.85));
    };

    const draw = (repair: number, negative: boolean) => {
      const tone = negative ? PALETTES.dark : PALETTES.light;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(glaze, 0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const tips: Point[] = [];
      const layers: [number, string][] = [
        [11, `rgba(${tone.goldHalo}, 0.14)`],
        [6, `rgba(${tone.goldHalo}, 0.32)`],
        [3.2, tone.gold],
        [1.1, tone.goldLight],
      ];
      for (const [lineWidth, style] of layers) {
        ctx.beginPath();
        seams.forEach((seam, i) => {
          // Main seams go first, their branches follow once the main is in
          const isBranch = i % 3 !== 0;
          const main = Math.floor(i / 3);
          const startAt = main * 0.14 + (isBranch ? 0.42 : 0);
          const amount = (repair - startAt) / (isBranch ? 0.3 : 0.58);
          const tip = tracePartial(ctx, seam, amount);
          if (tip && amount < 1 && lineWidth === 1.1) tips.push(tip);
        });
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = style;
        ctx.stroke();
      }

      for (const tip of tips) {
        const glint = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 18);
        glint.addColorStop(0, tone.goldLight);
        glint.addColorStop(0.35, `rgba(${tone.goldHalo}, 0.6)`);
        glint.addColorStop(1, `rgba(${tone.goldHalo}, 0)`);
        ctx.fillStyle = glint;
        ctx.fillRect(tip.x - 18, tip.y - 18, 36, 36);
      }
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const negative = document.documentElement.classList.contains('negative-mode');
      const key = `${width}x${height}:${negative}`;
      const repair = reduced ? 1 : repairNow();
      if (key !== builtFor) {
        build(negative);
        builtFor = key;
        lastRepair = -1;
      }
      if (Math.abs(repair - lastRepair) < 0.0005) return;
      lastRepair = repair;
      draw(repair, negative);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [onScreen]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
