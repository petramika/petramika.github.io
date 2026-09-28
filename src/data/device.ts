/** Opened inside another app's browser (Instagram, Facebook, TikTok…), which has far less to spend on painting */
/** `?inapp` in the address forces it, to preview on a normal browser */
export const FORCE_IN_APP = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('inapp');

export const IN_APP =
  FORCE_IN_APP ||
  (typeof navigator !== 'undefined' &&
    /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest/i.test(navigator.userAgent));

/** Canvas resolution: full on a real browser, one to one inside an app */
export function canvasDpr(width: number): number {
  if (IN_APP) return 1;
  return Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
}
