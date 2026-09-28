import { useState } from 'react';

const KEY = 'rota_in_app_continue';

const ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** Chrome on Android takes an intent link; iOS apps block every way out, so there it is left to the reader */
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
  const [copied, setCopied] = useState(false);

  const stay = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // private mode: it asks again next time
    }
    onStay();
  };

  const copy = async () => {
    const url = window.location.href.replace(/[?&]inapp\b/, '');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement('textarea');
      field.value = url;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
  };

  return (
    <>
      {!ANDROID && (
        <div className="fixed right-5 top-3 flex flex-col items-end font-editorial-mono text-[#f4f4f5]">
          <span className="text-3xl leading-none">↗</span>
        </div>
      )}
      <div className="flex max-w-xs flex-col items-center gap-4 text-center font-editorial-mono text-[11px] uppercase tracking-[0.2em] text-[#d4d4d8]">
        <p className="leading-relaxed">Para una mejor experiencia usa el navegador</p>
        {ANDROID ? (
          <a href={androidUrl()} className="rounded-full bg-[#f4f4f5] px-5 py-2.5 text-[#0a0a0c]">
            Abrir en el navegador
          </a>
        ) : (
          <>
            <p className="leading-relaxed text-[#a1a1aa]">Toca ··· arriba y elige abrir en el navegador</p>
            <button type="button" onClick={copy} className="rounded-full bg-[#f4f4f5] px-5 py-2.5 text-[#0a0a0c]">
              {copied ? 'Copiado · pégalo en Safari' : 'Copiar enlace'}
            </button>
          </>
        )}
        <button type="button" onClick={stay} className="text-[#8a8a93] underline underline-offset-4">
          Verla aquí igualmente
        </button>
      </div>
    </>
  );
}
