import { useEffect, useRef } from 'react';
import { useScroll } from 'motion/react';
import { label, pad, texts } from '../data/labels';
import { useOnScreen } from '../hooks/useOnScreen';

interface WordGridSceneProps {
  chapter: string;
  index: number;
}

type Point = [number, number];
type Word = keyof typeof texts.wordGrid;

interface Hole {
  /** Centre and radii as fractions of the wall */
  c: Point;
  r: Point;
  words: Word[];
}

const WIDE: Hole[] = [
  { c: [0.5, 0.55], r: [0.19, 0.32], words: ['trauma', 'miedo', 'mentiras', 'dolor', 'dolor'] },
  { c: [0.2, 0.22], r: [0.09, 0.1], words: ['rabia'] },
  { c: [0.83, 0.2], r: [0.09, 0.1], words: ['queja'] },
  { c: [0.85, 0.62], r: [0.08, 0.17], words: ['apegos', 'miedo'] },
  { c: [0.16, 0.7], r: [0.09, 0.11], words: ['mentiras'] },
];

const TALL: Hole[] = [
  { c: [0.5, 0.5], r: [0.38, 0.17], words: ['trauma', 'miedo', 'mentiras', 'dolor', 'dolor'] },
  { c: [0.27, 0.14], r: [0.2, 0.05], words: ['rabia'] },
  { c: [0.73, 0.25], r: [0.2, 0.05], words: ['queja'] },
  { c: [0.27, 0.77], r: [0.2, 0.05], words: ['apegos'] },
  { c: [0.73, 0.88], r: [0.21, 0.05], words: ['mentiras'] },
];

function rng(seed: number) {
  let a = Math.floor(seed * 4294967296) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recursive midpoint displacement: what turns an oval into a torn edge */
function deform(points: Point[], depth: number, spread: number, rand: () => number): Point[] {
  let pts = points;
  for (let d = 0; d < depth; d += 1) {
    const next: Point[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      next.push(a, [
        (a[0] + b[0]) / 2 + (rand() - 0.5) * len * spread,
        (a[1] + b[1]) / 2 + (rand() - 0.5) * len * spread,
      ]);
    }
    pts = next;
  }
  return pts;
}

function torn(cx: number, cy: number, rx: number, ry: number, rand: () => number, rough = 0.34): Point[] {
  const pts: Point[] = [];
  const n = 9;
  for (let k = 0; k < n; k += 1) {
    const a = (k / n) * Math.PI * 2;
    const r = 0.78 + rand() * 0.36;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return deform(pts, 4, rough, rand);
}

/** A strip of plaster: squared off, only its edges broken */
function plaque(cx: number, cy: number, hw: number, hh: number, rand: () => number): Point[] {
  const pts: Point[] = [];
  const side = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let k = 0; k < n; k += 1) {
      const u = k / n;
      pts.push([x0 + (x1 - x0) * u + (rand() - 0.5) * hh * 0.25, y0 + (y1 - y0) * u + (rand() - 0.5) * hh * 0.25]);
    }
  };
  side(cx - hw, cy - hh, cx + hw, cy - hh, 6);
  side(cx + hw, cy - hh, cx + hw, cy + hh, 2);
  side(cx + hw, cy + hh, cx - hw, cy + hh, 6);
  side(cx - hw, cy + hh, cx - hw, cy - hh, 2);
  return deform(pts, 2, 0.14, rand);
}

