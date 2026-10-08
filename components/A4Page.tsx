import { pageBorderStyle, type PageBorder, type PageObject, type WatermarkOptions } from "@/lib/types";

interface A4PageProps {
  page: PageObject;
  rrn: string;
  watermark: WatermarkOptions;
  pageBorder?: PageBorder;
}

/**
 * `page.main` / `page.result` are pre-escaped HTML fragments produced by the
 * pagination engine (lib/paginate.ts) — the engine has to work in raw HTML
 * because it measures/splits content by rendered pixel height, so this is
 * the one place preview content is injected via dangerouslySetInnerHTML
 * rather than JSX. All user text within those fragments is escaped via
 * escapeHTML before this point.
 */
export function A4Page({ page, rrn, watermark, pageBorder }: A4PageProps) {
  const borderStyle = pageBorderStyle(pageBorder);
  const watermarkStyle: React.CSSProperties = {
    fontFamily: watermark.font,
    fontSize: `${watermark.size}px`,
    transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
    opacity: watermark.opacity / 100,
    color: watermark.color,
  };

  return (
    <div className="a4-page">
      <div className="watermark" style={watermarkStyle}>
        {rrn.trim()}
      </div>
      <div className="a4-border" style={borderStyle} />
      <div className="a4-content">
        <div className="a4-main-flow" dangerouslySetInnerHTML={{ __html: page.main }} />
        {page.result && (
          <div className="a4-bottom-result" dangerouslySetInnerHTML={{ __html: page.result }} />
        )}
      </div>
    </div>
  );
}
