"use client";

import { useEffect, useState } from "react";
import { FileText, Palette, Rows3, Settings as SettingsIcon, Stamp, User as UserIcon } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { MAX_HEIGHT_MM, MIN_HEIGHT_MM, MIN_WIDTH_MM } from "./DraggableHeaderTable";
import { AccountSettings } from "./AccountSettings";
import { HeaderBorderControls } from "./HeaderBorderControls";
import { FONT_OPTIONS } from "@/lib/fonts";
import { CONTENT_WIDTH_MM } from "@/lib/types";
import { applyUiStyle, type AppSettings, type UiStyle } from "@/lib/settings";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (next: AppSettings) => void;
  onToast: (message: string) => void;
}

const inputClass =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

type Tab = "account" | "appearance" | "record" | "heading" | "watermark";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "record", label: "Record", icon: FileText },
  { id: "heading", label: "Heading table", icon: Rows3 },
  { id: "watermark", label: "Watermark", icon: Stamp },
];

export function SettingsModal({ open, settings, onClose, onSave, onToast }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [tab, setTab] = useState<Tab>("appearance");

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

  /** Close without saving: put the interface back to the saved style, since picking one previews it live. */
  function handleCancel() {
    applyUiStyle(settings.uiStyle);
    onClose();
  }

  function pickStyle(uiStyle: UiStyle) {
    setDraft({ ...draft, uiStyle });
    applyUiStyle(uiStyle);
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title="Settings"
      description="Defaults for every new record"
      icon={SettingsIcon}
      size="wide"
      fullHeight
      bodyClassName="!overflow-hidden p-0"
      footer={
        <>
          <button type="button" onClick={handleCancel} className={modalButton.secondary}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className={modalButton.primary}>
            Save settings
          </button>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col md:flex-row">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                tab === id ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === "account" && <AccountSettings onToast={onToast} />}
          {tab === "appearance" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
      <section>
            <h3 className="mb-3 font-serif text-sm font-bold text-ink">Interface style</h3>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Interface style">
              {(
                [
                  { id: "apple", name: "Modern", note: "Frosted, rounded, soft" },
                  { id: "classic", name: "Classic", note: "Flat, crisp, original" },
                ] as const
              ).map((o) => {
                const active = draft.uiStyle === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickStyle(o.id)}
                    className={`group rounded-2xl border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      active ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30" : "border-line bg-white hover:border-accent/40"
                    }`}
                  >
                    {/* mini preview of the style */}
                    <div
                      aria-hidden
                      className={`mb-2.5 flex h-16 items-end gap-1.5 overflow-hidden p-2 ${
                        o.id === "apple"
                          ? "rounded-[14px] bg-gradient-to-br from-[#fde8d8] via-[#efede7] to-[#dfe9e6]"
                          : "rounded-lg bg-gray-100"
                      }`}
                    >
                      <span className={`h-full w-1/3 bg-white ${o.id === "apple" ? "rounded-xl shadow-[0_4px_12px_-4px_rgba(28,43,51,0.3)]" : "rounded-md border border-line"}`} />
                      <span className={`flex h-full flex-1 flex-col justify-end gap-1 bg-white p-1.5 ${o.id === "apple" ? "rounded-xl shadow-[0_4px_12px_-4px_rgba(28,43,51,0.3)]" : "rounded-md border border-line"}`}>
                        <span className={`h-1.5 w-full bg-ink/10 ${o.id === "apple" ? "rounded-full" : "rounded-sm"}`} />
                        <span className={`h-3 w-1/2 bg-accent ${o.id === "apple" ? "rounded-full" : "rounded-md"}`} />
                      </span>
                    </div>
                    <p className="text-[13px] font-bold text-ink">{o.name}</p>
                    <p className="text-[11px] text-ink-soft/70">{o.note}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft/70">Shows right away; Save settings keeps it.</p>
          </section>
            </div>
          )}
          {tab === "record" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
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
          <section>
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
            </div>
          )}
          {tab === "heading" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
      <section>
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
          <section>
            <h3 className="mb-3 font-serif text-sm font-bold text-ink">Title table border</h3>
            <HeaderBorderControls
              idPrefix="settings"
              layout={draft.headerLayout}
              onChange={(headerLayout) => setDraft({ ...draft, headerLayout })}
            />
            <p className="mt-1.5 text-xs text-ink-soft/70">Default for new records. Each record can override it under Record details.</p>
          </section>
            </div>
          )}
          {tab === "watermark" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
      <section>
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
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
