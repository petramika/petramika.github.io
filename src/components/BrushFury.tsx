import { useEffect, useRef } from 'react';
import { useOnScreen } from '../hooks/useOnScreen';
import texts from '../data/texts.json';

const WORDS = Object.values(texts.brain);
/** Glazes stacked to build one wash; each is a slightly different deformation */
const GLAZES = 40;
const DRAW_S = 0.55;
const HOLD_S = 0.8;
const FADE_S = 3;
/** How much of a stroke is left in the ground once it has settled */
const SETTLED = 0.4;

/* The canvas is re-inverted in negative mode, so each mode names what it shows */
const PALETTES = {
  light: {
    paint: [['#c9577a', '#8a5fb8'], ['#c46a3c', '#d6a24a'], ['#4f73a6', '#94789f'], ['#6f9a86', '#4a8a9e']],
    ink: '#141518',
  },
  dark: {
    paint: [['#e27aa0', '#a684d6'], ['#e08a5c', '#e8bd6a'], ['#7d9ed0', '#b99ac4'], ['#8fbca6', '#72b3c6']],
    ink: '#f3f1ec',
  },
};

type Point = [number, number];

type Stroke = {
  born: number;
  colour: string;
  second: string;
  word: string;
  wordSize: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
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

/** A pool of water: roughly an oval, never quite one */
function poolOutline(cx: number, cy: number, rx: number, ry: number, angle: number, rand: () => number): Point[] {
  const pts: Point[] = [];
  const n = 11;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  for (let k = 0; k < n; k += 1) {
    const a = (k / n) * Math.PI * 2;
    const r = 0.72 + rand() * 0.45;
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    pts.push([cx + x * c - y * sn, cy + x * sn + y * c]);
  }
  return pts;
}

function insidePool(s: Stroke, x: number, y: number) {
  const dx = x - s.cx;
  const dy = y - s.cy;
  const c = Math.cos(-s.angle);
  const sn = Math.sin(-s.angle);
  const u = (dx * c - dy * sn) / s.rx;
  const v = (dx * sn + dy * c) / s.ry;
  return u * u + v * v;
}

/** A small wash with a darker rim, which is what makes a drop read as a drop */
function drop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rand: () => number) {
  const blob = poolOutline(x, y, r, r * (0.8 + rand() * 0.3), rand() * Math.PI, rand);
  for (let g = 0; g < 7; g += 1) {
    ctx.globalAlpha = 0.05;
    fillShape(ctx, deform(blob, 3, 0.2, rand));
  }
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 0.9;
  const rim = deform(blob, 3, 0.12, rand);
  ctx.beginPath();
  ctx.moveTo(rim[0][0], rim[0][1]);
  for (let i = 1; i < rim.length; i += 1) ctx.lineTo(rim[i][0], rim[i][1]);
  ctx.closePath();
  ctx.stroke();
}

