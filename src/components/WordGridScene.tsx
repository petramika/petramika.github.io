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
  word: Word;
  /** How far down it goes: 1, 2 or 3 layers under the top one */
  depth: 1 | 2 | 3;
  /** Relative size of the lettering, and whether it is shouted */
  scale: number;
  upper: boolean;
}

const WIDE: Hole[] = [
  { c: [0.5, 0.42], r: [0.13, 0.14], word: 'trauma', depth: 3, scale: 1.3, upper: true },
  { c: [0.53, 0.78], r: [0.09, 0.1], word: 'dolor', depth: 3, scale: 1, upper: false },
  { c: [0.2, 0.25], r: [0.08, 0.09], word: 'miedo', depth: 2, scale: 0.8, upper: false },
  { c: [0.82, 0.3], r: [0.1, 0.1], word: 'mentiras', depth: 1, scale: 0.9, upper: true },
  { c: [0.15, 0.66], r: [0.07, 0.09], word: 'rabia', depth: 3, scale: 1.1, upper: true },
  { c: [0.82, 0.72], r: [0.08, 0.09], word: 'queja', depth: 2, scale: 0.7, upper: false },
  { c: [0.31, 0.86], r: [0.07, 0.07], word: 'apegos', depth: 1, scale: 0.75, upper: false },
];

const TALL: Hole[] = [
  { c: [0.5, 0.31], r: [0.3, 0.075], word: 'trauma', depth: 3, scale: 1.3, upper: true },
  { c: [0.28, 0.13], r: [0.2, 0.045], word: 'miedo', depth: 2, scale: 0.8, upper: false },
  { c: [0.74, 0.19], r: [0.2, 0.04], word: 'apegos', depth: 1, scale: 0.75, upper: false },
  { c: [0.68, 0.47], r: [0.27, 0.05], word: 'mentiras', depth: 1, scale: 0.9, upper: true },
  { c: [0.35, 0.63], r: [0.25, 0.06], word: 'dolor', depth: 3, scale: 1, upper: false },
  { c: [0.72, 0.76], r: [0.2, 0.045], word: 'rabia', depth: 3, scale: 1.1, upper: true },
  { c: [0.3, 0.87], r: [0.2, 0.045], word: 'queja', depth: 2, scale: 0.7, upper: false },
];

