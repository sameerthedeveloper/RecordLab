"use client";

import { TiptapField } from "./TiptapField";
import { DraggableHeaderTable } from "./DraggableHeaderTable";
import type { RecordState, WatermarkOptions } from "@/lib/types";

interface CanvasEditPreviewProps {
  record: RecordState;
  watermark: WatermarkOptions;
  onFieldChange: <K extends keyof RecordState>(field: K, value: RecordState[K]) => void;
}

/**
 * canvas2pdf mode's live preview: instead of the readonly, paginated
 * `.a4-page` output every other mode shares, this renders one continuous
 * page-styled surface where each section is directly editable via Tiptap.
 * Edits write straight back into RecordState through `onFieldChange`, same
 * as the structured left-panel fields — the two stay in sync either way.
 *
 * It intentionally does NOT reproduce lib/paginate.ts's page-splitting: that
 * engine cuts sections mid-way across page boundaries by measured pixel
 * height, which would leave editors bound to visually-truncated fragments
 * rather than a whole field. This view instead flows continuously; the
 * paginated, page-accurate breakdown still happens for the actual export.
 *
 * The header table is a free-floating, draggable/resizable box (see
 * DraggableHeaderTable) positioned in mm within `.a4-editable-surface` — a
 * zero-padding wrapper so its coordinate frame matches the 176mm content
 * width lib/buildCanvasPdf.ts draws it in. It sits independently of the
 * flowing sections below (`.a4-main-flow` gets a fixed top offset instead of
 * following the header), so dragging it down over the content overlaps
 * rather than reflowing text around it.
 */
export function CanvasEditPreview({ record, watermark, onFieldChange }: CanvasEditPreviewProps) {
  const watermarkStyle: React.CSSProperties = {
    fontFamily: watermark.font,
    fontSize: `${watermark.size}px`,
    transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
    opacity: watermark.opacity / 100,
    color: watermark.color,
  };

  return (
    <div className="a4-page" style={{ height: "auto", minHeight: "297mm", overflow: "visible" }}>
      <div className="watermark" style={watermarkStyle}>
        {record.rrn.trim()}
      </div>
      <div className="a4-border" />
      <div className="a4-content" style={{ height: "auto" }}>
        <div className="a4-editable-surface">
          <DraggableHeaderTable record={record} layout={record.headerLayout} onFieldChange={onFieldChange} />

          <div className="a4-main-flow a4-main-flow--floating-header" style={{ overflow: "visible" }}>
            <section className="record-block">
              <h2 className="record-heading">AIM:</h2>
              <TiptapField className="record-body" value={record.aim} onChange={(v) => onFieldChange("aim", v)} />
            </section>

            <section className="record-block">
              <h2 className="record-heading">ALGORITHM:</h2>
              <TiptapField
                className="record-body"
                value={record.algorithm}
                onChange={(v) => onFieldChange("algorithm", v)}
              />
            </section>

            <section className="record-block">
              <h2 className="record-heading">SOURCE CODE:</h2>
              <TiptapField
                className="source-code"
                value={record.source_code}
                onChange={(v) => onFieldChange("source_code", v)}
              />
            </section>

            <section className="record-block">
              <h2 className="record-heading">OUTPUT:</h2>
              <TiptapField className="output-text" value={record.output} onChange={(v) => onFieldChange("output", v)} />
              {record.output_images.length > 0 && (
                <div className="output-images">
                  {record.output_images.map((image) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={image.id} src={image.src} alt={image.name} className="output-image" />
                  ))}
                </div>
              )}
            </section>

            {record.review_questions_enabled && (
              <section className="record-block">
                <h2 className="record-heading">REVIEW QUESTIONS:</h2>
                <TiptapField
                  className="record-body"
                  value={record.review_questions}
                  onChange={(v) => onFieldChange("review_questions", v)}
                />
              </section>
            )}

            <section className="record-block record-block-result">
              <h2 className="record-heading">RESULT:</h2>
              <TiptapField className="record-body" value={record.result} onChange={(v) => onFieldChange("result", v)} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
