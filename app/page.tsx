import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { FAQS } from "@/lib/landingContent";
import { BRAND, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const title = "Record Lab: lab records for every department, with real output";

export const metadata: Metadata = {
  title: { absolute: title },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE_DESCRIPTION,
  },
};

/** Structured data for search and answer engines: what the app is, who makes it, the FAQ, and how it works. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BRAND.url}/#org`,
      name: BRAND.name,
      url: BRAND.url,
      logo: `${SITE_URL}/icons/icon-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${BRAND.url}/#org` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any (web browser, installable PWA on Android, iOS and desktop)",
      browserRequirements: "Requires a modern browser with JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      screenshot: `${SITE_URL}/landing/app-screenshot.webp`,
      image: `${SITE_URL}/opengraph-image.jpg`,
      inLanguage: "en",
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      featureList: [
        "Record layouts for every department (programming, physics, chemistry, electronics, mechanical, civil, or custom)",
        "Run Python, JavaScript, C, C++ and Java and keep the real output and graphs",
        "Department-aware AI drafting",
        "True-to-scale A4 preview with automatic pagination",
        "Standard and college-sheet formats, page border, heading table and watermark",
        "Export to PDF or Word, print, or share an editable link",
        "Subject folders, cloud sync and offline use as an installable app",
      ],
      author: { "@type": "Person", name: "Mohamed Sameer S", url: "https://mohamedsameer.tech" },
      publisher: { "@id": `${BRAND.url}/#org` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@type": "HowTo",
      "@id": `${SITE_URL}/#howto`,
      name: "How to make a lab record with Record Lab",
      step: [
        { "@type": "HowToStep", position: 1, name: "Pick your layout", text: "Choose your department or build your own sections once. Every record in a subject starts from it." },
        { "@type": "HowToStep", position: 2, name: "Write it, or let AI draft it, then run it", text: "Type the sections, or generate them for your department. Run the code to capture the real output and graphs." },
        { "@type": "HowToStep", position: 3, name: "Check the pages, then export", text: "The live preview lays out real A4 pages. Save a PDF or Word file, print it, or share a link." },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingPageClient />
    </>
  );
}
