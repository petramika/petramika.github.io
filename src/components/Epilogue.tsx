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

        <p className="mt-2.5 text-[11px] uppercase tracking-[0.25em] text-[#71717a] font-editorial-mono select-none">
          {texts.epilogue.credit}
        </p>
      </div>
    </footer>
  );
}
