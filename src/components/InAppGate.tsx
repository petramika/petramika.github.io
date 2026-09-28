import { useState } from 'react';

const KEY = 'rota_in_app_continue';

/** Where the button tries to send the reader: Chrome on Android, Safari on iOS */
function outsideUrl(): string | null {
  const { host, pathname, search, hash } = window.location;
  const rest = `${host}${pathname}${search}${hash}`;
  if (/Android/i.test(navigator.userAgent)) {
    return `intent://${rest}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
  }
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return `x-safari-https://${rest}`;
  return null;
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
  const [tried, setTried] = useState(false);
  const target = outsideUrl();

  const stay = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // private mode: it asks again next time
    }
    onStay();
  };

  return (
    <div className="flex max-w-xs flex-col items-center gap-4 text-center font-editorial-mono text-[11px] uppercase tracking-[0.2em] text-[#d4d4d8]">
      <p className="leading-relaxed">
        {tried || !target
          ? 'Si no se abre: toca ··· arriba y elige abrir en el navegador'
          : 'Esta web se ve mejor en tu navegador'}
      </p>
      {target && (
        <a
          href={target}
          onClick={() => window.setTimeout(() => setTried(true), 1200)}
          className="rounded-full bg-[#f4f4f5] px-5 py-2.5 text-[#0a0a0c]"
        >
          Abrir en el navegador
        </a>
      )}
      <button type="button" onClick={stay} className="text-[#8a8a93] underline underline-offset-4">
        Verla aquí igualmente
      </button>
    </div>
  );
}
