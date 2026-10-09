"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Cloud,
  ExternalLink,
  FileDown,
  Folder,
  FolderOpen,
  Globe,
  Layers,
  Mail,
  Rows3,
  Ruler,
  Save,
  Sparkles,
  Stamp,
  TerminalSquare,
} from "lucide-react";

const index = [
  {
    icon: Sparkles,
    title: "AI-assisted drafting",
    body: "Paste a program or describe the experiment. Record Lab drafts the aim, algorithm and viva questions for you to check over.",
  },
  {
    icon: Ruler,
    title: "True-to-scale A4 layout",
    body: "Every section is measured against real A4 dimensions, so the preview on screen is the page you hand in.",
  },
  {
    icon: TerminalSquare,
    title: "Terminal-style output screenshots",
    body: "Turn program output into a macOS, Linux, CMD or PowerShell screenshot in one click. Edit it again any time.",
  },
  {
    icon: Rows3,
    title: "Heading table, your way",
    body: "Word-style borders for the title table, line by line, plus an optional rule underneath like a hand-ruled record.",
  },
  {
    icon: Stamp,
    title: "Register-number watermark",
    body: "A faint, rotated watermark of your RRN sits behind every page. Set its font, size, angle and opacity.",
  },
  {
    icon: FileDown,
    title: "PDF, Word or print",
    body: "Export a print-ready PDF (picture-perfect or selectable-text), a Word file, or send it straight to the printer.",
  },
  {
    icon: Folder,
    title: "Subject folders",
    body: "Keep every record under its subject. Drag files between folders, rename them, search across all of it.",
  },
  {
    icon: Cloud,
    title: "Cloud sync, any sign-in",
    body: "Sign in with email or Google. Records save to your account and pick up where you left off on any device.",
  },
  {
    icon: Save,
    title: "Save & resume, offline",
    body: "Export a .rlab.json file partway through and continue later on this device or another.",
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
    a: "Yes. Record Lab runs in your browser, there is nothing to install and no payment step.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can write, preview and export without signing in. An account (email or Google) only adds cloud saving, subject folders and sync across devices.",
  },
  {
    q: "What can I export?",
    a: "A PDF (rendered snapshot or vector with selectable text), a Word .docx you can keep editing, or print directly. Your .rlab.json file saves work-in-progress.",
  },
  {
    q: "Will it match my college's record format?",
    a: "The layout follows the usual lab-record structure: heading table, aim, algorithm, program, output, result. The heading table's borders, watermark and font are adjustable, so you can match your department's sheet.",
  },
  {
    q: "Where is my data stored?",
    a: "Unsaved work stays in your browser. If you save to the cloud, records live in your own account and are visible only to you.",
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
];

const steps = [
  { n: "01", t: "Fill in the record", d: "Aim, algorithm, source code, output, and result — one panel, no formatting fuss." },
  { n: "02", t: "Watch it paginate", d: "The live preview lays out real A4 pages as you type, matching what will print." },
  { n: "03", t: "Export the fair copy", d: "Save a PDF, print directly, or save your work to finish later." },
];

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
      <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-line bg-paper p-1" role="tablist" aria-label="Terminal style">
        {(Object.keys(TERMS) as TermId[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={id === k}
            onClick={() => setId(k)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
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
          <div>Name: Sameer   RRN: 24CS118</div>
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
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper p-1" role="tablist" aria-label="Heading style">
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
            className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
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
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
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


const MARQUEE = ["Aim", "Algorithm", "Source code", "Output", "Review questions", "Result", "Heading table", "Watermark", "A4 pagination"];


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
    <main ref={rootRef} className="fixed inset-0 overflow-y-auto bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[66rem] items-center justify-between gap-4 px-5 py-4">
          <span className="flex items-center gap-2 font-serif text-lg font-bold tracking-tight">
            <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-ink font-serif text-[11px] text-paper">RL</span>
            Record Lab
          </span>
          <nav aria-label="Sections" className="hidden items-center gap-6 text-xs font-semibold text-ink-soft md:flex">
            <a href="#see-it" className="transition-colors hover:text-accent">See it</a>
            <a href="#index" className="transition-colors hover:text-accent">Index</a>
            <a href="#how" className="transition-colors hover:text-accent">How it works</a>
            <a href="#faq" className="transition-colors hover:text-accent">FAQ</a>
          </nav>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover"
          >
            Open the app
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section aria-label="Record Lab" className="relative overflow-hidden bg-paper">
        <div aria-hidden className="lp-grain pointer-events-none absolute inset-x-0 top-0 h-[34rem] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <ContainerScroll
          scrollContainer={rootRef}
          titleComponent={
            <div data-hero-text className="relative mx-auto max-w-3xl px-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b3261e]">
                Skip the rough copy
              </p>
              <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.06] tracking-tight text-ink sm:text-6xl">
                Straight to the fair copy.
              </h1>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft">
                Curated for Crescent CSE students
              </p>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                Type the aim, algorithm, and code once. Record Lab lays it out on true A4 pages, watermarks your
                register number, and hands you the fair copy. No rewriting it out by hand the night before.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:bg-accent-ink"
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
                {["Free, in your browser", "PDF + Word + print", "No sign-in needed"].map((t) => (
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
            className="mx-auto h-full w-full rounded-2xl object-cover object-left-top"
          />
        </ContainerScroll>
      </section>

      {/* ============ MARQUEE ============ */}
      <div aria-hidden className="lp-marquee overflow-hidden border-y border-line bg-ink py-3 text-paper">
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
      <section id="see-it" data-reveal-group className="lp-grain px-5 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-5xl">
          <div data-reveal>
            <PageLabel n={2}>See it</PageLabel>
            <h2 className="mt-3 max-w-xl font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              The fiddly parts, already handled.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              Try the three things students spend the most time on: output screenshots, the heading table, and keeping
              records organised.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
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
                className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(28,43,51,0.05)] transition-shadow hover:shadow-[0_18px_40px_-22px_rgba(28,43,51,0.4)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <h3 className="mt-3 font-serif text-lg font-bold text-ink">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{body}</p>
                <div className="mt-4 flex-1">{demo}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INDEX ============ */}
      <section
        id="index"
        data-reveal-group
        className="border-t border-line bg-white px-5 py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-5xl">
          <div data-reveal>
            <PageLabel n={3}>Index</PageLabel>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Index.</h2>
          </div>

          <div data-reveal className="mt-10 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(28,43,51,0.05)]">
            <div className="grid grid-cols-[44px_1fr_28px] border-b border-line bg-[#faf7f0] px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70 sm:grid-cols-[56px_1fr_36px]">
              <span>S.No</span>
              <span>Particulars</span>
              <span className="text-right">✓</span>
            </div>
            {index.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="grid grid-cols-[44px_1fr_28px] items-start gap-1 border-b border-line px-5 py-4 last:border-b-0 transition-colors hover:bg-[#faf7f0] sm:grid-cols-[56px_1fr_36px] sm:items-center sm:gap-4"
              >
                <span className="font-mono text-sm font-semibold text-[#b3261e]/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-start gap-3 sm:items-center">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink sm:mt-0" strokeWidth={2} />
                  <div>
                    <h3 className="text-sm font-bold text-ink">{title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{body}</p>
                  </div>
                </div>
                <span className="flex justify-end">
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
        className="border-t border-line py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-5xl px-5">
          <div data-reveal>
            <PageLabel n={4}>How it works</PageLabel>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps, no formatting.
            </h2>
          </div>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map(({ n, t, d }) => (
              <li key={n} data-reveal className="border-t border-line pt-5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#b3261e]/40 font-mono text-[11px] font-bold text-[#b3261e]">
                  {n}
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" data-reveal-group className="border-t border-line bg-white px-5 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-3xl">
          <div data-reveal>
            <PageLabel n={5}>Questions</PageLabel>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Before you start.</h2>
          </div>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map(({ q, a }) => (
              <details key={q} data-reveal className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" strokeWidth={2.25} />
                </summary>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section
        data-reveal-group
        className="flex flex-col items-center justify-center border-t border-line bg-white px-5 py-24 text-center"
      >
        <div data-reveal>
          <PageLabel n={6}>Get started</PageLabel>
        </div>
        <FolderOpen data-reveal className="mx-auto mt-6 h-8 w-8 text-accent" strokeWidth={1.75} />
        <h2 data-reveal className="mx-auto mt-5 max-w-lg font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Stop redoing the fair copy.
        </h2>
        <p data-reveal className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
          Free, runs in your browser, nothing to install.
        </p>
        <Link
          data-reveal
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:bg-accent-ink"
        >
          Open Record Lab
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </section>

      {/* ============ CONTRIBUTORS ============ */}
      <section
        data-reveal-group
        className="border-t border-line"
      >
        <div className="mx-auto w-full max-w-5xl px-5 py-20">
          <div data-reveal>
            <PageLabel n={7}>Credits</PageLabel>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Built by.</h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {contributors.map((person) => (
              <div key={person.name} data-reveal className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(28,43,51,0.05)]">
                <h3 className="font-serif text-lg font-bold text-ink">{person.name}</h3>
                <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                  {person.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{person.bio}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {person.links.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent-ink"
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

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-8 text-xs text-ink-soft/70">
          Record Lab · specially curated for Crescent CSE students, built for lab-record season.
        </div>
      </footer>
    </main>
  );
}
