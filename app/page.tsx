import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

const title = "Record Lab — Straight to the fair copy";
const description =
  "Lab records for every department — pick your sections, run your code for real output, and get a print-ready fair copy.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Record Lab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function HomePage() {
  return <LandingPageClient />;
}
