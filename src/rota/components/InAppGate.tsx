const KEY = 'rota_in_app_continue';

const ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** Chrome on Android takes an intent link; iOS apps block every way out */
function androidUrl(): string {
  const { host, pathname, search, hash } = window.location;
  return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
}

/** Whether this reader already chose to stay in the app's browser */
export function choseToStay(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Shown on the closed curtain when the page is opened inside another app.
 * Written in its own colours: the curtain keeps them through the negative.
 */
export function InAppGate({ onStay }: { onStay: () => void }) {
  const stay = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // private mode: it asks again next time
    }
    onStay();
  };

  const message = 'Abrir en el navegador para una mejor experiencia :)';

  return (
    <div className="flex max-w-xs flex-col items-center gap-5 text-center font-editorial-mono text-[11px] uppercase tracking-[0.2em] text-[#d4d4d8]">
      {ANDROID ? (
        <a href={androidUrl()} className="leading-relaxed">
          {message}
        </a>
      ) : (
        <p className="leading-relaxed">{message}</p>
      )}
      <button type="button" onClick={stay} className="text-[#8a8a93] underline underline-offset-4">
        Verla aquí igualmente
      </button>
    </div>
  );
}
