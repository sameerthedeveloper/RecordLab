"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CreditCard, FileText, FolderOpen, LayoutList, Palette, Rows3, Settings as SettingsIcon, ShieldCheck, Smartphone, Sparkles, Stamp, User as UserIcon } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { MAX_HEIGHT_MM, MIN_HEIGHT_MM } from "./DraggableHeaderTable";
import { AdminSettings } from "./AdminSettings";
import { AiSettings } from "./AiSettings";
import { useAdminAccess } from "@/lib/adminService";
import { CollegeInfo } from "./CollegeInfo";
import { AccountSettings } from "./AccountSettings";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { RecordFormatPicker } from "./RecordFormatPicker";
import { PageBorderControls } from "./PageBorderControls";
import { InstallAppSection } from "./InstallAppSection";
import { AppUpdateSection } from "./AppUpdateSection";
import { WatermarkControls } from "./WatermarkOptionsSection";
import { DEPARTMENTS } from "@/lib/sections";
import { SectionTemplateEditor } from "./SectionTemplateEditor";
import { SubjectLayouts } from "./SubjectLayouts";
import { HeaderBorderControls } from "./HeaderBorderControls";
import { FONT_OPTIONS } from "@/lib/fonts";
import { applyUiStyle, type AppSettings, type UiStyle } from "@/lib/settings";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (next: AppSettings) => void;
  onToast: (message: string) => void;
  /** Phone full-screen mode: an iOS Settings style list that pushes a page per section, no dialog. */
  screen?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all";
const labelClass = "mb-1 block text-xs font-semibold text-ink-soft";

type Tab = "app" | "admin" | "ai" | "account" | "billing" | "appearance" | "record" | "sections" | "subjects" | "heading" | "watermark";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "ai", label: "AI assistant", icon: Sparkles },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "app", label: "App", icon: Smartphone },
  { id: "record", label: "Record", icon: FileText },
  { id: "sections", label: "Record sections", icon: LayoutList },
  { id: "subjects", label: "Subjects", icon: FolderOpen },
  { id: "heading", label: "Heading table", icon: Rows3 },
  { id: "watermark", label: "Watermark", icon: Stamp },
];
const ADMIN_TAB = { id: "admin" as Tab, label: "Admin", icon: ShieldCheck };

