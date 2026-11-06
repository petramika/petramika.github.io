/**
 * Twelve hues around the wheel, the only colour the essay allows itself
 * outside the dawn. The dust takes it over the orrery, and the orrery's own
 * core borrows it to hint that it can be pressed.
 */
export const WHEEL = [
  '150, 210, 0',
  '0, 175, 10',
  '0, 165, 140',
  '0, 175, 215',
  '50, 55, 215',
  '105, 45, 165',
  '155, 10, 165',
  '250, 0, 200',
  '255, 10, 95',
  '240, 0, 0',
  '255, 105, 0',
  '255, 200, 0',
];

/** Straight-line mix of two 'r, g, b' strings */
export function mix(a: string, b: string, k: number): string {
  const pa = a.split(',').map(Number);
  const pb = b.split(',').map(Number);
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(', ');
}

/**
 * What to write so a colour LOOKS like itself.
 *
 * Negative mode inverts the whole page, so anything drawn in SVG comes out
 * as its complement — a red would arrive on screen as cyan. Writing the
 * complement lets the page's own inversion put it back. Canvas does not need
 * this: every canvas is re-inverted by the stylesheet and keeps what it was
 * given.
 */
export function throughTheNegative(rgb: string, negative: boolean): string {
  if (!negative) return rgb;
  return rgb
    .split(',')
    .map((v) => 255 - Number(v))
    .join(', ');
}

/** The core's colour when it is not hinting at anything, as seen on screen */
export const RESTING_INK = { light: '20, 21, 24', dark: '235, 234, 231' };
