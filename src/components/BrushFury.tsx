import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';
import texts from '../data/texts.json';

const WORDS = Object.values(texts.brain);
/** Glazes stacked to build one wash; each is a slightly different deformation */
const GLAZES = 36;
const DRAW_S = 0.35;
const HOLD_S = 0.8;
const FADE_S = 3;
/** How much of a stroke is left in the ground once it has settled */
const SETTLED = 0.4;

/* The canvas is re-inverted in negative mode, so each mode names what it shows */
const PALETTES = {
  light: {
    paint: ['#d9412b', '#e9a23b', '#2f62c9', '#23906f', '#a8479f', '#1f7fa8'],
    ink: '#141518',
  },
  dark: {
    paint: ['#ff5a3c', '#ffb640', '#4f86ff', '#2fc08f', '#d45cc9', '#3fb6e8'],
    ink: '#f3f1ec',
  },
};

type Point = [number, number];

type Stroke = {
  born: number;
  colour: string;
  word: string;
  wordSize: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  seed: number;
  angle: number;
  layer?: HTMLCanvasElement;
  settled?: boolean;
};

function rng(seed: number) {
  let a = Math.floor(seed * 4294967296) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recursive midpoint displacement: what turns a polygon into a wet edge */
function deform(points: Point[], depth: number, spread: number, rand: () => number): Point[] {
  let pts = points;
  for (let d = 0; d < depth; d += 1) {
    const next: Point[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = (rand() + rand() + rand() - 1.5) * 0.8;
      next.push(a, [
        (a[0] + b[0]) / 2 + g * len * spread,
        (a[1] + b[1]) / 2 + (rand() + rand() + rand() - 1.5) * 0.8 * len * spread,
      ]);
    }
    pts = next;
  }
  return pts;
}

function fillShape(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** A band the brush lays down: straight-ish top and bottom, ragged at both ends */
function bandOutline(s: Stroke, rand: () => number): Point[] {
  const nx = -Math.sin(s.angle);
  const ny = Math.cos(s.angle);
  const half = s.width / 2;
  const along = (t: number, k: number): Point => [
    s.x0 + (s.x1 - s.x0) * t + nx * half * k,
    s.y0 + (s.y1 - s.y0) * t + ny * half * k,
  ];
  const top: Point[] = [];
  const bottom: Point[] = [];
  const n = 8;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    // The brush lifts at the tail, so the band narrows towards it
    const taper = 1 - t * 0.25;
    top.push(along(t, -taper * (0.9 + rand() * 0.15)));
    bottom.push(along(t, taper * (0.9 + rand() * 0.15)));
  }
  const tail = along(1.03 + rand() * 0.04, 0);
  const head = along(-0.02, 0);
  return [head, ...top, tail, ...bottom.reverse()];
}

/** Paints the whole stroke once, into its own layer */
function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, ink: string) {
  const rand = rng(s.seed);
  const base = deform(bandOutline(s, rand), 3, 0.22, rand);

  ctx.fillStyle = s.colour;
  for (let g = 0; g < GLAZES; g += 1) {
    ctx.globalAlpha = 0.018 + rand() * 0.018;
    fillShape(ctx, deform(base, 2, 0.2 + rand() * 0.14, rand));
  }

  // Pigment settles along the edge of a wash as the water dries back
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = s.colour;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = 'round';
  const rim = deform(base, 1, 0.08, rand);
  ctx.beginPath();
  ctx.moveTo(rim[0][0], rim[0][1]);
  for (let i = 1; i < rim.length; i += 1) ctx.lineTo(rim[i][0], rim[i][1]);
  ctx.closePath();
  ctx.stroke();

  // Drops that fell off the brush, each a small wash of its own
  const drops = 3 + Math.floor(rand() * 4);
  for (let d = 0; d < drops; d += 1) {
    const t = rand();
    const side = rand() < 0.5 ? -1 : 1;
    const off = s.width * (0.7 + rand() * 1.1) * side;
    const x = s.x0 + (s.x1 - s.x0) * t - Math.sin(s.angle) * off;
    const y = s.y0 + (s.y1 - s.y0) * t + Math.cos(s.angle) * off;
    const r = 2 + rand() * s.width * 0.12;
    const blob: Point[] = [];
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2;
      blob.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    for (let g = 0; g < 8; g += 1) {
      ctx.globalAlpha = 0.07;
      fillShape(ctx, deform(blob, 2, 0.25, rand));
    }
  }

  const wx = (s.x0 + s.x1) / 2;
  const wy = (s.y0 + s.y1) / 2;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(wx, wy);
  ctx.rotate(s.angle);
  ctx.font = `600 ${s.wordSize}px Caveat, 'Segoe Script', cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.fillText(s.word, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function BrushFury() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScreen = useOnScreen(hostRef);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ground = document.createElement('canvas');
    const gctx = ground.getContext('2d');
    if (!gctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Canvas blur is missing on older Safari; there the settling is alpha alone
    ctx.filter = 'blur(1px)';
    const canBlur = ctx.filter === 'blur(1px)';
    ctx.filter = 'none';

    let width = 0;
    let height = 0;
    let dpr = 1;
    let active: Stroke[] = [];
    let wordIndex = 0;
    let colourIndex = 0;
    let nextAt = 0;
    let mode: boolean | null = null;
    const pool: HTMLCanvasElement[] = [];

    const tone = () =>
      document.documentElement.classList.contains('negative-mode') ? PALETTES.dark : PALETTES.light;

    const makeStroke = (now: number): Stroke => {
      const pal = tone().paint;
      const small = width < 768;
      const len = width * (small ? 0.6 : 0.36) * (0.75 + Math.random() * 0.5);
      const angle = (Math.random() - 0.5) * 0.45;
      const mx = width * (0.15 + Math.random() * 0.7);
      const my = height * (0.15 + Math.random() * 0.7);
      const dx = (Math.cos(angle) * len) / 2;
      const dy = (Math.sin(angle) * len) / 2;
      const stroke: Stroke = {
        born: now,
        colour: pal[colourIndex % pal.length],
        word: WORDS[wordIndex % WORDS.length],
        wordSize: small ? 30 : 44,
        x0: mx - dx,
        y0: my - dy,
        x1: mx + dx,
        y1: my + dy,
        width: (small ? 46 : 80) * (0.7 + Math.random() * 0.6),
        seed: Math.random(),
        angle,
      };
      wordIndex += 1;
      colourIndex += 1 + Math.floor(Math.random() * 2);

      // Painted once, up front; the animation only uncovers it
      const layer = pool.pop() ?? document.createElement('canvas');
      layer.width = canvas.width;
      layer.height = canvas.height;
      const lctx = layer.getContext('2d');
      if (lctx) {
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lctx.clearRect(0, 0, width, height);
        paintStroke(lctx, stroke, tone().ink);
        stroke.layer = layer;
      }
      return stroke;
    };

    const settle = (s: Stroke) => {
      if (!s.layer) return;
      // Older paint sinks a little further each time a new layer goes down
      gctx.globalCompositeOperation = 'destination-out';
      gctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      gctx.fillRect(0, 0, width, height);
      gctx.globalCompositeOperation = 'source-over';
      if (canBlur) gctx.filter = 'blur(4px)';
      gctx.globalAlpha = SETTLED;
      gctx.drawImage(s.layer, 0, 0, width, height);
      gctx.globalAlpha = 1;
      gctx.filter = 'none';
      s.settled = true;
    };

    const seedGround = () => {
      gctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 5; i += 1) {
        const s = makeStroke(0);
        settle(s);
        if (s.layer) pool.push(s.layer);
      }
    };

    const resize = () => {
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      for (const c of [canvas, ground]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      active = [];
      mode = null;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    /** Uncovers the stroke along its own direction, as if the brush were passing */
    const reveal = (s: Stroke, reach: number) => {
      if (!s.layer) return;
      const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      ctx.save();
      ctx.translate(s.x0, s.y0);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.rect(-s.width, -s.width * 3, (len + s.width * 2) * reach, s.width * 6);
      ctx.restore();
      ctx.save();
      ctx.clip();
      ctx.drawImage(s.layer, 0, 0, width, height);
      ctx.restore();
    };

    let raf = 0;
    let idle = false;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current) return;
      const now = ms / 1000;
      const negative = document.documentElement.classList.contains('negative-mode');
      if (negative !== mode) {
        mode = negative;
        for (const s of active) if (s.layer) pool.push(s.layer);
        active = [];
        seedGround();
        nextAt = now + 0.3;
        idle = false;
      }
      if (reduced) {
        if (!idle) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(ground, 0, 0, width, height);
          idle = true;
        }
        return;
      }

      if (now >= nextAt) {
        active.push(makeStroke(now));
        nextAt = now + 1.3 + Math.random();
        idle = false;
      }
      if (idle) return;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(ground, 0, 0, width, height);

      const kept: Stroke[] = [];
      for (const s of active) {
        const age = now - s.born;
        if (age < DRAW_S) {
          const k = age / DRAW_S;
          reveal(s, 1 - (1 - k) ** 3);
          kept.push(s);
          continue;
        }
        // Its softened trace goes into the ground under the sharp one
        if (!s.settled) settle(s);
        const fading = Math.max(0, age - DRAW_S - HOLD_S) / FADE_S;
        if (fading >= 1) {
          if (s.layer) pool.push(s.layer);
          continue;
        }
        ctx.globalAlpha = 1 - fading * fading * (3 - 2 * fading);
        if (s.layer) ctx.drawImage(s.layer, 0, 0, width, height);
        ctx.globalAlpha = 1;
        kept.push(s);
      }
      active = kept;
      if (!active.length) idle = true;
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [onScreen]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
