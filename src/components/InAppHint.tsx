import { useState } from 'react';

const KEY = 'rota_in_app_hint_closed';

/** A quiet note for readers who arrived through another app's browser */
export function InAppHint() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== '1';
    } catch {
      return true;
    }
  });
  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // private mode: it just comes back next time
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-full border border-[#141518]/10 bg-[#fbfbfb]/95 px-4 py-2.5 text-[11px] font-editorial-mono uppercase tracking-[0.12em] text-[#52525b] shadow-sm">
      <span className="flex-1">Se ve mejor en tu navegador · ··· → Abrir en navegador</span>
      <button type="button" onClick={close} aria-label="Cerrar" className="px-1 text-[#141518]">
        ×
      </button>
    </div>
  );
}