/** Paints the whole wash once, into its own layer */
function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, ink: string) {
  const rand = rng(s.seed);
  const base = deform(poolOutline(s.cx, s.cy, s.rx, s.ry, s.angle, rand), 3, 0.2, rand);

  // Two colours dropped into the same wet patch, each from its own side
  const shift = s.rx * 0.28;
  const ox = Math.cos(s.angle) * shift;
  const oy = Math.sin(s.angle) * shift;
  for (let g = 0; g < GLAZES; g += 1) {
    const first = g % 2 === 0;
    ctx.fillStyle = first ? s.colour : s.second;
    const k = first ? -1 : 1;
    const layer = deform(base, 2, 0.2 + rand() * 0.18, rand).map(
      ([x, y]): Point => [x + ox * k * rand(), y + oy * k * rand()],
    );
    ctx.globalAlpha = 0.012 + rand() * 0.014;
    fillShape(ctx, layer);
  }

  const trace = (pts: Point[]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };

  // The brush runs out of water as it goes: pale and wet where it landed,
  // even and fuller where it was drier
  const c = Math.cos(s.angle);
  const sn = Math.sin(s.angle);
  const [r, g, b] = [1, 3, 5].map((o) => parseInt(s.colour.slice(o, o + 2), 16));
  const body = ctx.createLinearGradient(s.cx - c * s.rx, s.cy - sn * s.rx, s.cx + c * s.rx, s.cy + sn * s.rx);
  body.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.04)`);
  body.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.16)`);
  body.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.34)`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = body;
  trace(deform(base, 1, 0.05, rand));
  ctx.fill();

  ctx.save();
  trace(base);
  ctx.clip();

  // Back-runs on the wet side: water pushed the pigment out into a pale
  // patch and left it piled at the patch's own edge
  for (let k = 0; k < 3; k += 1) {
    const t = -0.2 - rand() * 0.5;
    const x = s.cx + c * s.rx * t + (rand() - 0.5) * s.ry * 0.6 * -sn;
    const y = s.cy + sn * s.rx * t + (rand() - 0.5) * s.ry * 0.6 * c;
    const patch = deform(poolOutline(x, y, s.ry * (0.25 + rand() * 0.25), s.ry * (0.2 + rand() * 0.2), rand() * Math.PI, rand), 3, 0.22, rand);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.35;
    trace(patch);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = s.colour;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1.4;
    trace(patch);
    ctx.stroke();
  }

  // Pigment carried out to the rim as the pool dries: dark at the edge,
  // bleeding back inwards. Clipped, so it only ever darkens the inside
  ctx.strokeStyle = s.colour;
  ctx.lineJoin = 'round';
  const rings: [number, number][] = [[18, 0.03], [11, 0.05], [6, 0.08], [3, 0.14], [1.4, 0.26]];
  for (const [w, a] of rings) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    trace(base);
    ctx.stroke();
  }
  ctx.restore();

  // Salt: little starbursts where the crystals drank the pigment back out
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineCap = 'round';
  const salt = Math.round(((s.rx * s.ry) / 1400) * (0.6 + rand() * 0.6));
  for (let k = 0; k < salt; k += 1) {
    const x = s.cx + (rand() * 2 - 1) * s.rx;
    const y = s.cy + (rand() * 2 - 1) * s.rx;
    const d = insidePool(s, x, y);
    if (d > 0.8) continue;
    const size = 2 + rand() * 6 * (1 - d * 0.5);
    ctx.globalAlpha = 0.4 + rand() * 0.35;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    const arms = 6 + Math.floor(rand() * 4);
    for (let a = 0; a < arms; a += 1) {
      const t = (a / arms) * Math.PI * 2 + rand() * 0.4;
      const l = size * (0.6 + rand() * 0.6);
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Granulation: pigment that settled into the tooth of the paper
  ctx.fillStyle = s.second;
  for (let k = 0; k < salt * 0.6; k += 1) {
    const x = s.cx + (rand() * 2 - 1) * s.rx;
    const y = s.cy + (rand() * 2 - 1) * s.rx;
    if (insidePool(s, x, y) > 0.85) continue;
    ctx.globalAlpha = 0.25 + rand() * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + rand() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drops that fell off the brush around it
  ctx.fillStyle = s.colour;
  ctx.strokeStyle = s.colour;
  const drops = 5 + Math.floor(rand() * 8);
  for (let d = 0; d < drops; d += 1) {
    const a = rand() * Math.PI * 2;
    const far = 1.1 + rand() * rand() * 1.1;
    const x = s.cx + Math.cos(a) * s.rx * far;
    const y = s.cy + Math.sin(a) * s.ry * far;
    drop(ctx, x, y, 2 + rand() * rand() * s.ry * 0.16, rand);
  }

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(s.cx, s.cy);
  ctx.rotate(s.angle * 0.5);
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
      const rx = (small ? width * 0.3 : Math.min(width * 0.16, 260)) * (0.75 + Math.random() * 0.5);
      const stroke: Stroke = {
        born: now,
        colour: pal[colourIndex % pal.length][0],
        second: pal[colourIndex % pal.length][1],
        word: WORDS[wordIndex % WORDS.length],
        wordSize: small ? 30 : 44,
        cx: width * (0.12 + Math.random() * 0.76),
        cy: height * (0.15 + Math.random() * 0.7),
        rx,
        ry: rx * (0.55 + Math.random() * 0.3),
        seed: Math.random(),
        angle: (Math.random() - 0.5) * 0.9,
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

    /** Uncovers the wash from its middle outwards, the way water spreads */
    const reveal = (s: Stroke, reach: number) => {
      if (!s.layer) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.rx * 2.4 * reach, 0, Math.PI * 2);
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
