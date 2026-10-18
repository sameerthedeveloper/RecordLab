import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sitemap",
  description: "Every public page of Record Lab, and the files search and AI crawlers read.",
  alternates: { canonical: "/sitemap" },
};

const PAGES = [
  { href: "/", name: "Home", note: "What Record Lab does, demos, features and FAQ." },
  { href: "/editor", name: "Editor", note: "Write a lab record, run its code, preview the A4 pages and export." },
];

const ON_HOME = [
  { href: "/#see-it", name: "See it", note: "Interactive demos: departments, running code, screenshots, sheet and border." },
  { href: "/#index", name: "Features", note: "Everything the app does, in one list." },
  { href: "/#how", name: "How it works", note: "Three steps from layout to fair copy." },
  { href: "/#faq", name: "Questions", note: "Cost, languages, offline use, data and more." },
];

const FILES = [
  { href: "/sitemap.xml", name: "sitemap.xml", note: "For search engines." },
  { href: "/robots.txt", name: "robots.txt", note: "What crawlers may read." },
  { href: "/llms.txt", name: "llms.txt", note: "A plain summary for AI assistants." },
];

function Group({ title, items }: { title: string; items: { href: string; name: string; note: string }[] }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-bold tracking-tight text-ink">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex flex-col gap-0.5 px-5 py-3.5 transition-colors hover:bg-accent-soft/40 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="shrink-0 text-[15px] font-semibold text-accent-ink sm:w-44">{i.name}</span>
              <span className="text-sm text-ink-soft">{i.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SitemapPage() {
  return (
    <main className="app-canvas fixed inset-0 overflow-y-auto text-ink">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
        <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-accent">
          ← {SITE_NAME}
        </Link>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Sitemap</h1>
        <p className="mt-3 max-w-xl text-ink-soft">Every public page of {SITE_NAME}, and the files that help search engines and AI assistants find them.</p>
        <div className="mt-10 space-y-9">
          <Group title="Pages" items={PAGES} />
          <Group title="On the home page" items={ON_HOME} />
          <Group title="For crawlers and AI" items={FILES} />
        </div>
        <p className="mt-10 text-sm text-ink-soft">
          {SITE_NAME} is a{" "}
          <a href={BRAND.url} className="font-semibold text-accent-ink underline-offset-4 hover:underline" rel="noopener noreferrer" target="_blank">
            {BRAND.name}
          </a>{" "}
          product. Site address: {SITE_URL}.
        </p>
      </div>
    </main>
  );
}
