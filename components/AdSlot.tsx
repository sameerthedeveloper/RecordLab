"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  /** AdSense ad-unit id (data-ad-slot). Without it, or without NEXT_PUBLIC_ADSENSE_CLIENT, a placeholder is shown. */
  slot?: string;
  /** Shape of the reserved space, so the page doesn't jump when the ad loads. */
  shape?: "banner" | "rectangle";
  /** Short name for the placeholder, e.g. "Landing, after features". */
  name: string;
  className?: string;
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

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

  const size = shape === "banner" ? "min-h-[90px] max-w-3xl" : "min-h-[250px] max-w-sm";

  return (
    <aside aria-label="Advertisement" className={`mx-auto w-full ${size} ${className}`}>
      {live ? (
        <ins
          className="adsbygoogle block h-full w-full"
          style={{ display: "block", minHeight: shape === "banner" ? 90 : 250 }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-ad-format={shape === "banner" ? "horizontal" : "rectangle"}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          data-ad-placeholder={name}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink/20 bg-ink/[0.025] px-4 text-center ${
            shape === "banner" ? "min-h-[90px]" : "min-h-[250px]"
          }`}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft/60">Advertisement</span>
          <span className="text-[11px] text-ink-soft/50">
            {name} · {shape === "banner" ? "728×90 responsive" : "300×250"}
          </span>
        </div>
      )}
    </aside>
  );
}