/** One colour range per layer, from the surface down to the deepest */
const GRADIENTS = [
  ['#f3c9b0', '#f0a7a0', '#f6dcb4', '#e9b7c9'],
  ['#9fd3c7', '#7fb3d9', '#b8a6e0', '#c7e2b2'],
  ['#f2e6d0', '#e8d6f0', '#d9ecf2', '#f7ddc9'],
  ['#3b2a6b', '#7a2e6e', '#1f4f7a', '#a13d5a'],
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

function torn(cx: number, cy: number, rx: number, ry: number, rand: () => number, rough = 0.36): Point[] {
  const pts: Point[] = [];
  const n = 9;
  for (let k = 0; k < n; k += 1) {
    const a = (k / n) * Math.PI * 2;
    const r = 0.74 + rand() * 0.42;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return deform(pts, 5, rough, rand);
}

function trace(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function surface(w: number, h: number, dpr: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, g };
}

/** Soft mottling: random values at a coarse grid, smoothed by scaling up */
function mottle(g: CanvasRenderingContext2D, w: number, h: number, cell: number, alpha: number, rand: () => number) {
  const nw = Math.max(2, Math.ceil(w / cell));
  const nh = Math.max(2, Math.ceil(h / cell));
  const n = document.createElement('canvas');
  n.width = nw;
  n.height = nh;
  const ng = n.getContext('2d')!;
  const img = ng.createImageData(nw, nh);
  for (let i = 0; i < nw * nh; i += 1) {
    const v = Math.floor(rand() * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ng.putImageData(img, 0, 0);
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'overlay';
  g.imageSmoothingEnabled = true;
  g.drawImage(n, 0, 0, w, h);
  g.restore();
}

/** Photographic grain: fine noise at close to pixel size, multiplied in */
function grainy(g: CanvasRenderingContext2D, w: number, h: number, alpha: number, rand: () => number) {
  const nw = Math.ceil(w / 2);
  const nh = Math.ceil(h / 2);
  const n = document.createElement('canvas');
  n.width = nw;
  n.height = nh;
  const ng = n.getContext('2d')!;
  const img = ng.createImageData(nw, nh);
  for (let i = 0; i < nw * nh; i += 1) {
    const v = 150 + Math.floor(rand() * 105);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ng.putImageData(img, 0, 0);
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'multiply';
  g.drawImage(n, 0, 0, w, h);
  g.restore();
}

/** A layer of soft colour: a few large washes laid over each other */
function gradientLayer(w: number, h: number, dpr: number, rand: () => number, colours: string[]) {
  const { c, g } = surface(w, h, dpr);
  const base = g.createLinearGradient(0, 0, w, h);
  colours.forEach((col, k) => base.addColorStop(k / (colours.length - 1), col));
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.filter = 'blur(30px)';
  for (let k = 0; k < 7; k += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = Math.max(w, h) * (0.15 + rand() * 0.35);
    const wash = g.createRadialGradient(x, y, 0, x, y, r);
    wash.addColorStop(0, colours[Math.floor(rand() * colours.length)]);
    wash.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.globalAlpha = 0.55 + rand() * 0.35;
    g.fillStyle = wash;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
  g.filter = 'none';
  mottle(g, w, h, 70, 0.18, rand);
  grainy(g, w, h, 0.12, rand);
  return c;
}

/** A lifted piece of the edge, hanging off a tear */
interface Lip {
  hole: number;
  at: number;
  span: number;
  len: number;
  phase: number;
  speed: number;
}

/**
 * Chapter II's text slot: an old wall with years of paper on it, torn
 * through in places — to the older paper, the plaster or the brick — and
 * the words are what someone wrote there. The wall is still; only the torn
 * edges stir, a little more while the page is scrolling.
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let wall: HTMLCanvasElement | null = null;
    let edges: { pts: Point[]; sign: number }[] = [];
    let lips: Lip[] = [];

    const build = () => {
      const rand = rng(0.2026);
      const { c, g } = surface(width, height, dpr);
      const layers = GRADIENTS.map((colours) => gradientLayer(width, height, dpr, rand, colours));
      // The ground everything else is torn from
      g.drawImage(layers[2], 0, 0, width, height);

      /** Paper still stuck to the wall: a ring of old glue, a shadow, a pale torn edge */
      const paste = (paper: HTMLCanvasElement, outline: Point[]) => {
        g.save();
        g.filter = 'blur(6px)';
        g.strokeStyle = 'rgba(160, 115, 50, 0.22)';
        g.lineWidth = 16;
        trace(g, outline);
        g.stroke();
        g.filter = 'blur(2px)';
        g.strokeStyle = 'rgba(40, 28, 15, 0.35)';
        g.lineWidth = 4;
        trace(g, outline);
        g.stroke();
        g.filter = 'none';
        trace(g, outline);
        g.clip();
        g.drawImage(paper, 0, 0, width, height);
        g.restore();
        g.strokeStyle = 'rgba(246, 240, 226, 0.85)';
        g.lineWidth = 1.4;
        trace(g, outline);
        g.stroke();
      };

      /** A deeper layer inside a torn outline, shaded by what is left above */
      const reveal = (deeper: HTMLCanvasElement, outline: Point[], lip: string, lipWidth: number) => {
        g.save();
        trace(g, outline);
        g.clip();
        g.drawImage(deeper, 0, 0, width, height);
        g.strokeStyle = 'rgba(25, 18, 10, 0.6)';
        g.lineWidth = 12;
        g.filter = 'blur(5px)';
        trace(g, outline);
        g.stroke();
        g.filter = 'none';
        g.restore();
        g.strokeStyle = lip;
        g.lineWidth = lipWidth;
        trace(g, outline);
        g.stroke();
      };

      edges = [];
      lips = [];
      const addLips = (outline: Point[], sign: number, every: number) => {
        const edge = edges.length;
        edges.push({ pts: outline, sign });
        const count = Math.round(outline.length / every);
        for (let k = 0; k < count; k += 1) {
          lips.push({
            hole: edge,
            at: Math.floor(rand() * outline.length),
            span: 3 + Math.floor(rand() * 5),
            len: 3 + rand() * (width < 768 ? 6 : 11),
            phase: rand() * Math.PI * 2,
            speed: 0.5 + rand() * 0.9,
          });
        }
      };

      const holes = width > height ? WIDE : TALL;
      const small = width < 768;

      // The newest paper survives mostly along the top, torn off below
      const band: Point[] = [[width + 30, -30], [-30, -30]];
      const steps = 14;
      for (let k = 0; k <= steps; k += 1) {
        band.push([-30 + ((width + 60) * k) / steps, height * (0.14 + rand() * 0.24)]);
      }
      const bandShape = deform(band, 4, 0.3, rand);
      paste(layers[0], bandShape);
      addLips(bandShape, -1, small ? 50 : 30);

      // Remnants lower down: big scraps of the flowered paper, smaller of the geometric
      for (let p = 0; p < 7; p += 1) {
        const r = 50 + rand() * 150;
        const shape = torn(rand() * width, height * (0.3 + rand() * 0.75), r * (0.5 + rand()), r, rand, 0.42);
        paste(layers[rand() < 0.6 ? 0 : 1], shape);
        addLips(shape, -1, small ? 60 : 40);
      }
      for (let p = 0; p < 7; p += 1) {
        const r = 25 + rand() * 70;
        paste(layers[1], torn(rand() * width, rand() * height, r * (0.6 + rand()), r, rand, 0.42));
      }

      holes.forEach((h) => {
        const cx = h.c[0] * width;
        const cy = h.c[1] * height;
        const rx = h.r[0] * width;
        const ry = h.r[1] * height;
        const outer = torn(cx, cy, rx * 1.35, ry * 1.3, rand, 0.4);
        const inner = torn(cx, cy, rx * 1.05, ry * 1.02, rand, 0.3);
        // Every tear is through paper first
        paste(layers[0], torn(cx, cy, rx * 1.6, ry * 1.55, rand, 0.4));
        if (h.depth === 1) {
          reveal(layers[1], outer, 'rgba(246, 240, 226, 0.85)', 1.4);
        } else {
          reveal(layers[2], outer, 'rgba(246, 240, 226, 0.85)', 1.4);
          if (h.depth === 3) reveal(layers[3], inner, 'rgba(214, 205, 190, 0.9)', 4);
        }
        addLips(outer, 1, small ? 40 : 24);

        const line = h.upper ? texts.wordGrid[h.word].toUpperCase() : texts.wordGrid[h.word];
        const size = Math.min((rx * 1.2) / (line.length * 0.62), ry * 0.7, small ? 22 : 34) * h.scale;
        const x = cx + (rand() - 0.5) * size * 0.4;
        const tw = line.length * size * 0.62;
        // On the deepest layer the ink would vanish, so it is written light there
        const ink = h.depth === 3 ? 'rgba(250, 244, 236, 0.9)' : 'rgba(30, 25, 22, 0.85)';
        const { c: word, g: wg } = surface(width, height, dpr);
        wg.translate(x, cy);
        wg.rotate((rand() - 0.5) * 0.08);
        wg.font = `500 ${size}px 'IBM Plex Mono', monospace`;
        wg.textAlign = 'center';
        wg.textBaseline = 'middle';
        wg.fillStyle = ink;
        wg.fillText(line, 0, 0);
        wg.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Paint that has flaked off with the wall
        wg.globalCompositeOperation = 'destination-out';
        for (let k = 0; k < tw * 1.2; k += 1) {
          wg.globalAlpha = 0.3 + rand() * 0.6;
          wg.beginPath();
          wg.arc(x + (rand() - 0.5) * tw, cy + (rand() - 0.5) * size, 0.3 + rand() * 1.1, 0, Math.PI * 2);
          wg.fill();
        }
        g.drawImage(word, 0, 0, width, height);
      });

      grainy(g, width, height, 0.1, rand);
      const vig = g.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.75,
      );
      vig.addColorStop(0, 'rgba(30, 22, 14, 0)');
      vig.addColorStop(1, 'rgba(30, 22, 14, 0.5)');
      g.fillStyle = vig;
      g.fillRect(0, 0, width, height);
      wall = c;
    };

    const resize = () => {
      width = host.clientWidth || 1200;
      height = host.clientHeight || 800;
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    /** The lifted edge: a sliver of the paper's pale back, bending into the hole */
    const drawLip = (lip: Lip, lift: number) => {
      const { pts: edge, sign } = edges[lip.hole];
      const n = edge.length;
      const pts: Point[] = [];
      for (let k = 0; k <= lip.span; k += 1) pts.push(edge[(lip.at + k) % n]);
      const a = pts[0];
      const b = pts[pts.length - 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      // Inwards is to the right of the outline's direction of travel
      const nx = (-dy / len) * sign;
      const ny = (dx / len) * sign;
      const reach = lip.len * lift;
      const inner = pts
        .slice()
        .reverse()
        .map(([x, y], k, arr): Point => {
          const u = Math.sin((Math.PI * k) / (arr.length - 1));
          return [x + nx * reach * u, y + ny * reach * u];
        });
      const shape = [...pts, ...inner];
      ctx.save();
      ctx.translate(1.5, 2);
      ctx.fillStyle = 'rgba(20, 12, 5, 0.3)';
      trace(ctx, shape);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(232, 224, 206, 0.95)';
      trace(ctx, shape);
      ctx.fill();
    };

    let raf = 0;
    let last = scrollYProgress.get();
    let shake = 0;
    let drewStill = false;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen.current || !wall) return;
      if (reduced && drewStill) return;
      const t = ms / 1000;
      const p = scrollYProgress.get();
      shake = Math.min(1, shake * 0.93 + Math.abs(p - last) * 30);
      last = p;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(wall, 0, 0, width, height);
      for (const lip of lips) {
        const breathe = reduced ? 0.6 : 0.55 + 0.25 * Math.sin(t * lip.speed + lip.phase);
        drawLip(lip, breathe + shake * 0.6 * Math.sin(t * 9 + lip.phase));
      }
      drewStill = true;
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
      <p className="wall-label absolute bottom-6 left-6 sm:left-10 z-10 text-[10px] font-editorial-mono uppercase tracking-[0.3em] text-[#e9e2d4] select-none">
        {label(texts.labels.gridEdge, { n: pad(index + 1), chapter })}
      </p>
    </section>
  );
}
