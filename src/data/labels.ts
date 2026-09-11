import texts from './texts.json';

/**
 * Fills the placeholders in a label template from texts.json, so the editorial
 * furniture down the edges of the essay is copy that can be rewritten rather
 * than strings buried in markup. Unknown keys are left visible on purpose: a
 * stray {chapter} in the corner says the template is wrong, where an empty gap
 * would just look like a design decision.
 */
export function label(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** Chapter numbers read as 01, 02 … all the way down the margins */
export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export const YEAR = new Date().getFullYear();

export { texts };
