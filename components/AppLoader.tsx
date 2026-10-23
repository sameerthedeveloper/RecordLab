/**
 * Full-screen loader for page loads. A blank A4 sheet is ruled line by line, then the margin rule
 * and a stamp land: the same thing the app does with a lab record. Colours come from the theme tokens,
 * and reduced-motion shows the finished sheet without animating.
 */
export function AppLoader({ label = "Setting up your sheet", seconds = 1.4 }: { label?: string; seconds?: number }) {
  const T = seconds;
  return (
    <div role="status" aria-live="polite" className="app-canvas flex h-full w-full flex-col items-center justify-center gap-6 px-6">
      <svg viewBox="0 0 120 160" className="h-36 w-[108px] drop-shadow-[0_18px_28px_rgba(28,43,51,0.18)]" aria-hidden>
        <rect x="1.5" y="1.5" width="117" height="157" rx="4" className="loader-sheet" />
        <line x1="22" y1="14" x2="22" y2="146" className="loader-margin" style={{ animationDuration: `${0.14 * T}s`, animationDelay: `${0.02 * T}s` }} />
        {[34, 52, 70, 88, 106, 124].map((y, i) => (
          <line key={y} x1="30" y1={y} x2={i === 5 ? 76 : 104} y2={y} className="loader-rule" style={{ animationDuration: `${0.16 * T}s`, animationDelay: `${(0.06 + i * 0.13) * T}s` }} />
        ))}
        <rect x="68" y="16" width="34" height="12" rx="2" className="loader-stamp" style={{ animationDelay: `${0.9 * T}s` }} />
      </svg>
      <p className="font-serif text-[15px] font-semibold text-ink">
        {label}
        <span className="loader-dots" aria-hidden />
      </p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
