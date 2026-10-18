"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Download, FileDown, Files, FolderOpen, House, Pencil, Plus } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
import { AdSlot } from "./AdSlot";
import { DashboardModal } from "./DashboardModal";
import { FileThumb, relativeTime, stripHtml } from "./CloudFileViews";
import { useAuthUser } from "@/lib/authService";
import { watchUserDocuments, type CloudDocument, type RlabPayload } from "@/lib/firestoreService";
import { useFolders } from "@/lib/folderService";
import { downloadCloudDocumentPdf } from "@/lib/downloadCloudPdf";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

interface MobileHomeProps {
  onLoad: (payload: RlabPayload, docId: string, folderId: string | null) => void;
  onToast: (message: string) => void;
}

const DAY = 24 * 60 * 60 * 1000;
const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const when = (d: CloudDocument) => (d.updatedAt ?? d.createdAt)?.toMillis() ?? Date.now();

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Seven day strip, oldest to today: how many records were touched each day. */
function weekStrip(docs: CloudDocument[]): { label: string; count: number; today: boolean }[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() - (6 - i) * DAY);
    return { from: d.getTime(), label: LETTERS[d.getDay()], count: 0, today: i === 6 };
  });
  for (const doc of docs) {
    const t = when(doc);
    const day = days.find((d) => t >= d.from && t < d.from + DAY);
    if (day) day.count += 1;
  }
  return days;
}

/**
 * Phone-only home for the installed app: pick up the last record, start a new one, jump to a
 * subject or a recent file, see the week at a glance. The full file explorer is one tap away.
 */
