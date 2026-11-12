"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { useShowAds } from "@/lib/billing";

interface AdSlotProps {
  /** AdSense ad-unit id (data-ad-slot). Without it, or without NEXT_PUBLIC_ADSENSE_CLIENT, a placeholder is shown. */
  slot?: string;
  /** Shape of the reserved space, so the page doesn't jump when the ad loads. */
  shape?: "banner" | "rectangle" | "small";
  /** Short name for the placeholder, e.g. "Landing, after features". */
  name: string;
  className?: string;
}

const CLIENT = ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Ad space. With NEXT_PUBLIC_ADSENSE_CLIENT and a slot id set, it renders a real AdSense unit
 * (the loader script is added in app/layout.tsx). Until then it is a labelled, fixed-size
 * placeholder, so layouts are designed around the ad before one is live. Never used in the editor.
 */
export function AdSlot({ slot, shape = "banner", name, className = "" }: AdSlotProps) {
  const show = useShowAds();
  const live = Boolean(CLIENT && slot);
  const pushed = useRef(false);

  useEffect(() => {
    if (!show || !live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked by an ad blocker: the reserved space just stays empty */
    }
  }, [show, live]);

  const size = shape === "banner" ? "min-h-[90px] max-w-3xl" : shape === "small" ? "h-[60px] max-w-[234px]" : "min-h-[250px] max-w-sm";
  const height = shape === "banner" ? 90 : shape === "small" ? 60 : 250;

  // Pro members see no ads, and no empty space where they would be.
  if (!show) return null;

  return (
    <aside aria-label="Advertisement" className={`mx-auto w-full ${size} ${className}`}>
      {live ? (
        <ins
          className="adsbygoogle block h-full w-full"
          style={{ display: "block", minHeight: height }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-ad-format={shape === "rectangle" ? "rectangle" : "horizontal"}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          data-ad-placeholder={name}
          className={`relative flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-white/70 to-ink/[0.035] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
            shape === "banner" ? "min-h-[90px]" : shape === "small" ? "h-[60px]" : "min-h-[250px]"
          }`}
        >
          <span aria-hidden className="absolute left-2.5 top-1.5 rounded-[4px] border border-ink/15 px-1 font-mono text-[8.5px] font-semibold uppercase leading-[1.4] tracking-[0.12em] text-ink-soft/55">
            Ad
          </span>
          {shape !== "small" && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/55">Advertisement</span>
          )}
          <span className="text-[11.5px] font-medium text-ink-soft/70">Ads will be placed here</span>
          <span className="sr-only">{name}</span>
        </div>
      )}
    </aside>
  );
}
