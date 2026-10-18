import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBadge } from "@/components/OfflineBadge";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

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

// viewport-fit=cover lets the mobile tab bar extend under the iOS home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Fixed scale: the app is a self-contained, app-like surface (no pinch / double-tap zoom).
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#faf7f0",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  category: "education",
  verification: { google: "o2QjTRyQcv-xTaXC7mIn5LLCGwcbgy4dMJNSKNPBMKw" },
  keywords: [
    "online lab record maker",
    "lab record maker online",
    "free lab record maker",
    "online lab record generator",
    "practical record maker",
    "lab manual maker",
    "record book maker",
    "college lab record online",
    "lab record",
    "lab record maker",
    "practical record",
    "record notebook",
    "fair copy",
    "engineering lab record",
    "physics lab record",
    "chemistry lab record",
    "electronics lab record",
    "mechanical lab record",
    "run code online",
    "A4 PDF",
    "register number watermark",
  ],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  applicationName: "Record Lab",
  appleWebApp: { capable: true, title: "Record Lab", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  creator: "Cogniheim",
  publisher: "Cogniheim",
  title: "Record Lab: Free Online Lab Record Maker for Every Department",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Record Lab: Free Online Lab Record Maker",
    description: SITE_DESCRIPTION,
    siteName: "Record Lab",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Record Lab: Free Online Lab Record Maker",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
      <head>
        {/* Set the saved UI style before first paint so the app doesn't flash the wrong look. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var s=JSON.parse(localStorage.getItem("recordlab-settings-v1")||"{}");document.documentElement.dataset.ui=s.uiStyle==="classic"?"classic":"apple"}catch(e){document.documentElement.dataset.ui="apple"}',
          }}
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0,0"
        />
        {/* Google AdSense: account verification meta tag and loader, both in <head>. */}
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <PwaRegister />
        <OfflineBadge />
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
