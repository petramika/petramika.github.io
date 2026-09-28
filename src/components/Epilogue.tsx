import texts from '../data/texts.json';

interface EpilogueProps {
  onScrollToTop?: () => void;
}

export function Epilogue({ onScrollToTop }: EpilogueProps) {
  // Read off the clock rather than out of the copy: a year that has to be
  // edited by hand is a year that goes stale on the 1st of January.
  const year = new Date().getFullYear();

  return (
    <footer
      id="site-footer"
      className="relative border-t border-[#e4e4e7]/60 px-6 py-24 text-center"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center">
        {onScrollToTop && (
          <button
            id="btn-scroll-top"
            onClick={onScrollToTop}
            className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[#71717a] hover:text-[#18181b] transition-colors font-editorial-mono cursor-pointer"
          >
            {texts.epilogue.backToTop}
          </button>
        )}

        {/* The wordmark closes the essay the same way it opened it */}
        <p className="font-editorial-display text-4xl sm:text-5xl font-black tracking-[-0.05em] text-[#141518] select-none">
          {texts.hero.title}
        </p>

        <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-[#a1a1aa] font-editorial-mono select-none">
          © {year}
        </p>

        <div className="mt-2.5 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.25em] text-[#71717a] font-editorial-mono">
          <span className="select-none">{texts.epilogue.credit}</span>
          <a
            href={texts.epilogue.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="hover:text-[#18181b] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
