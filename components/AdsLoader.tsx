"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { useShowAds } from "@/lib/billing";

/**
 * Adds Google's ad script, unless the person is on Pro. (The AdSense verification meta tag stays in the page
 * head for everyone. Signed-out visitors, and Google's own crawler, still get the script.)
 */
export function AdsLoader() {
  const show = useShowAds();
  useEffect(() => {
    if (!show || document.querySelector("script[data-adsense-loader]")) return;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.dataset.adsenseLoader = "1";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
  }, [show]);
  return null;
}
