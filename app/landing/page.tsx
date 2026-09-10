import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

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

export default function LandingPage() {
  return <LandingPageClient />;
}
