"use client";

import { AdSlot } from "@/components/AdSlot";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Cloud,
  Download,
  ExternalLink,
  FileDown,
  Folder,
  FolderOpen,
  GraduationCap,
  Globe,
  Layers,
  LayoutTemplate,
  Mail,
  Play,
  Share2,
  ShieldCheck,
  Frame,
  Rows3,
  Ruler,
  Save,
  Sparkles,
  Stamp,
  TerminalSquare,
} from "lucide-react";

const index = [
  {
    icon: GraduationCap,
    title: "A layout for every department",
    body: "Programming, Physics, Chemistry, Electronics, Mechanical, Civil, or your own. Each subject keeps its own list of sections: apparatus, theory, observations, calculations, anything.",
  },
  {
    icon: Play,
    title: "Run the code, keep the real output",
    body: "Run Python or JavaScript right in the browser, and C, C++ or Java on a runner. The console output and any graph go into the record, marked as verified.",
  },
  {
    icon: Sparkles,
    title: "AI drafts it for your department",
    body: "Say which department you study. The prompt is written for it, lists your own sections, and brings back the program's input too.",
  },
  {
    icon: Ruler,
    title: "True-to-scale A4 layout",
    body: "Every section is measured against real A4 dimensions, so the preview on screen is the page you hand in. Zoom, fit and page-by-page controls included.",
  },
  {
    icon: LayoutTemplate,
    title: "Standard or college sheet",
    body: "Switch to the college format: the heading block runs edge to edge, with the EX / DATE column and the title, like a printed lab sheet.",
  },
  {
    icon: Frame,
    title: "Page border and heading table",
    body: "Style, thickness, colour, distance and rounded corners for the page border. Word-style lines for the heading table, and move the title or the whole table where you want it.",
  },
  {
    icon: TerminalSquare,
    title: "Terminal-style output screenshots",
    body: "Turn program output into a macOS, Linux, CMD or PowerShell screenshot in one click. Edit it again any time.",
  },
  {
    icon: Stamp,
    title: "Manual calculation space",
    body: "Switch on 35 blank lines before the result for working you write by hand. It flows onto the next page if it needs to.",
  },
  {
    icon: FileDown,
    title: "PDF, Word or print",
    body: "Export a print-ready PDF (picture-perfect or selectable-text), a Word file, or send it straight to the printer. A saved record downloads as a PDF from Files.",
  },
  {
    icon: Share2,
    title: "Share a link",
    body: "Send a link anyone can open as an editable copy. Revoke it any time from Settings.",
  },
  {
    icon: Folder,
    title: "Subject folders",
    body: "Keep every record under its subject, each with its own layout. Drag files between folders, rename them, search across all of it.",
  },
  {
    icon: Cloud,
    title: "Cloud sync, any sign-in",
    body: "Sign in with email or Google. Records save to your account and pick up where you left off on any device.",
  },
  {
    icon: Save,
    title: "Install it, use it offline",
    body: "Add Record Lab to your phone's home screen. It opens on the editor and keeps working without a connection.",
  },
  {
    icon: Layers,
    title: "Automatic pagination",
    body: "Long code listings and multi-image outputs split across pages on their own, never mid-line or mid-image.",
  },
];

const faqs = [
  {
    q: "Is it really free?",
    a: "Yes. Record Lab runs in your browser, there is nothing to install and no payment step. It is supported by small ads.",
  },
  {
    q: "Is it only for computer science?",
    a: "No. Pick your department's layout, or build your own: Aim, Apparatus, Theory, Procedure, Observations, Calculations, Result, whatever your lab asks for. Each subject remembers its layout.",
  },
  {
    q: "Which languages can it run?",
    a: "Python and JavaScript run on your own device, even offline once loaded, and Python graphs (matplotlib) come out as images. C, C++ and Java need a compiler, so they run on a runner service, and only after you agree to send the code.",
  },
  {
    q: "How do I know the output is real?",
    a: "Output captured from a run is marked Verified, with the language and time. If you edit the code afterwards it flags the output as out of date, so sample text and real output never get mixed up.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can write, run, preview and export without signing in. An account (email or Google) only adds cloud saving, subject folders, share links and sync across devices.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. Install it from your browser or add it to your home screen and the editor, preview and exports keep working without a connection. Saving to the cloud, sharing and AI drafting need one.",
  },
  {
    q: "What can I export?",
    a: "A PDF (rendered snapshot or vector with selectable text), a Word .docx you can keep editing, or print directly. Saved records can be downloaded as a PDF straight from the Files screen.",
  },
  {
    q: "Will it match my college's record format?",
    a: "Choose the standard sheet or the college sheet, then adjust the heading table, page border, watermark, font and sections until it matches your department's format.",
  },
  {
    q: "Where is my data stored?",
    a: "Unsaved work stays in your browser. If you save to the cloud, records live in your own account and are visible only to you. A share link shows a copy only to people who have the link, until you revoke it.",
  },
];

