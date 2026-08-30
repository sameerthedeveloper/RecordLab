import type { Metadata } from "next";
import Script from "next/script";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sansFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://record-lab.vercel.app"),
  title: "Record Lab",
  description: "Type your lab record once — Record Lab paginates it to true A4 pages and exports a print-ready fair copy.",
  openGraph: {
    title: "Record Lab",
    description: "Type your lab record once — Record Lab paginates it to true A4 pages and exports a print-ready fair copy.",
    siteName: "Record Lab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Record Lab",
    description: "Type your lab record once — Record Lab paginates it to true A4 pages and exports a print-ready fair copy.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0,0"
        />
      </head>
      <body>
        {children}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
