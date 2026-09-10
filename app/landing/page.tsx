import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Cloud,
  ExternalLink,
  FileDown,
  FolderOpen,
  Globe,
  Layers,
  Mail,
  Ruler,
  Save,
  Sparkles,
  Stamp,
} from "lucide-react";

const title = "Record Lab — Straight to the fair copy";
const description =
  "Specially curated for Crescent CSE students — type your lab record once, get a print-ready fair copy.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/landing",
    siteName: "Record Lab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const index = [
  {
    icon: Sparkles,
    title: "AI-assisted drafting",
    body: "Paste a program or describe the experiment — Record Lab drafts the aim, algorithm, and viva questions for you to check over.",
  },
  {
    icon: Ruler,
    title: "True-to-scale A4 layout",
    body: "Every section is measured against real A4 dimensions, so the preview on screen is the page you hand in.",
  },
  {
    icon: Stamp,
    title: "Register-number watermark",
    body: "A faint, rotated watermark of your RRN sits behind every page — set its size, angle, and opacity to taste.",
  },
  {
    icon: FileDown,
    title: "One-click PDF export",
    body: "Export a print-ready PDF with correct margins and page breaks already in place — nothing to nudge into position.",
  },
  {
    icon: Save,
    title: "Save & resume, offline",
    body: "Export a record as a .rlab.json file partway through and pick it back up later, on this device or another.",
  },
  {
    icon: Cloud,
    title: "Cloud sync with Google",
    body: "Sign in with Google to save records to your account, browse them under My Documents, and pick up where you left off on any device.",
  },
  {
    icon: Layers,
    title: "Automatic pagination",
    body: "Long code listings and multi-image outputs split across pages on their own, never mid-line or mid-image.",
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

export default function LandingPage() {
  return (
    <main className="fixed inset-0 overflow-y-auto bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <span className="font-serif text-lg font-bold tracking-tight">Record Lab</span>
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
      <section className="mx-auto grid max-w-5xl gap-12 px-5 pb-20 pt-16 sm:pt-20 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b3261e]">
            Skip the rough copy
          </p>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Straight to the fair copy.
          </h1>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            Curated for Crescent CSE students
          </p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            Type the aim, algorithm, and code once. Record Lab lays it out on true A4
            pages, watermarks your register number, and hands you the fair copy —
            no rewriting it out by hand the night before.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
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
        </div>

        {/* Ruled-page mockup — the product's own output, drawn as a stack */}
        <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px]">
          <div className="absolute inset-0 translate-x-3 translate-y-4 rotate-3 rounded-sm border border-line bg-white" />
          <div
            className="relative rotate-[-2deg] rounded-sm border border-line bg-white p-5 shadow-[0_18px_40px_-16px_rgba(28,43,51,0.35)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent, transparent 26px, rgba(96,132,199,0.22) 27px)",
              backgroundPosition: "0 38px",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-8 w-px bg-[#c0392b]/45"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-8 select-none whitespace-nowrap font-serif text-3xl font-bold text-ink/[0.05]"
              style={{ transform: "rotate(-28deg)" }}
            >
              24CS118
            </span>
            <div className="pl-6">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b3261e]">
                Aim
              </p>
              <p className="mt-1 text-[11.5px] leading-[1.7] text-ink/80">
                To construct a binary search tree and perform insertion, deletion,
                and inorder traversal on it.
              </p>
              <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b3261e]">
                Algorithm
              </p>
              <p className="mt-1 font-mono text-[10.5px] leading-[1.8] text-ink/70">
                1. Start&nbsp;&nbsp;2. Read the value&nbsp;&nbsp;3. If root is
                empty, insert&nbsp;&nbsp;4. Else recurse left or right
              </p>
              <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b3261e]">
                Result
              </p>
              <p className="mt-1 text-[11.5px] leading-[1.7] text-ink/80">
                Thus the program was executed and the output verified.
              </p>
            </div>
            <p className="mt-4 border-t border-line pt-2 pl-6 text-right font-mono text-[9px] text-ink-soft/60">
              Page 1 of 3
            </p>
          </div>
        </div>
      </section>

      {/* ============ CERTIFICATE ============ */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-5 py-14 text-center sm:flex-row sm:text-left">
          <p className="flex-1 font-serif text-lg italic leading-relaxed text-ink/85 sm:text-xl">
            &ldquo;Certified to be the bonafide format of the laboratory record
            submitted by every student who has ever rewritten a page at 1&nbsp;a.m. —
            laid out to true A4 measurements, register number watermarked
            throughout, no stray page breaks.&rdquo;
          </p>
          <div
            className="flex h-24 w-24 shrink-0 rotate-[-8deg] items-center justify-center rounded-full border-2 border-dashed border-[#b3261e]/60 text-center font-mono text-[10px] font-bold uppercase leading-tight tracking-[0.08em] text-[#b3261e]/80"
          >
            Format
            <br />
            Verified
          </div>
        </div>
      </section>

      {/* ============ INDEX ============ */}
      <section id="index" className="mx-auto max-w-5xl px-5 py-20">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
          Page 2
        </p>
        <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Index.
        </h2>

        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-white">
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
                <Check className="h-4 w-4 text-[#b3261e]" strokeWidth={3} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ STEPS ============ */}
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

      {/* ============ CLOSING CTA ============ */}
      <section className="mx-auto max-w-5xl px-5 py-24 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-accent" strokeWidth={1.75} />
        <h2 className="mx-auto mt-5 max-w-lg font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Stop redoing the fair copy.
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

      {/* ============ CONTRIBUTORS ============ */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
            Credits
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Built by.
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {contributors.map((person) => (
              <div key={person.name} className="rounded-2xl border border-line bg-[#faf7f0] p-5">
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
          Record Lab — specially curated for Crescent CSE students, built for lab-record season.
        </div>
      </footer>
    </main>
  );
}
