"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { MAX_HEIGHT_MM, MIN_HEIGHT_MM, MIN_WIDTH_MM } from "./DraggableHeaderTable";
import { HeaderBorderControls } from "./HeaderBorderControls";
import { PageBorderControls } from "./PageBorderControls";
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
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Defaults for every new record"
      icon={SettingsIcon}
      size="md"
      bodyClassName="space-y-5 p-4 sm:p-5"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalButton.secondary}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className={modalButton.primary}>
            Save settings
          </button>
        </>
      }
    >
      <section>
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Your RRN</h3>
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
          Fills in automatically on new records — the Record Details panel can still override it for a one-off
          record.
        </p>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Title table border</h3>
        <HeaderBorderControls
          idPrefix="settings"
          layout={draft.headerLayout}
          onChange={(headerLayout) => setDraft({ ...draft, headerLayout })}
        />
        <p className="mt-1.5 text-xs text-ink-soft/70">Default for new records. Each record can override it under Record details.</p>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Page border</h3>
        <PageBorderControls
          idPrefix="settings-page-border"
          value={draft.pageBorder}
          onChange={(pageBorder) => setDraft({ ...draft, pageBorder })}
        />
        <p className="mt-2 text-xs text-ink-soft/70">Default for new records. Each record can override it in the editor.</p>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">RRN watermark style</h3>
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
                setDraft({
                  ...draft,
                  watermark: {
                    ...draft.watermark,
                    opacity: Number(e.target.value),
                  },
                })
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
                setDraft({
                  ...draft,
                  watermark: {
                    ...draft.watermark,
                    size: Number(e.target.value),
                  },
                })
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
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Document font</h3>
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
          The vector PDF engine (canvas2pdf) uses the closest built-in match rather than this exact font file.
        </p>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Title table size</h3>
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
                  headerLayout: {
                    ...draft.headerLayout,
                    width: Number(e.target.value),
                  },
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
                  headerLayout: {
                    ...draft.headerLayout,
                    height: Number(e.target.value),
                  },
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
    </Modal>
  );
}
