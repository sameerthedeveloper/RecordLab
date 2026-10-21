import { Check } from "lucide-react";
import { pageBorderStyle, type PageBorder, type PageObject, type RecordFormat, type Verification, type WatermarkOptions } from "@/lib/types";

interface A4PageProps {
  page: PageObject;
  rrn: string;
  watermark: WatermarkOptions;
  format?: RecordFormat;
  pageBorder?: PageBorder;
  /** Faculty verification, drawn bottom-right. Pass it for the last page only. */
  verified?: Verification | null;
}

/**
 * `page.main` / `page.result` are pre-escaped HTML fragments produced by the
 * pagination engine (lib/paginate.ts) — the engine has to work in raw HTML
 * because it measures/splits content by rendered pixel height, so this is
 * the one place preview content is injected via dangerouslySetInnerHTML
 * rather than JSX. All user text within those fragments is escaped via
 * escapeHTML before this point.
 */
export function A4Page({ page, rrn, watermark, format, pageBorder, verified }: A4PageProps) {
  const watermarkStyle: React.CSSProperties = {
    fontFamily: watermark.font,
    fontSize: `${watermark.size}px`,
    transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
    opacity: watermark.opacity / 100,
    color: watermark.color,
  };

  return (
    <div className={format === "college" ? "a4-page fmt-college" : "a4-page"}>
      <div className="watermark" style={watermarkStyle}>
        {rrn.trim()}
      </div>
      <div className="a4-border" style={pageBorderStyle(pageBorder)} />
      <div className="a4-content">
        <div className="a4-main-flow" dangerouslySetInnerHTML={{ __html: page.main }} />
        {page.result && (
          <div className="a4-bottom-result" dangerouslySetInnerHTML={{ __html: page.result }} />
        )}
      </div>
      {verified && (
        <div className="a4-verified">
          <span aria-hidden className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[#1b7f5c]">
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
          </span>
          <div>
            <b>Verified by {verified.by}</b>
            {verified.on && <small>{verified.on}</small>}
          </div>
        </div>
      )}
    </div>
  );
}
