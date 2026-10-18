"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";

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
  const live = Boolean(CLIENT && slot);
  const pushed = useRef(false);

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked by an ad blocker: the reserved space just stays empty */
    }
  }, [live]);

  const size = shape === "banner" ? "min-h-[90px] max-w-3xl" : shape === "small" ? "h-[60px] max-w-[234px]" : "min-h-[250px] max-w-sm";
  const height = shape === "banner" ? 90 : shape === "small" ? 60 : 250;

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
          className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-ink/20 bg-ink/[0.025] px-3 text-center ${
            shape === "banner" ? "min-h-[90px]" : shape === "small" ? "h-[60px]" : "min-h-[250px]"
          }`}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">Advertisement</span>
          <span className="text-[11px] text-ink-soft/50">
            {name} · {shape === "banner" ? "728×90 responsive" : shape === "small" ? "234×60" : "300×250"}
          </span>
        </div>
      )}
    </aside>
  );
}
