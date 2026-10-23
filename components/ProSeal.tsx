"use client";

import { useSubscription } from "@/lib/billing";

// A scalloped seal: 16 points alternating between two radii, softened by a round line join.
const POINTS = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 === 0 ? 10.4 : 8.9;
  const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

/** The check seal: same green as the verified stamp, a white tick inside. */
export function ProSeal({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="Pro member" className={`inline-block shrink-0 ${className}`}>
      <title>Record Lab Pro</title>
      <polygon points={POINTS} fill="#1b7f5c" stroke="#1b7f5c" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7.6 12.4l3 3 5.8-6.4" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The seal, only for people on an active Pro plan. */
export function ProBadge({ size, className }: { size?: number; className?: string }) {
  return useSubscription() ? <ProSeal size={size} className={className} /> : null;
}