export function SettingsModal({ open, settings, onClose, onSave, onToast, screen = false }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [tab, setTab] = useState<Tab>("appearance");
  const [page, setPage] = useState<Tab | null>(null);
  const isAdmin = useAdminAccess().status === "admin";

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

  const panes = (tab: Tab) => (
    <>
          {tab === "admin" && isAdmin && <AdminSettings onNavigate={onClose} />}
          {tab === "app" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
              <InstallAppSection />
              <AppUpdateSection auto={draft.autoUpdate} onAutoChange={(autoUpdate) => setDraft({ ...draft, autoUpdate })} />
            </div>
          )}
          {tab === "ai" && <AiSettings value={draft.aiStart} onChange={(aiStart) => setDraft({ ...draft, aiStart })} />}
          {tab === "billing" && (
            <section>
              <h3 className="mb-3 font-serif text-sm font-bold text-ink">Subscription</h3>
              <SubscriptionPanel onToast={onToast} />
            </section>
          )}
          {tab === "account" && (
            <AccountSettings
              onToast={onToast}
              onOpenBilling={() => setTab("billing")}
              afterDetails={
                <>
                <CollegeInfo />
                <section>
                  <h3 className="mb-3 font-serif text-sm font-bold text-ink">Department</h3>
                  <label htmlFor="settingsDepartment" className={labelClass}>
                    Your department
                  </label>
                  <input
                    id="settingsDepartment"
                    type="text"
                    list="settingsDepartmentList"
                    autoComplete="off"
                    maxLength={80}
                    placeholder="e.g. Mechanical Engineering"
                    value={draft.department}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                    className={inputClass}
                  />
                  <datalist id="settingsDepartmentList">
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <p className="mt-1.5 text-xs text-ink-soft/70">
                    Used to word the AI prompt for your field (a Mechanical record reads very differently from a Computer Science one). Type any department.
                  </p>
                </section>
                <section>
                  <h3 className="mb-3 font-serif text-sm font-bold text-ink">Register number</h3>
                  <label htmlFor="settingsRrn" className={labelClass}>
                    Your register number
                  </label>
                  <input
                    id="settingsRrn"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Enter your register number"
                    value={draft.rrn}
                    onChange={(e) => setDraft({ ...draft, rrn: e.target.value })}
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-ink-soft/70">
                    Fills in on every new record and prints as the faint watermark. Saved with Save settings. You can still change it on a single record in Record details.
                  </p>
                </section>
                </>
              }
            />
          )}
          {tab === "appearance" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
      <section>
            <h3 className="mb-3 font-serif text-sm font-bold text-ink">Interface style</h3>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Interface style">
              {(
                [
                  { id: "apple", name: "Modern", note: "Apple-style, clean, neutral" },
                  { id: "soft", name: "Soft", note: "Warm, frosted, rounded" },
                  { id: "material", name: "Material", note: "Tonal, flat, Android-like" },
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
                    {o.id === "material" ? (
                      <div aria-hidden className="mb-2.5 flex h-16 items-end gap-1.5 overflow-hidden rounded-[12px] bg-[#f6efe6] p-2">
                        <span className="h-full w-1/3 rounded-[8px] bg-[#fdf8f1] shadow-[0_1px_3px_rgba(0,0,0,0.2)]" />
                        <span className="relative flex h-full flex-1 flex-col justify-end gap-1 rounded-[8px] bg-[#fdf8f1] p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
                          <span className="h-1.5 w-full rounded-[2px] bg-ink/10" />
                          <span className="h-3 w-1/2 rounded-full bg-accent" />
                          <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-[5px] bg-accent-soft" />
                        </span>
                      </div>
                    ) : (
                    <div
                        aria-hidden
                        className={`mb-2.5 flex h-16 items-end gap-1.5 overflow-hidden p-2 ${
                          o.id === "soft"
                            ? "rounded-[14px] bg-gradient-to-br from-[#fde8d8] via-[#efede7] to-[#dfe9e6]"
                            : o.id === "apple"
                              ? "rounded-[14px] bg-[#f5f5f7]"
                              : "rounded-lg bg-gray-100"
                        }`}
                      >
                        <span className={`h-full w-1/3 bg-white ${o.id !== "classic" ? "rounded-xl shadow-[0_4px_12px_-4px_rgba(28,43,51,0.3)]" : "rounded-md border border-line"}`} />
                        <span className={`flex h-full flex-1 flex-col justify-end gap-1 bg-white p-1.5 ${o.id !== "classic" ? "rounded-xl shadow-[0_4px_12px_-4px_rgba(28,43,51,0.3)]" : "rounded-md border border-line"}`}>
                          <span className={`h-1.5 w-full bg-ink/10 ${o.id !== "classic" ? "rounded-full" : "rounded-sm"}`} />
                          <span className={`h-3 w-1/2 bg-accent ${o.id !== "classic" ? "rounded-full" : "rounded-md"}`} />
                        </span>
                      </div>
                    )}
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
      <section>
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Record format</h3>
        <RecordFormatPicker value={draft.recordFormat} onChange={(recordFormat) => setDraft({ ...draft, recordFormat })} />
        <p className="mt-1.5 text-xs text-ink-soft/70">What new records start in. You can change it per record in the editor.</p>
      </section>
      <section>
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Page border</h3>
        <PageBorderControls
          idPrefix="settings-page-border"
          value={draft.pageBorder}
          onChange={(pageBorder) => setDraft({ ...draft, pageBorder })}
        />
        <p className="mt-1.5 text-xs text-ink-soft/70">The rule around each page, for new records.</p>
      </section>
            </div>
          )}
          {tab === "sections" && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-ink-soft/80">
                The default sections every new record starts with. Pick your department, then rename, reorder or add sections. Subjects can have their own layout in the Subjects tab.
              </p>
              <SectionTemplateEditor idPrefix="settings-layout" value={draft.defaultLayout} onChange={(defaultLayout) => setDraft({ ...draft, defaultLayout })} />
            </div>
          )}
          {tab === "subjects" && <SubjectLayouts defaultLayout={draft.defaultLayout} onToast={onToast} />}
          {tab === "heading" && (
            <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
      <section>
            <h3 className="mb-3 font-serif text-sm font-bold text-ink">Title table height</h3>
            <label htmlFor="settingsHeaderHeight" className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
              Height <span className="font-mono font-medium">{draft.headerLayout.height}mm</span>
            </label>
            <input
              id="settingsHeaderHeight"
              type="range"
              min={MIN_HEIGHT_MM}
              max={MAX_HEIGHT_MM}
              step={0.5}
              value={draft.headerLayout.height}
              onChange={(e) => setDraft({ ...draft, headerLayout: { ...draft.headerLayout, height: Number(e.target.value) } })}
              className="w-full accent-[#c2410c]"
            />
            <p className="mt-1.5 text-xs text-ink-soft/70">
              Default for new records. Width and position are under Move heading below.
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
            <div className="space-y-4">
              <p className="text-xs text-ink-soft/70">
                Default for new records. Each record can still change it under Sheet setup, Watermark.
              </p>
              <WatermarkControls watermark={draft.watermark} onChange={(watermark) => setDraft({ ...draft, watermark })} rrn={draft.rrn} />
            </div>
          )}
    </>
  );

  if (screen) {
    const all = isAdmin ? [...TABS, ADMIN_TAB] : TABS;
    const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
    const styleName: Record<UiStyle, string> = { apple: "Modern", soft: "Soft", material: "Material", classic: "Classic" };
    const fontName = FONT_OPTIONS.find((f) => f.value === draft.font)?.label ?? draft.font;
    const aiName = { prompt: "Starts on Copy prompt", import: "Starts on Paste & import", direct: "Starts on Direct LLM" }[draft.aiStart];
    const note: Record<Tab, string> = {
      account: "Name, college and sign-in",
      billing: "Your plan and payments",
      admin: "Tools for admins",
      ai: aiName,
      appearance: `${styleName[draft.uiStyle]} interface`,
      record: `${fontName}, ${draft.recordFormat} format`,
      sections: "What a new record starts with",
      subjects: "A layout for each subject",
      heading: `Title table, ${draft.headerLayout.height} mm tall`,
      watermark: "The mark behind every page",
      app: draft.autoUpdate ? "Installs and updates itself" : "Updates are manual",
    };
    const groups: { name: string; ids: Tab[] }[] = [
      { name: "You", ids: isAdmin ? ["account", "billing", "admin"] : ["account", "billing"] },
      { name: "How it looks and helps", ids: ["appearance", "app", "ai"] },
      { name: "Every new record", ids: ["record", "sections", "subjects", "heading", "watermark"] },
    ];
    const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
    const grid = {
      backgroundImage:
        "linear-gradient(to right, rgb(var(--c-ink) / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--c-ink) / 0.04) 1px, transparent 1px)",
      backgroundSize: "22px 22px",
    } as const;
    const current = page ? all.find((t) => t.id === page) : null;
    const scroller =
      "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+176px)]";
    return (
      <div className="flex h-full w-full flex-col bg-paper" style={grid}>
        {current ? (
          <div key={current.id} className="ios-push flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => setPage(null)}
                className="-ml-1 flex min-h-10 items-center gap-1 rounded-full pl-1 pr-3 text-sm font-semibold text-accent active:bg-accent-soft"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.4} /> Settings
              </button>
              <h1 className="mt-1 px-1 text-[30px] font-bold leading-tight tracking-tight text-ink" style={display}>
                {current.label}
              </h1>
              <p className="px-1 text-[13px] text-ink-soft">{note[current.id]}</p>
            </header>
            <div className={scroller}>
              <div className="rounded-2xl border border-line bg-[var(--surface)] p-4 shadow-[0_1px_0_rgb(var(--c-line)),0_14px_30px_-22px_rgba(28,43,51,0.35)]">
                {panes(current.id)}
              </div>
            </div>
          </div>
        ) : (
          <div className="ios-pop flex min-h-0 flex-1 flex-col">
            <div className={`${scroller} pt-[max(24px,env(safe-area-inset-top))]`}>
              <h1 className="px-1 text-[38px] font-bold leading-none tracking-tight text-ink" style={display}>
                Settings
              </h1>
              <p className="mb-6 mt-2 px-1 text-[13px] text-ink-soft">Defaults for every new record</p>
              <div className="space-y-6">
                {groups.map((g) => (
                  <section key={g.name} aria-label={g.name}>
                    <h2 className="mb-1.5 px-1 text-[13px] italic text-ink-soft" style={display}>
                      {g.name}
                    </h2>
                    <ul className="overflow-hidden rounded-2xl border border-line bg-[var(--surface)] shadow-[0_1px_0_rgb(var(--c-line)),0_14px_30px_-24px_rgba(28,43,51,0.4)]">
                      {g.ids.map((id, i) => {
                        const t = all.find((x) => x.id === id);
                        if (!t) return null;
                        const Icon = t.icon;
                        return (
                          <li key={id} className={i ? "border-t border-dashed border-line" : ""}>
                            <button
                              type="button"
                              onClick={() => setPage(id)}
                              className="relative flex min-h-[66px] w-full items-center gap-3.5 py-2.5 pl-5 pr-4 text-left transition-colors before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-accent before:opacity-0 before:transition-opacity active:bg-accent-soft/50 active:before:opacity-100"
                            >
                              <Icon className="h-[22px] w-[22px] shrink-0 text-accent" strokeWidth={1.8} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[18px] font-bold leading-tight text-ink" style={display}>
                                  {t.label}
                                </span>
                                <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">{note[id]}</span>
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft/40" strokeWidth={2.5} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}
        {dirty && (
          <div className="ios-pop fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] z-40 px-4">
            <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-line bg-[var(--surface)] p-1.5 shadow-[0_18px_40px_-14px_rgba(28,43,51,0.45)]">
              <button
                type="button"
                onClick={() => {
                  applyUiStyle(settings.uiStyle);
                  setDraft(settings);
                }}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-ink-soft active:bg-ink/[0.06]"
              >
                Discard
              </button>
              <button type="button" onClick={() => onSave(draft)} className="ui-primary min-h-11 flex-1 px-5 text-[15px] font-semibold">
                Save settings
              </button>
            </div>
          </div>
        )}
      </div>
    );
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
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3"
        >
          {(isAdmin ? [...TABS, ADMIN_TAB] : TABS).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={(e) => {
                setTab(id);
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }}
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
          {panes(tab)}
        </div>
      </div>
    </Modal>
  );
}