const contributors = [
  {
    name: "Mohamed Sameer S",
    role: "Frontend & Full-Stack Developer",
    bio: "Builds React and Next.js apps out of Chennai, with a focus on offline-first PWAs, real-time/sync systems, and accessible UI.",
    links: [
      { label: "Portfolio", href: "https://mohamedsameer.tech", icon: Globe },
      { label: "GitHub", href: "https://github.com/sameerthedeveloper", icon: ExternalLink },
      { label: "LinkedIn", href: "https://linkedin.com/in/mdsameers/", icon: ExternalLink },
    ],
  },
  {
    name: "Mohammed Imran A",
    role: "Contributor",
    bio: "Contributor to Record Lab — reach out on LinkedIn or by email.",
    links: [
      { label: "Portfolio", href: "https://portfolio1-wheat-two.vercel.app", icon: Globe },
      { label: "Email", href: "mailto:mohammed2007imran@gmail.com", icon: Mail },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/mohamed-imran-a-b18aaa375?utm_source=share_via&utm_content=profile&utm_medium=member_android",
        icon: ExternalLink,
      },
    ],
  },
  {
    name: "Mohammed Ridhwan S Y",
    role: "Idea contributor",
    bio: "Suggested the Manual Calculation section: 35 blank, hand-written lines before the result, switched on per record.",
    links: [] as { label: string; href: string; icon: typeof Globe }[],
  },
];

const steps = [
  { n: "01", t: "Pick your layout", d: "Choose your department or build your own sections once. Every record in a subject starts from it." },
  { n: "02", t: "Write it, or let AI draft it, then run it", d: "Type the sections, or generate them for your department. Run the code to capture the real output and graphs." },
  { n: "03", t: "Check the pages, then export", d: "The live preview lays out real A4 pages. Save a PDF or Word file, print it, or share a link." },
];

/** Parent brand shown in the footer. Swap the name/URL here when the branding is final. */
const BRAND = { name: "Cogniheim", url: "https://cogniheim.com" };

const TOTAL_PAGES = 7;

/* ------------------------------------------------------------------ */
/* Interactive demos                                                  */
/* ------------------------------------------------------------------ */

type TermId = "macos" | "linux" | "cmd" | "powershell";

const TERMS: Record<TermId, { label: string; bg: string; fg: string; user: string; dir: string; bar: string }> = {
  macos: { label: "macOS", bg: "#1e1e1e", fg: "#ececec", user: "#7be0a2", dir: "#6ea8fe", bar: "#2b2b2b" },
  linux: { label: "Linux", bg: "#300a24", fg: "#eeeeec", user: "#8ae234", dir: "#729fcf", bar: "#3c3b37" },
  cmd: { label: "CMD", bg: "#0c0c0c", fg: "#cccccc", user: "#cccccc", dir: "#cccccc", bar: "#1f1f1f" },
  powershell: { label: "PowerShell", bg: "#012456", fg: "#eeedf0", user: "#eeedf0", dir: "#eeedf0", bar: "#1f1f1f" },
};

function Prompt({ id }: { id: TermId }) {
  const t = TERMS[id];
  if (id === "macos")
    return (
      <>
        <span style={{ color: t.user }}>student@lab-pc</span> <span style={{ color: t.dir }}>record</span> %{" "}
      </>
    );
  if (id === "linux")
    return (
      <>
        <span style={{ color: t.user }}>student@lab-pc</span>:<span style={{ color: t.dir }}>~/record</span>${" "}
      </>
    );
  if (id === "cmd") return <>C:\Users\student\record&gt;</>;
  return <>PS C:\Users\student\record&gt; </>;
}

