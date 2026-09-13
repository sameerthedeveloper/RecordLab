"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MAX_HEIGHT_MM, MIN_HEIGHT_MM, MIN_WIDTH_MM } from "./DraggableHeaderTable";
import { FONT_OPTIONS } from "@/lib/fonts";
import { CONTENT_WIDTH_MM } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (next: AppSettings) => void;
}

const inputClass =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

export function SettingsModal({ open, settings, onClose, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  // Re-sync the draft to the saved settings each time the modal opens —
  // otherwise a Cancel'd edit from a previous open would linger and
  // resurface next time (the component stays mounted, just hidden, so its
  // state doesn't reset on its own).
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line p-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Defaults
            </p>
            <h2 className="font-serif text-lg font-bold text-ink">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink">Your RRN</p>
            <label htmlFor="settingsRrn" className={labelClass}>
              Register number
            </label>
            <input
              id="settingsRrn"
              type="text"
              placeholder="Enter your RRN..."
              value={draft.rrn}
              onChange={(e) => setDraft({ ...draft, rrn: e.target.value })}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-ink-soft/70">
              Fills in automatically on new records — the Record Details panel can still override it for a
              one-off record.
            </p>
          </section>

          <section className="border-t border-line pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink">RRN watermark style</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="settingsWatermarkOpacity" className="text-xs font-semibold text-ink-soft">
                    Opacity
                  </label>
                  <span className="font-mono text-xs text-ink-soft/80">{draft.watermark.opacity}%</span>
                </div>
                <input
                  id="settingsWatermarkOpacity"
                  type="range"
                  min={1}
                  max={50}
                  value={draft.watermark.opacity}
                  onChange={(e) =>
                    setDraft({ ...draft, watermark: { ...draft.watermark, opacity: Number(e.target.value) } })
                  }
                  className="mt-2 w-full cursor-pointer accent-accent"
                />
              </div>
              <div>
                <label htmlFor="settingsWatermarkSize" className={labelClass}>
                  Size (px)
                </label>
                <input
                  id="settingsWatermarkSize"
                  type="number"
                  min={20}
                  max={200}
                  value={draft.watermark.size}
                  onChange={(e) =>
                    setDraft({ ...draft, watermark: { ...draft.watermark, size: Number(e.target.value) } })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft/70">
              Rotation and color are still per record, in Watermark Options.
            </p>
          </section>

          <section className="border-t border-line pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink">Document font</p>
            <label htmlFor="settingsFont" className={labelClass}>
              Applies to every export — PDF, DOCX, and print
            </label>
            <select
              id="settingsFont"
              value={draft.font}
              onChange={(e) => setDraft({ ...draft, font: e.target.value })}
              className={`${inputClass} bg-white`}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-soft/70">
              The vector PDF engine (canvas2pdf) uses the closest built-in match rather than this exact font
              file.
            </p>
          </section>

          <section className="border-t border-line pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink">Title table size</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settingsHeaderWidth" className={labelClass}>
                  Width (mm)
                </label>
                <input
                  id="settingsHeaderWidth"
                  type="number"
                  min={MIN_WIDTH_MM}
                  max={CONTENT_WIDTH_MM}
                  value={draft.headerLayout.width}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      headerLayout: { ...draft.headerLayout, width: Number(e.target.value) },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="settingsHeaderHeight" className={labelClass}>
                  Height (mm)
                </label>
                <input
                  id="settingsHeaderHeight"
                  type="number"
                  min={MIN_HEIGHT_MM}
                  max={MAX_HEIGHT_MM}
                  value={draft.headerLayout.height}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      headerLayout: { ...draft.headerLayout, height: Number(e.target.value) },
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft/70">
              Default size for new records — drag the table&apos;s corner in canvas2pdf mode to resize just one
              record.
            </p>
          </section>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