function trace(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** The paper the wall was last hung with: faded blue flowers on cream */
function floralTile(rand: () => number) {
  const c = document.createElement('canvas');
  c.width = c.height = 84;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e2d9c2';
  g.fillRect(0, 0, 84, 84);
  g.fillStyle = 'rgba(160, 150, 120, 0.25)';
  for (let x = 0; x < 84; x += 21) g.fillRect(x, 0, 1.5, 84);
  const flower = (x: number, y: number, s: number) => {
    g.fillStyle = 'rgba(128, 150, 110, 0.7)';
    g.beginPath();
    g.ellipse(x - s * 1.3, y + s * 0.9, s * 0.9, s * 0.35, -0.6, 0, Math.PI * 2);
    g.ellipse(x + s * 1.2, y + s * 1.1, s * 0.9, s * 0.35, 0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(96, 124, 170, 0.75)';
    for (let p = 0; p < 5; p += 1) {
      const a = (p / 5) * Math.PI * 2 + rand() * 0.3;
      g.beginPath();
      g.arc(x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7, s * 0.55, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(200, 160, 80, 0.85)';
    g.beginPath();
    g.arc(x, y, s * 0.35, 0, Math.PI * 2);
    g.fill();
  };
  flower(21, 21, 7);
  flower(63, 63, 7);
  flower(63, 18, 3.5);
  flower(20, 64, 3.5);
  return c;
}

/** An older paper under it: a small green geometric */
function geoTile() {
  const c = document.createElement('canvas');
  c.width = c.height = 26;
  const g = c.getContext('2d')!;
  g.fillStyle = '#cfd3b8';
  g.fillRect(0, 0, 26, 26);
  g.strokeStyle = 'rgba(80, 120, 110, 0.7)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(13, 2);
  g.lineTo(24, 13);
  g.lineTo(13, 24);
  g.lineTo(2, 13);
  g.closePath();
  g.stroke();
  g.fillStyle = 'rgba(190, 120, 90, 0.8)';
  g.beginPath();
  g.arc(13, 13, 2.4, 0, Math.PI * 2);
  g.fill();
  return c;
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, dark: string, count: number) {
  ctx.fillStyle = dark;
  for (let i = 0; i < count; i += 1) {
    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.globalAlpha = 1;
}

function bricks(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  ctx.fillStyle = '#7e766c';
  ctx.fillRect(0, 0, w, h);
  const bh = 22;
  const bw = 58;
  const colours = ['#8f5a47', '#9d6a55', '#7c4e40', '#6f645c', '#857a70', '#a0735c'];
  for (let y = 0, row = 0; y < h; y += bh, row += 1) {
    for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
      ctx.fillStyle = colours[Math.floor(rand() * colours.length)];
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
  // Soot and old plaster ground into the brick
  ctx.fillStyle = 'rgba(70, 66, 62, 0.42)';
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, rand, '#2a2622', (w * h) / 60);
}

function plaster(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  ctx.fillStyle = '#dcd5c7';
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, rand, '#6e6558', (w * h) / 90);
}

interface Flap {
  x: number;
  y: number;
  /** Which way it hangs, into the hole */
  dir: number;
  w: number;
  len: number;
  phase: number;
  speed: number;
  /** Scroll progress past which it lets go */
  lets: number;
  seed: number;
  fall: { x: number; y: number; vx: number; vy: number; rot: number; vr: number } | null;
}

/**
 * Chapter II's text slot: an old wall with years of paper on it, torn
 * through in places down to the plaster and the brick, and the words are
 * what someone wrote there. The wall itself is still; only the loose scraps
 * at the edges of the tears move, and the scroll shakes them free.
 */
export function WordGridScene({ chapter, index }: WordGridSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start end', 'end start'] });

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const wall = document.createElement('canvas');
    const wctx = wall.getContext('2d');
    if (!wctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let flaps: Flap[] = [];

    const layer = (fill: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement('canvas');
      c.width = wall.width;
      c.height = wall.height;
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      fill(g);
      return c;
    };

    /** Lays one layer inside a torn outline, with the edge above it lifting */
    const reveal = (below: HTMLCanvasElement, outline: Point[]) => {
      wctx.save();
      trace(wctx, outline);
      wctx.clip();
      wctx.drawImage(below, 0, 0, width, height);
      // The layer above casts a thin shadow onto what it no longer covers
      wctx.strokeStyle = 'rgba(40, 30, 20, 0.5)';
      wctx.lineWidth = 8;
      wctx.filter = 'blur(3px)';
      trace(wctx, outline);
      wctx.stroke();
      wctx.filter = 'none';
      wctx.restore();
      // And its torn edge shows the pale core of the paper
      wctx.strokeStyle = 'rgba(245, 238, 222, 0.9)';
      wctx.lineWidth = 1.6;
      trace(wctx, outline);
      wctx.stroke();
    };

    const build = () => {
      const rand = rng(0.2026);
      const floral = wctx.createPattern(floralTile(rand), 'repeat')!;
      const geo = wctx.createPattern(geoTile(), 'repeat')!;
      const brickLayer = layer((g) => bricks(g, width, height, rand));
      const plasterLayer = layer((g) => plaster(g, width, height, rand));
      const geoLayer = layer((g) => {
        g.fillStyle = geo;
        g.fillRect(0, 0, width, height);
        grain(g, width, height, rand, '#5a5040', (width * height) / 200);
      });

      wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wctx.fillStyle = floral;
      wctx.fillRect(0, 0, width, height);

      // Damp and years: the top paper yellowed in patches
      for (let s = 0; s < 9; s += 1) {
        const x = rand() * width;
        const y = rand() * height;
        const r = 80 + rand() * 220;
        const stain = wctx.createRadialGradient(x, y, 0, x, y, r);
        stain.addColorStop(0, 'rgba(150, 115, 60, 0.3)');
        stain.addColorStop(1, 'rgba(150, 115, 60, 0)');
        wctx.fillStyle = stain;
        wctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      const holes = width > height ? WIDE : TALL;
      const near = (x: number, y: number, pad: number) =>
        holes.some(
          (h) =>
            Math.hypot((x - h.c[0] * width) / (h.r[0] * width + pad), (y - h.c[1] * height) / (h.r[1] * height + pad)) < 1,
        );

      // Where only the newer papers have gone: big pale plaster, smaller geometrics
      for (let p = 0; p < 16; p += 1) {
        const x = rand() * width;
        const y = rand() * height;
        const r = 18 + rand() * 90;
        if (near(x, y, r)) continue;
        reveal(rand() < 0.45 ? geoLayer : plasterLayer, torn(x, y, r * (0.7 + rand() * 1.2), r, rand));
      }

      flaps = [];
      for (const h of holes) {
        const cx = h.c[0] * width;
        const cy = h.c[1] * height;
        const rx = h.r[0] * width;
        const ry = h.r[1] * height;
        const outer = torn(cx, cy, rx * 1.3, ry * 1.25, rand);
        const mid = torn(cx, cy, rx * 1.1, ry * 1.08, rand);
        const inner = torn(cx, cy, rx * 0.95, ry * 0.95, rand, 0.22);
        reveal(geoLayer, outer);
        reveal(plasterLayer, mid);
        reveal(brickLayer, inner);

        // Each word painted on its own raised strip of plaster, over the brick
        const lines = h.words.map((w) => texts.wordGrid[w].toUpperCase());
        const longest = Math.max(...lines.map((l) => l.length));
        const size = Math.min((ry * 1.3) / lines.length, (rx * 1.4) / (longest * 0.62), 60);
        lines.forEach((line, i) => {
          const y = cy + (i - (lines.length - 1) / 2) * size * 1.12;
          const x = cx + (rand() - 0.5) * size * 0.3;
          const halfW = (line.length * size * 0.62) / 2 + size * 0.45;
          reveal(plasterLayer, plaque(x, y, halfW, size * 0.5, rand));
          wctx.save();
          wctx.translate(x, y);
          wctx.rotate((rand() - 0.5) * 0.04);
          wctx.font = `700 ${size * 0.82}px 'IBM Plex Mono', monospace`;
          wctx.textAlign = 'center';
          wctx.textBaseline = 'middle';
          wctx.fillStyle = 'rgba(36, 30, 26, 0.88)';
          wctx.fillText(line, 0, size * 0.04);
          wctx.restore();
        });

        // Loose scraps of the top paper, hanging off the edge of the tear
        const small = width < 768;
        const count = Math.round(outer.length / (small ? 26 : 12));
        for (let f = 0; f < count; f += 1) {
          const [x, y] = outer[Math.floor(rand() * outer.length)];
          flaps.push({
            x,
            y,
            dir: Math.atan2(cy - y, cx - x) + (rand() - 0.5) * 0.9,
            w: (small ? 7 : 10) + rand() * (small ? 12 : 24),
            len: (small ? 8 : 12) + rand() * (small ? 18 : 38),
            phase: rand() * Math.PI * 2,
            speed: 0.6 + rand() * 1.1,
            lets: 0.32 + rand() * 0.34,
            seed: rand(),
            fall: null,
          });
        }
      }

      // Grime over everything, darker to the corners
      const vig = wctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.75,
      );
      vig.addColorStop(0, 'rgba(40, 30, 20, 0)');
      vig.addColorStop(1, 'rgba(40, 30, 20, 0.45)');
      wctx.fillStyle = vig;
      wctx.fillRect(0, 0, width, height);
    };

    const resize = () => {
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      for (const c of [canvas, wall]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    /** A scrap is seen from its back: the pale side, curling towards us */
    const drawFlap = (f: Flap, x: number, y: number, angle: number, curl: number) => {
      const r = rng(f.seed);
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const tx = -sa;
      const ty = ca;
      const L = f.len * curl;
      const tip: Point[] = [];
      const teeth = 4;
      for (let k = 0; k <= teeth; k += 1) {
        const u = k / teeth - 0.5;
        const reach = L * (0.55 + r() * 0.45);
        tip.push([x + tx * f.w * u * 0.8 + ca * reach, y + ty * f.w * u * 0.8 + sa * reach]);
      }
      const shape: Point[] = [[x - tx * f.w * 0.5, y - ty * f.w * 0.5], ...tip, [x + tx * f.w * 0.5, y + ty * f.w * 0.5]];

      ctx.save();
      ctx.translate(3, 4);
      ctx.fillStyle = 'rgba(30, 20, 10, 0.3)';
      trace(ctx, shape);
      ctx.fill();
      ctx.restore();

      const shade = ctx.createLinearGradient(x, y, x + ca * L, y + sa * L);
      shade.addColorStop(0, '#cbbfa5');
      shade.addColorStop(1, '#f2ecdf');
      ctx.fillStyle = shade;
      trace(ctx, shape);
      ctx.fill();
    };

    let raf = 0;
    let last = scrollYProgress.get();
    let shake = 0;
    let drewStill = false;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const t = ms / 1000;
      const p = scrollYProgress.get();
      const dp = p - last;
      last = p;
      // Scrolling shakes the scraps; they settle again when it stops
      shake = Math.min(1.4, shake * 0.94 + Math.abs(dp) * 40);

      if (reduced) {
        if (drewStill) return;
        drewStill = true;
      }

      for (const f of flaps) {
        if (!f.fall && p > f.lets && !reduced) {
          f.fall = { x: f.x, y: f.y, vx: (Math.random() - 0.5) * 30, vy: -10, rot: 0, vr: (Math.random() - 0.5) * 3 };
        } else if (f.fall && p < f.lets - 0.04) {
          f.fall = null;
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(wall, 0, 0, width, height);

      const dt = 1 / 60;
      for (const f of flaps) {
        if (f.fall) {
          const q = f.fall;
          if (q.y > height + 60) continue;
          q.vy += 520 * dt;
          q.vx *= 0.99;
          q.x += q.vx * dt + Math.sin(t * 3 + f.phase) * 0.6;
          q.y += q.vy * dt;
          q.rot += q.vr * dt;
          drawFlap(f, q.x, q.y, f.dir + q.rot, 0.7 + 0.3 * Math.cos(t * 5 + f.phase));
          continue;
        }
        const sway = reduced ? 0 : Math.sin(t * f.speed + f.phase) * (0.08 + shake * 0.35);
        const curl = reduced ? 0.85 : 0.75 + 0.25 * Math.cos(t * f.speed * 0.7 + f.phase);
        drawFlap(f, f.x, f.y, f.dir + sway, curl);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [onScreen, scrollYProgress]);

  const words = Array.from(new Set(Object.values(texts.wordGrid))).join(', ');

  return (
    <section
      ref={sceneRef}
      id={`chapter-${chapter}-grid`}
      className="relative w-full h-full"
      aria-label={`Capítulo ${chapter}: ${words}`}
    >
      <div ref={hostRef} className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2" aria-hidden="true">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
      <p className="absolute bottom-6 left-6 sm:left-10 z-10 text-[10px] font-editorial-mono uppercase tracking-[0.3em] text-[#3a332c] select-none wall-label">
        {label(texts.labels.gridEdge, { n: pad(index + 1), chapter })}
      </p>
    </section>
  );
}
