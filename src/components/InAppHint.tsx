import { useState } from 'react';

const KEY = 'rota_in_app_hint_closed';

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

/** A quiet note for readers who arrived through another app's browser */
export function InAppHint() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [tried, setTried] = useState(false);
  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // private mode: it just comes back next time
    }
  };

  const target = outsideUrl();

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border border-[#141518]/10 bg-[#fbfbfb]/95 px-4 py-2.5 text-[11px] font-editorial-mono uppercase tracking-[0.12em] text-[#52525b] shadow-sm">
      <span className="flex-1">
        {tried || !target ? 'Si no se abre: ··· → Abrir en navegador' : 'Se ve mejor en tu navegador'}
      </span>
      {target && !tried && (
        <a
          href={target}
          onClick={() => window.setTimeout(() => setTried(true), 1200)}
          className="rounded-full bg-[#141518] px-3 py-1.5 text-[#fbfbfb] whitespace-nowrap"
        >
          Abrir
        </a>
      )}
      <button type="button" onClick={close} aria-label="Cerrar" className="px-1 text-[#141518]">
        ×
      </button>
    </div>
  );
}
