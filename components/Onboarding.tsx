"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ONBOARDING_STEPS, type OnboardingPanel, type OnboardingSide } from "@/lib/onboardingSteps";

const STORAGE_KEY = "recordlab-onboarding-v1";
const SPOTLIGHT_PADDING = 8;
const GAP = 14;
const CARD_WIDTH = 300;
const MARGIN = 12;
const MIN_VERTICAL_SPACE = 190;

interface OnboardingProps {
  activePanel: OnboardingPanel;
  onRequestPanel: (panel: OnboardingPanel) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Picks the side with room for the card, preferring the step's own choice. */
function pickSide(rect: DOMRect, preferred: OnboardingSide, vw: number, vh: number): OnboardingSide {
  const space = { top: rect.top, bottom: vh - rect.bottom, left: rect.left, right: vw - rect.right };
  const fits: Record<OnboardingSide, boolean> = {
    top: space.top >= MIN_VERTICAL_SPACE,
    bottom: space.bottom >= MIN_VERTICAL_SPACE,
    left: space.left >= CARD_WIDTH + GAP,
    right: space.right >= CARD_WIDTH + GAP,
  };
  if (fits[preferred]) return preferred;
  const order: OnboardingSide[] = ["bottom", "top", "right", "left"];
  return order.find((side) => fits[side]) ?? preferred;
}

/**
 * First-open coach-mark tour: a dimmed backdrop with a highlighter-style
 * cutout around one element at a time, plus a small callout card — no
 * modal dialog, so the app underneath stays legible throughout.
 */
export function Onboarding({ activePanel, onRequestPanel }: OnboardingProps) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const reducedMotionRef = useRef(false);

  const step = ONBOARDING_STEPS[stepIndex];
  const total = ONBOARDING_STEPS.length;

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setStarted(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    setStarted(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private browsing / storage disabled — the tour just won't be
      // remembered next time, which is harmless.
    }
  }, []);

  useEffect(() => {
    if (started && step.panel !== activePanel) onRequestPanel(step.panel);
  }, [started, step, activePanel, onRequestPanel]);

  useEffect(() => {
    if (!started || step.panel !== activePanel) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotionRef.current ? "auto" : "smooth" });

    function measure() {
      setRect(el!.getBoundingClientRect());
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [started, step, activePanel]);

  const goNext = useCallback(() => {
    setStepIndex((i) => {
      if (i >= total - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [finish, total]);

  const goBack = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!started) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") goNext();
      else if (e.key === "ArrowLeft") goBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, finish, goNext, goBack]);

  if (!started || !rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const side = pickSide(rect, step.side, vw, vh);
  const transitionDuration = reducedMotionRef.current ? "0ms" : "300ms";

  const holeTop = Math.max(0, rect.top - SPOTLIGHT_PADDING);
  const holeLeft = Math.max(0, rect.left - SPOTLIGHT_PADDING);
  const holeRight = Math.min(vw, rect.right + SPOTLIGHT_PADDING);
  const holeBottom = Math.min(vh, rect.bottom + SPOTLIGHT_PADDING);

  const frameStyle: React.CSSProperties = {
    position: "fixed",
    background: "rgba(28, 43, 51, 0.55)",
    transition: `all ${transitionDuration} ease-out`,
  };

  const centerX = rect.left + rect.width / 2;
  const cardLeftForCenter = clamp(centerX - CARD_WIDTH / 2, MARGIN, vw - CARD_WIDTH - MARGIN);
  const roughTop = clamp(rect.top + rect.height / 2 - 90, MARGIN, vh - MARGIN - 180);

  let cardStyle: React.CSSProperties = { width: CARD_WIDTH };
  let arrowStyle: React.CSSProperties = {};

  if (side === "bottom") {
    cardStyle = { ...cardStyle, top: rect.bottom + GAP, left: cardLeftForCenter };
    arrowStyle = {
      top: -7,
      left: clamp(centerX - cardLeftForCenter - 7, 16, CARD_WIDTH - 30),
      borderLeft: "7px solid transparent",
      borderRight: "7px solid transparent",
      borderBottom: "7px solid white",
    };
  } else if (side === "top") {
    cardStyle = { ...cardStyle, top: rect.top - GAP, left: cardLeftForCenter, transform: "translateY(-100%)" };
    arrowStyle = {
      bottom: -7,
      left: clamp(centerX - cardLeftForCenter - 7, 16, CARD_WIDTH - 30),
      borderLeft: "7px solid transparent",
      borderRight: "7px solid transparent",
      borderTop: "7px solid white",
    };
  } else if (side === "right") {
    cardStyle = { ...cardStyle, top: roughTop, left: rect.right + GAP };
    arrowStyle = {
      left: -7,
      top: clamp(rect.top + rect.height / 2 - roughTop - 7, 16, 160),
      borderTop: "7px solid transparent",
      borderBottom: "7px solid transparent",
      borderRight: "7px solid white",
    };
  } else {
    cardStyle = { ...cardStyle, top: roughTop, left: rect.left - GAP, transform: "translateX(-100%)" };
    arrowStyle = {
      right: -7,
      top: clamp(rect.top + rect.height / 2 - roughTop - 7, 16, 160),
      borderTop: "7px solid transparent",
      borderBottom: "7px solid transparent",
      borderLeft: "7px solid white",
    };
  }

  return (
    <div className="fixed inset-0 z-[9998]" aria-live="polite">
      <div style={{ ...frameStyle, top: 0, left: 0, right: 0, height: holeTop }} />
      <div style={{ ...frameStyle, top: holeBottom, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...frameStyle, top: holeTop, left: 0, width: holeLeft, height: holeBottom - holeTop }} />
      <div style={{ ...frameStyle, top: holeTop, left: holeRight, right: 0, height: holeBottom - holeTop }} />

      <div
        className="pointer-events-none fixed rounded-2xl border-2 border-accent shadow-[0_0_0_5px_rgba(194,65,12,0.18)]"
        style={{
          top: holeTop,
          left: holeLeft,
          width: holeRight - holeLeft,
          height: holeBottom - holeTop,
          transition: `all ${transitionDuration} ease-out`,
        }}
      />

      <div
        role="dialog"
        aria-label={`Tour step ${stepIndex + 1} of ${total}: ${step.title}`}
        className="fixed rounded-2xl border border-line bg-white p-4 shadow-lg"
        style={{ ...cardStyle, transition: `top ${transitionDuration} ease-out, left ${transitionDuration} ease-out` }}
      >
        <div className="absolute h-0 w-0" style={arrowStyle} />

        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold tracking-widest text-accent">
            {String(stepIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            className="rounded-lg p-1 text-ink-soft/60 transition-colors hover:bg-accent-soft hover:text-accent-ink"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        <h3 className="font-serif text-base font-bold leading-tight text-ink">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>

        <div className="mt-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-semibold text-ink-soft/70 transition-colors hover:text-ink"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent-ink"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover active:bg-accent-ink"
            >
              {stepIndex >= total - 1 ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