export function MobileHome({ onLoad, onToast }: MobileHomeProps) {
  const router = useRouter();
  const user = useAuthUser();
  const folders = useFolders();
  const { canInstall, install } = useInstallPrompt();
  const [documents, setDocuments] = useState<CloudDocument[] | null>(null);
  const [view, setView] = useState<"home" | "files">("home");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDocuments(null);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    watchUserDocuments(
      (docs) => setDocuments(docs),
      () => {
        setDocuments([]);
        onToast("Unable to load your records. Check your connection.");
      }
    )
      .then((u) => (cancelled ? u() : (unsub = u)))
      .catch(() => setDocuments([]));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [user, onToast]);

  const sorted = useMemo(() => [...(documents ?? [])].sort((a, b) => when(b) - when(a)), [documents]);
  const latest = sorted[0];
  const recent = sorted.slice(1, 7);
  const week = useMemo(() => weekStrip(documents ?? []), [documents]);
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const peak = Math.max(1, ...week.map((d) => d.count));
  const perFolder = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of documents ?? []) if (d.folderId) m.set(d.folderId, (m.get(d.folderId) ?? 0) + 1);
    return m;
  }, [documents]);

  const open = (d: CloudDocument) => onLoad(d.data, d.id, d.folderId);

  async function pdf(d: CloudDocument) {
    setBusyId(d.id);
    try {
      await downloadCloudDocumentPdf(d);
      onToast("PDF downloaded.");
    } catch {
      onToast("Unable to create the PDF.");
    } finally {
      setBusyId(null);
    }
  }

  const firstName = user?.displayName?.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  if (view === "files") {
    return (
      <div className="app-canvas flex h-full w-full flex-col gap-3 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+92px)]">
        <button
          type="button"
          onClick={() => setView("home")}
          className="flex w-fit items-center gap-1.5 px-1 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} /> Home
        </button>
        <div className="min-h-0 flex-1">
          <DashboardModal open embedded onClose={() => setView("home")} onLoad={onLoad} onToast={onToast} />
        </div>
        <Tabs active="files" onHome={() => setView("home")} onEditor={() => router.push("/editor")} onFiles={() => setView("files")} />
      </div>
    );
  }

  return (
    <div className="app-canvas h-full w-full overflow-y-auto overscroll-contain">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+104px)] pt-[max(16px,env(safe-area-inset-top))]">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-soft">{today}</p>
            <h1 className="mt-0.5 font-serif text-[26px] font-bold leading-tight tracking-tight text-ink">
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
          </div>
          <AccountMenu onToast={onToast} menuAlign="end" />
        </header>

        {!user ? (
          <section className="ui-panel p-5">
            <h2 className="font-serif text-lg font-bold text-ink">Your records live here</h2>
            <p className="mt-1 text-sm text-ink-soft">Sign in to see saved records, pick up where you left off and open them on any device.</p>
          </section>
        ) : documents === null ? (
          <div className="h-44 animate-pulse rounded-[28px] bg-ink/[0.05]" aria-label="Loading your records" />
        ) : latest ? (
          <section aria-label="Continue editing" className="ui-panel overflow-hidden">
            <div className="flex gap-4 p-4">
              <div className="h-36 w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-paper">
                <FileThumb document={latest} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-xs font-semibold text-accent">Pick up where you left off</p>
                <h2 className="mt-1 line-clamp-2 font-serif text-lg font-bold leading-snug text-ink">{latest.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                  {stripHtml(latest.data?.record?.aim) || `Edited ${relativeTime(latest.updatedAt)}`}
                </p>
                <button
                  type="button"
                  onClick={() => open(latest)}
                  className="ui-primary mt-auto flex min-h-11 items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} /> Continue
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="ui-panel p-5">
            <h2 className="font-serif text-lg font-bold text-ink">Nothing saved yet</h2>
            <p className="mt-1 text-sm text-ink-soft">Write a record in the editor, then Save to cloud to find it here.</p>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => router.push("/editor")} className="ui-primary flex min-h-16 items-center gap-3 px-4 py-3 text-left">
            <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            <span className="text-sm font-semibold leading-tight">New record</span>
          </button>
          <button
            type="button"
            onClick={() => setView("files")}
            className="ui-panel flex min-h-16 items-center gap-3 px-4 py-3 text-left transition-transform active:scale-[0.98]"
          >
            <Files className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
            <span className="text-sm font-semibold leading-tight text-ink">All files{documents ? ` (${documents.length})` : ""}</span>
          </button>
          {canInstall && (
            <button
              type="button"
              onClick={install}
              className="ui-panel col-span-2 flex min-h-12 items-center gap-3 px-4 py-2.5 text-left transition-transform active:scale-[0.98]"
            >
              <Download className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.25} />
              <span className="text-sm font-semibold text-ink">Install Record Lab on this phone</span>
            </button>
          )}
        </div>

        {user && documents && documents.length > 0 && (
          <section aria-label="This week" className="ui-panel p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-base font-bold text-ink">This week</h2>
              <p className="text-xs text-ink-soft">
                {weekTotal} {weekTotal === 1 ? "record" : "records"} edited
              </p>
            </div>
            <div className="mt-3 flex h-16 items-end justify-between gap-2" role="img" aria-label={`Records edited per day: ${week.map((d) => d.count).join(", ")}`}>
              {week.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div
                    style={{ height: `${d.count ? Math.max(14, (d.count / peak) * 100) : 6}%` }}
                    className={`w-full max-w-7 rounded-md ${d.count ? (d.today ? "bg-accent" : "bg-accent/45") : "bg-line"}`}
                  />
                  <span className={`text-[10px] font-semibold leading-none ${d.today ? "text-accent" : "text-ink-soft/70"}`}>{d.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {folders && folders.length > 0 && (
          <section aria-label="Subjects">
            <h2 className="mb-2 px-1 font-serif text-base font-bold text-ink">Subjects</h2>
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setView("files")}
                  className="ui-panel flex min-h-14 w-40 shrink-0 items-center gap-2.5 px-3.5 py-2.5 text-left transition-transform active:scale-[0.98]"
                >
                  <FolderOpen className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.8} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{f.name}</span>
                    <span className="block text-[11px] text-ink-soft/70">
                      {perFolder.get(f.id) ?? 0} {(perFolder.get(f.id) ?? 0) === 1 ? "file" : "files"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <AdSlot name="Home, between sections" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} shape="rectangle" />

        {recent.length > 0 && (
          <section aria-label="Recent records">
            <h2 className="mb-2 px-1 font-serif text-base font-bold text-ink">Recent</h2>
            <ul className="ui-panel divide-y divide-line overflow-hidden">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center">
                  <button type="button" onClick={() => open(d)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-2 text-left active:bg-accent-soft/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{d.title}</span>
                      <span className="block truncate text-xs text-ink-soft/80">
                        {d.data?.record?.exercise_number ? `Ex. ${d.data.record.exercise_number} · ` : ""}
                        {relativeTime(d.updatedAt)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft/50" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Download PDF of ${d.title}`}
                    disabled={busyId === d.id}
                    onClick={() => pdf(d)}
                    className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-ink/10 disabled:opacity-50"
                  >
                    <FileDown className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Tabs active="home" onHome={() => setView("home")} onEditor={() => router.push("/editor")} onFiles={() => setView("files")} />
    </div>
  );
}

/** Same glass capsule as the editor's bar, so Home feels like one more tab of it. */
function Tabs({ active, onHome, onEditor, onFiles }: { active: "home" | "files"; onHome: () => void; onEditor: () => void; onFiles: () => void }) {
  const tabs = [
    { id: "home", label: "Home", Icon: House, onPress: onHome },
    { id: "editor", label: "Editor", Icon: Pencil, onPress: onEditor },
    { id: "files", label: "Files", Icon: Files, onPress: onFiles },
  ];
  return (
    <nav aria-label="Main" className="ios-tabbar fixed inset-x-0 bottom-0 z-50 px-4">
      <div className="liquid-glass relative mx-auto flex h-[62px] max-w-md items-stretch rounded-full p-1">
        {tabs.map(({ id, label, Icon, onPress }) => {
          const on = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={onPress}
              aria-current={on ? "page" : undefined}
              className={`relative z-10 flex flex-1 select-none flex-col items-center justify-center gap-[3px] rounded-full transition-[color,transform,background-color] duration-200 active:scale-90 ${
                on ? "liquid-lens !static text-accent" : "text-ink/65"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={on ? 2.2 : 1.8} fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.16 : 0} />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
