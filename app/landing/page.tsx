import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  FileDown,
  FolderOpen,
  Layers,
  Ruler,
  Save,
  Sparkles,
  Stamp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Record Lab — Lab records, typed and printed right",
};

const features = [
  {
    icon: Sparkles,
    title: "AI-assisted entry",
    body: "Paste a program or describe an experiment — Record Lab drafts the aim, algorithm, and viva questions for you to refine.",
  },
  {
    icon: Ruler,
    title: "Exact page layout",
    body: "Every section is measured against real A4 dimensions, so what you see in preview is the page you'll hand in.",
  },
  {
    icon: Stamp,
    title: "Register-number watermark",
    body: "A faint, rotated watermark of your RRN sits behind every page — tune its size, angle, and opacity to taste.",
  },
  {
    icon: FileDown,
    title: "One-click PDF",
    body: "Export a print-ready PDF with correct margins and page breaks — no manual page-fitting in Word.",
  },
  {
    icon: Save,
    title: "Save your work",
    body: "Export a record as a .rlab.json file partway through and pick it back up later, on this device or another.",
  },
  {
    icon: Layers,
    title: "Smart pagination",
    body: "Long code listings and multi-image outputs split across pages automatically, never mid-line or mid-image.",
  },
];

const steps = [
  { n: "01", t: "Fill in the record", d: "Aim, algorithm, source code, output, and result — one panel, no formatting fuss." },
  { n: "02", t: "Watch it paginate", d: "The live preview lays out real A4 pages as you type, matching what will print." },
  { n: "03", t: "Export or print", d: "Save a PDF, print directly, or save your work to finish later." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-lg font-bold tracking-tight">Record Lab</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover"
          >
            Open the app
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-16 sm:pt-24">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
          Lab Notebook, Digitized
        </p>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Lab records that look right the first time.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Type your aim, algorithm, and code once. Record Lab paginates it onto real A4
          pages, watermarks it with your register number, and hands you a PDF ready to print.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:bg-accent-ink"
          >
            Start a record
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <a
            href="#features"
            className="border-b border-line pb-0.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
          >
            See what it does
          </a>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-none sm:grid-cols-4">
          {[
            ["A4", "measured page layout"],
            ["1", "click PDF export"],
            [".rlab.json", "save & resume"],
            ["Auto", "pagination"],
          ].map(([stat, label]) => (
            <div key={label} className="border border-line bg-white px-5 py-6 -m-px">
              <p className="font-serif text-2xl font-bold text-accent-ink">{stat}</p>
              <p className="mt-1 text-xs text-ink-soft">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-5 py-20">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
          What&apos;s inside
        </p>
        <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Everything a printed record needs.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm transition-all hover:border-accent/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
            How it works
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps, no formatting.
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map(({ n, t, d }) => (
              <li key={n} className="border-t border-line pt-5">
                <span className="font-mono text-xs font-semibold text-accent">{n}</span>
                <h3 className="mt-2 text-sm font-bold text-ink">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-24 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-accent" strokeWidth={1.75} />
        <h2 className="mx-auto mt-5 max-w-lg font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Stop reformatting the same record twice.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
          Free, runs in your browser, nothing to install.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:bg-accent-ink"
        >
          Open Record Lab
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-8 text-xs text-ink-soft/70">
          Record Lab — built for lab-record season.
        </div>
      </footer>
    </main>
  );
}