/** The terminal-screenshot feature, switchable between the four prompt styles it can generate. */
function TerminalDemo() {
  const [id, setId] = useState<TermId>("macos");
  const t = TERMS[id];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1 rounded-full bg-black/[0.05] p-1" role="tablist" aria-label="Terminal style">
        {(Object.keys(TERMS) as TermId[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={id === k}
            onClick={() => setId(k)}
            className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              id === k ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
            }`}
          >
            {TERMS[k].label}
          </button>
        ))}
      </div>
      <div
        className="overflow-hidden rounded-lg font-mono text-[11px] leading-[1.7] shadow-[0_14px_30px_-14px_rgba(28,43,51,0.55)] transition-colors"
        style={{ background: t.bg, color: t.fg }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: t.bar }}>
          {id === "macos" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            </>
          ) : (
            <span className="text-[10px] opacity-70">
              {id === "linux" ? "student@lab-pc: ~/record" : id === "cmd" ? "Command Prompt" : "Windows PowerShell"}
            </span>
          )}
        </div>
        <div className="space-y-0.5 overflow-x-auto px-3.5 py-3 whitespace-pre">
          <div><Prompt id={id} />python gen.py</div>
          <div>Name: Sameer   Register no: 24CS118</div>
          <div>Password: Sam@8452kR!</div>
          <div>Strength: Strong</div>
          <div>
            <Prompt id={id} />
            <span className="lp-caret inline-block h-[1.05em] w-[0.55em] translate-y-[2px]" style={{ background: t.fg, opacity: 0.7 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

type HeadMode = "box" | "open" | "double";

/** The heading table with its borders and the optional rule underneath. */
function HeaderDemo() {
  const [mode, setMode] = useState<HeadMode>("open");
  const line = (m: HeadMode) => (m === "box" ? "1px solid #111827" : m === "double" ? "3px double #111827" : "none");
  const edge = line(mode);
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-black/[0.05] p-1" role="tablist" aria-label="Heading style">
        {([
          ["open", "Open + rule"],
          ["box", "Box"],
          ["double", "Double"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              mode === k ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-white p-4 shadow-[0_14px_30px_-14px_rgba(28,43,51,0.3)]">
        <div className="grid grid-cols-[30%_1fr] text-[11px] transition-all" style={{ border: edge }}>
          <div className="px-2.5 py-2 font-semibold" style={{ borderRight: edge }}>
            <div className="pb-1" style={{ borderBottom: mode === "open" ? "none" : mode === "double" ? "1px solid #111827" : edge }}>
              EX NO : 01
            </div>
            <div className="pt-1">DATE : 24.07.26</div>
          </div>
          <div className="flex items-center justify-center px-2 py-2 text-center text-[12px] font-bold">PASSWORD GENERATOR</div>
        </div>
        <div
          className="mt-2.5 transition-all"
          style={{ borderTop: mode === "open" ? "1px solid #9ca3af" : "1px solid transparent" }}
        />
        <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b3261e]">Aim</p>
        <div className="mt-1 space-y-1">
          <div className="h-1 rounded bg-ink/10" />
          <div className="h-1 w-4/5 rounded bg-ink/10" />
        </div>
      </div>
    </div>
  );
}

const SUBJECTS = [
  { name: "Data Structures", n: 8 },
  { name: "Python Programming", n: 12 },
  { name: "Digital Logic", n: 5 },
  { name: "Operating Systems", n: 3 },
];

/** Subject folders, drawn like the dashboard's folder cards. */
function SubjectsDemo() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {SUBJECTS.map((f, i) => (
          <button
            key={f.name}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
            className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
              active === i ? "border-accent bg-accent-soft/50" : "border-line bg-paper hover:border-accent/40"
            }`}
          >
            <Folder className="h-5 w-5 shrink-0 fill-accent-soft text-accent" strokeWidth={1.75} />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-ink">{f.name}</span>
              <span className="block text-[10px] text-ink-soft/70">{f.n} files</span>
            </span>
          </button>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white text-[12px]">
        {["Ex 1  Stack using arrays", "Ex 2  Queue operations", "Ex 3  Binary search tree"].map((f, i) => (
          <li key={f} className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate font-medium text-ink">{f}</span>
            <span className="shrink-0 font-mono text-[10px] text-ink-soft/60">{i + 1}d ago</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-soft/70">
        in <span className="font-semibold text-ink">{SUBJECTS[active].name}</span>
      </p>
    </div>
  );
}


const LAYOUTS = [
  { id: "programming", label: "Programming", sections: ["Aim", "Algorithm", "Source code", "Output", "Review questions"], close: "Result" },
  { id: "science", label: "Physics / Chem", sections: ["Aim", "Apparatus required", "Theory", "Procedure", "Observations", "Calculations"], close: "Result" },
  { id: "electronics", label: "Electronics", sections: ["Aim", "Components required", "Circuit diagram", "Procedure", "Tabulation", "Model calculation"], close: "Result" },
  { id: "mechanical", label: "Mechanical / Civil", sections: ["Aim", "Apparatus", "Procedure", "Observation table", "Calculations", "Precautions"], close: "Conclusion" },
];

/** Department layouts: the section list changes with the department, like the real section editor. */
function DepartmentDemo() {
  const [id, setId] = useState(LAYOUTS[1].id);
  const layout = LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-black/[0.05] p-1" role="tablist" aria-label="Department">
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            role="tab"
            aria-selected={id === l.id}
            onClick={() => setId(l.id)}
            className={`rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              id === l.id ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white text-[12px] shadow-[0_14px_30px_-14px_rgba(28,43,51,0.3)]">
        {[...layout.sections, layout.close].map((t, i) => (
          <li key={t} className="flex items-center gap-2.5 px-3 py-2">
            <span className="w-5 font-mono text-[10px] font-semibold text-[#b3261e]/80">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-semibold text-ink">{t.toUpperCase()}:</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-ink-soft/70">Rename, reorder or add your own. Each subject remembers its layout.</p>
    </div>
  );
}

/** Run the code: press Run, get console output and a graph, marked as verified. */
function RunDemo() {
  const [ran, setRan] = useState(false);
  return (
    <div>
      <pre className="overflow-x-auto rounded-lg border border-line bg-[#faf7f0] p-3 font-mono text-[11px] leading-[1.6] text-ink">{`import matplotlib.pyplot as plt
v = [1, 2, 3, 4]
i = [0.2, 0.41, 0.59, 0.8]
print("R =", round(v[-1]/i[-1], 2), "ohm")
plt.plot(v, i, marker="o")
plt.show()`}</pre>
      <button
        type="button"
        onClick={() => setRan((r) => !r)}
        className="ui-primary mt-3 flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold"
      >
        <Play className="h-3.5 w-3.5" strokeWidth={2.5} /> {ran ? "Reset" : "Run the code"}
      </button>
      <div className="mt-3 min-h-[8.5rem]">
        {ran ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} /> Verified: ran on this device
            </p>
            <div className="rounded-md bg-[#1f1f1f] px-3 py-2 font-mono text-[11px] text-[#e8e8e8]">R = 5.0 ohm</div>
            <svg viewBox="0 0 160 70" role="img" aria-label="Graph of current against voltage" className="w-full rounded-md border border-line bg-white">
              <line x1="14" y1="58" x2="150" y2="58" stroke="#9ca3af" strokeWidth="1" />
              <line x1="14" y1="8" x2="14" y2="58" stroke="#9ca3af" strokeWidth="1" />
              <polyline points="28,50 68,38 108,26 146,12" fill="none" stroke="#c2410c" strokeWidth="2" />
              {[[28, 50], [68, 38], [108, 26], [146, 12]].map(([x, y]) => (
                <circle key={x} cx={x} cy={y} r="3" fill="#c2410c" />
              ))}
            </svg>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line bg-paper/60 p-3 text-[11px] text-ink-soft">
            Press Run. The real output and the graph appear here, ready to go into your record.
          </p>
        )}
      </div>
    </div>
  );
}

const MARQUEE = ["Every department", "Run the code", "Real output", "Graphs", "College sheet", "Page border", "Heading table", "Manual calculation", "Share a link", "Works offline", "A4 pagination"];


/** Small "PAGE 0N / 06" mono label — the landing page's own section counter,
 * echoing the "PAGE 01 / 03" caption the product prints under every preview
 * page (see PreviewPanel.tsx) rather than a decorative eyebrow. */
function PageLabel({ n, children }: { n: number; children?: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
      Page {String(n).padStart(2, "0")} / {String(TOTAL_PAGES).padStart(2, "0")}
      {children ? <span className="text-ink-soft/40"> — {children}</span> : null}
    </p>
  );
}

export function LandingPageClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0, scale: 1 });
        return;
      }

      // One orchestrated entrance for the hero: text rises in first, the
      // notebook-page mockup settles into place after, like a page being
      // laid down on the desk.
      gsap
        .timeline({ defaults: { ease: "power2.out", duration: 0.6 } })
        .from("[data-hero-text] > *", { opacity: 0, y: 16, stagger: 0.08 });

      // `<main>` (not the window) is the actual scroll container — it's
      // `fixed inset-0 overflow-y-auto` so the page itself never scrolls.
      // Every ScrollTrigger below must watch it explicitly, or the trigger
      // never fires (window scroll position never changes) and content
      // stays stuck at the gsap.from() starting opacity of 0 forever.
      const scroller = rootRef.current;

      // Every other full-screen section reveals once as it scrolls into
      // view — a single, consistent motion language rather than a
      // different effect per section.
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        gsap.from(group.querySelectorAll("[data-reveal]"), {
          opacity: 0,
          y: 24,
          stagger: 0.06,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: group, scroller, start: "top 72%", toggleActions: "play none none none" },
        });
      });

      // Index rows read as a checklist being ticked off — the checkmark
      // pops in slightly after its row settles, tied to the content's own
      // sequence rather than a generic fade.
      gsap.utils.toArray<HTMLElement>("[data-check]").forEach((check) => {
        gsap.from(check, {
          scale: 0,
          opacity: 0,
          duration: 0.4,
          ease: "back.out(2.2)",
          scrollTrigger: { trigger: check, scroller, start: "top 85%", toggleActions: "play none none none" },
          delay: 0.25,
        });
      });

      ScrollTrigger.refresh();
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className="fixed inset-0 scroll-pt-24 overflow-y-auto overflow-x-hidden app-canvas text-ink">
      <header className="pointer-events-none sticky top-3 z-30 px-3 sm:px-5">
        <div className="pointer-events-auto ui-panel !rounded-full mx-auto flex max-w-[66rem] items-center justify-between gap-4 py-2 pl-4 pr-2 sm:pl-5">
          <span className="flex items-center gap-2 font-serif text-lg font-bold tracking-tight">
            <Image src="/icons/record-lab.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-[9px]" unoptimized />
            Record Lab
          </span>
          <nav aria-label="Sections" className="hidden items-center gap-6 text-xs font-semibold text-ink-soft md:flex">
            <a href="#see-it" className="transition-colors hover:text-accent">See it</a>
            <a href="#index" className="transition-colors hover:text-accent">Features</a>
            <a href="#how" className="transition-colors hover:text-accent">How it works</a>
            <a href="#faq" className="transition-colors hover:text-accent">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5">
            {canInstall && (
              <button
                type="button"
                onClick={install}
                className="ui-chip hidden items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink-soft hover:text-accent-ink sm:flex"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
                Install
              </button>
            )}
            <Link
              href="/editor"
              className="ui-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
            >
              Open the app
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section aria-label="Record Lab" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[44rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-accent/[0.09] blur-3xl" />
        <div aria-hidden className="lp-grain pointer-events-none absolute inset-x-0 top-0 h-[34rem] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <ContainerScroll
          scrollContainer={rootRef}
          titleComponent={
            <div data-hero-text className="relative mx-auto max-w-3xl px-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b3261e]">
                Lab records, done properly
              </p>
              <h1 className="mt-4 text-balance font-serif text-[2.6rem] font-bold leading-[1.03] tracking-[-0.02em] text-ink sm:text-7xl">
                Straight to the fair copy.
              </h1>
              <p className="mt-4 ui-chip inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft">
                For every department, not just CSE
              </p>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-[1.05rem] leading-relaxed text-ink-soft sm:text-xl">
                Set up your department&apos;s sections once, write or generate the record, run the code for real output, and
                let Record Lab lay it out on true A4 pages with your register number watermarked. No rewriting it out by hand the night before.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/editor"
                  className="ui-primary flex min-h-12 items-center gap-2 px-7 text-[15px] font-semibold"
                >
                  Start your fair copy
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
                <a
                  href="#index"
                  className="border-b border-line pb-0.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
                >
                  See the index
                </a>
              </div>
              <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-ink-soft">
                {["Free, in your browser", "Any department", "Runs your code", "Works offline"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-accent" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          }
        >
          <Image
            src="/landing/app-screenshot.webp"
            alt="The Record Lab editor: record details on the left, the live A4 preview on the right"
            width={2000}
            height={1234}
            priority
            draggable={false}
            className="mx-auto h-full w-full rounded-xl object-contain object-center sm:rounded-2xl sm:object-cover sm:object-left-top"
          />
        </ContainerScroll>
      </section>

      {/* ============ MARQUEE ============ */}
      <div aria-hidden className="lp-marquee mx-3 overflow-hidden rounded-full bg-ink/95 py-3 text-paper shadow-[0_14px_34px_-16px_rgba(28,43,51,0.55)] sm:mx-6">
        <div className="lp-marquee-track flex w-max gap-10 whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i} className="flex items-center gap-10">
              {w}
              <span className="text-accent">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ============ SEE IT ============ */}
      <section id="see-it" data-reveal-group className="lp-grain px-5 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <div data-reveal className="text-center">
            <PageLabel n={2}>See it</PageLabel>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance font-serif text-4xl font-bold tracking-[-0.02em] sm:text-6xl">
              The fiddly parts, already handled.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
              Try the parts that take students the longest: setting up the record for their department, getting real
              output, screenshots, the heading table, and keeping records organised.
            </p>
          </div>

          <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
            {[
              {
                icon: GraduationCap,
                title: "Every department",
                body: "Pick a layout for your lab, or build your own list of sections.",
                demo: <DepartmentDemo />,
              },
              {
                icon: Play,
                title: "Run it, keep the output",
                body: "Run the program and get the real console output and graphs, marked as verified.",
                demo: <RunDemo />,
              },
              {
                icon: TerminalSquare,
                title: "Output screenshots",
                body: "Paste what your program printed. Get a clean terminal image in your OS's style.",
                demo: <TerminalDemo />,
              },
              {
                icon: Rows3,
                title: "Heading table",
                body: "Boxed, open or ruled. Every border line and the rule underneath is yours to set.",
                demo: <HeaderDemo />,
              },
              {
                icon: Folder,
                title: "Subject folders",
                body: "One folder per subject. Drag records in, find any of them in seconds.",
                demo: <SubjectsDemo />,
              },
            ].map(({ icon: Icon, title, body, demo }) => (
              <article
                key={title}
                data-reveal
                className="flex w-[84vw] max-w-sm shrink-0 snap-center flex-col ui-card p-6 transition-shadow hover:shadow-[0_24px_50px_-24px_rgba(28,43,51,0.45)] md:w-auto md:max-w-none"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <h3 className="mt-4 font-serif text-xl font-bold tracking-tight text-ink">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{body}</p>
                <div className="mt-4 flex-1">{demo}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="px-5 py-6 sm:py-10">
        <AdSlot name="Landing, after features" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LANDING_1} />
      </div>

      {/* ============ INDEX ============ */}
      <section
        id="index"
        data-reveal-group
        className="px-5 py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-4xl">
          <div data-reveal className="text-center">
            <PageLabel n={3}>Index</PageLabel>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-[-0.02em] sm:text-6xl">Everything in the index.</h2>
          </div>

          <div data-reveal className="mt-12 ui-card overflow-hidden">
            <div className="hidden grid-cols-[44px_1fr_28px] border-b border-line bg-black/[0.03] px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70 sm:grid sm:grid-cols-[56px_1fr_36px]">
              <span>S.No</span>
              <span>Particulars</span>
              <span className="text-right">✓</span>
            </div>
            {index.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="grid grid-cols-[1fr_24px] items-start gap-3 border-b border-line/70 px-5 py-4 last:border-b-0 transition-colors hover:bg-white/70 sm:grid-cols-[56px_1fr_36px] sm:items-center sm:gap-4 sm:px-6"
              >
                <span className="hidden font-mono text-sm font-semibold text-[#b3261e]/80 sm:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-start gap-3.5 sm:items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-ink">{title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{body}</p>
                  </div>
                </div>
                <span className="flex justify-end pt-1 sm:pt-0">
                  <Check data-check className="h-4 w-4 text-[#b3261e]" strokeWidth={3} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STEPS ============ */}
      <section
        id="how"
        data-reveal-group
        className="px-5 py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-5xl">
          <div data-reveal className="text-center">
            <PageLabel n={4}>How it works</PageLabel>
            <h2 className="mt-3 text-balance font-serif text-4xl font-bold tracking-[-0.02em] sm:text-6xl">
              Three steps, no formatting.
            </h2>
          </div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {steps.map(({ n, t, d }) => (
              <li key={n} data-reveal className="ui-card p-6 sm:p-7">
                <span className="font-serif text-5xl font-bold leading-none tracking-tight text-accent/30">{n}</span>
                <h3 className="mt-4 font-serif text-xl font-bold tracking-tight text-ink">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" data-reveal-group className="px-5 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-3xl">
          <div data-reveal className="text-center">
            <PageLabel n={5}>Questions</PageLabel>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-[-0.02em] sm:text-6xl">Before you start.</h2>
          </div>
          <div className="mt-12 ui-card divide-y divide-line/70 px-5 sm:px-7">
            {faqs.map(({ q, a }) => (
              <details key={q} data-reveal className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" strokeWidth={2.25} />
                </summary>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section data-reveal-group className="px-4 py-16 sm:px-5 sm:py-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.25rem] bg-ink px-6 py-16 text-center text-paper sm:rounded-[3rem] sm:py-24">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] max-w-[120%] -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
          <div data-reveal className="relative">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/50">
              Page {String(6).padStart(2, "0")} / {String(TOTAL_PAGES).padStart(2, "0")} — Get started
            </p>
          </div>
          <FolderOpen data-reveal className="relative mx-auto mt-6 h-8 w-8 text-accent" strokeWidth={1.75} />
          <h2 data-reveal className="relative mx-auto mt-5 max-w-xl text-balance font-serif text-4xl font-bold tracking-[-0.02em] sm:text-6xl">
            Stop redoing the fair copy.
          </h2>
          <p data-reveal className="relative mx-auto mt-4 max-w-md text-base text-paper/70 sm:text-lg">
            Free, runs in your browser, nothing to install.
          </p>
          <Link
            data-reveal
            href="/editor"
            className="ui-primary relative mt-9 inline-flex min-h-12 items-center gap-2 px-8 text-[15px] font-semibold"
          >
            Open Record Lab
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      {/* ============ CONTRIBUTORS ============ */}
      <section
        data-reveal-group
      >
        <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:py-28">
          <div data-reveal className="text-center">
            <PageLabel n={7}>Credits</PageLabel>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-[-0.02em] sm:text-6xl">Built by.</h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5">
            {contributors.map((person) => (
              <div key={person.name} data-reveal className={`ui-card p-6${person.links.length === 0 ? " sm:col-span-2" : ""}`}>
                <h3 className="font-serif text-xl font-bold tracking-tight text-ink">{person.name}</h3>
                <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                  {person.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{person.bio}</p>
                <div className={`flex flex-wrap gap-2 ${person.links.length ? "mt-4" : ""}`}>
                  {person.links.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      className="ui-chip flex min-h-9 items-center gap-1.5 px-3.5 text-xs font-semibold text-ink-soft hover:text-accent-ink"
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="px-5 pb-8">
        <AdSlot name="Landing, above footer" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LANDING_2} />
      </div>

      <footer className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-[2rem] bg-ink px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-paper shadow-[0_24px_60px_-28px_rgba(28,43,51,0.7)] sm:flex-row sm:justify-between sm:px-9 sm:text-left">
          <a
            href={BRAND.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${BRAND.name} (opens ${BRAND.url})`}
            className="shrink-0 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <Image
              src="/brand/cogniheim-logo.webp"
              alt={BRAND.name}
              width={1500}
              height={440}
              className="h-12 w-auto sm:h-14"
            />
          </a>
          <div className="max-w-md text-xs leading-relaxed text-paper/60">
            <p className="font-semibold text-paper/85">Record Lab is a {BRAND.name} product.</p>
            <p className="mt-1">Specially curated for Crescent CSE students, built for lab-record season.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
