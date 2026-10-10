import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/editor",
    name: "Record Lab",
    short_name: "Record Lab",
    description: "Type your lab record once and export a print-ready fair copy.",
    start_url: "/editor?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf7f0",
    theme_color: "#faf7f0",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New record", short_name: "New", url: "/editor?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My records", short_name: "Records", url: "/dashboard?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
