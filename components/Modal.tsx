"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Open modals, innermost last — Esc only closes the top one. */
const openStack: string[] = [];

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-6xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Icon in the accent chip left of the title. */
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg" | "xl";
  /** Fill the viewport height (up to 760px) instead of fitting the content. */
  fullHeight?: boolean;
  /** Replaces the description line, e.g. a search field. */
  headerContent?: React.ReactNode;
  /** Sits left of the close button. */
  headerActions?: React.ReactNode;
  /** Pinned bottom bar, usually the dialog's buttons. */
  footer?: React.ReactNode;
  bodyClassName?: string;
  role?: "dialog" | "alertdialog";
  children: React.ReactNode;
}

/**
 * The one dialog shell every popup in the app uses: same backdrop, rounded
 * shell, serif title with an accent icon chip, round close button, optional
 * pinned footer. Handles Esc (top-most only), backdrop click, focus in and
 * focus restore.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  size = "lg",
  fullHeight = false,
  headerContent,
  headerActions,
  footer,
  bodyClassName = "p-4 sm:p-5",
  role = "dialog",
  children,
}: ModalProps) {
  const id = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef(0);

  // Phones: the dialog is a bottom sheet, and the grabber / header can be
  // dragged down to dismiss it, like a native iOS sheet.
  function onGrabStart(e: React.PointerEvent) {
    dragStart.current = e.clientY;
    setDrag(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onGrabMove(e: React.PointerEvent) {
    if (drag === null) return;
    setDrag(Math.max(0, e.clientY - dragStart.current));
  }
  function onGrabEnd() {
    if (drag !== null && drag > 110) onClose();
    setDrag(null);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    openStack.push(id);
    if (!shellRef.current?.contains(document.activeElement)) shellRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && openStack[openStack.length - 1] === id) {
        e.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = openStack.indexOf(id);
      if (at >= 0) openStack.splice(at, 1);
      previous?.focus?.();
    };
  }, [open, id]);

  if (!open) return null;

  return (
    <div
      className="drive-backdrop fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-md sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={shellRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
        className={`drive-shell flex w-full ${SIZE[size]} ${
          fullHeight ? "h-[92dvh] sm:h-full sm:max-h-[760px]" : "max-h-[92dvh] sm:max-h-[90vh]"
        } flex-col overflow-hidden rounded-t-[2rem] border border-black/[0.06] bg-white/95 shadow-[0_30px_80px_-20px_rgba(28,43,51,0.5)] backdrop-blur-2xl outline-none transition-transform sm:rounded-[2rem]`}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2 sm:hidden"
          onPointerDown={onGrabStart}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabEnd}
          onPointerCancel={onGrabEnd}
          aria-hidden
        >
          <span className="h-1.5 w-10 rounded-full bg-ink/20" />
        </div>
        <header className="flex shrink-0 items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#d4500f] to-accent text-white shadow-[0_6px_14px_-6px_rgba(194,65,12,0.7)]">
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
            )}
            <div className="min-w-0">
              <h2
                id={`${id}-title`}
                className={`truncate font-serif text-lg font-bold leading-tight text-ink ${
                  headerContent ? "hidden sm:block" : ""
                }`}
              >
                {title}
              </h2>
              {description && !headerContent && (
                <p className="truncate text-xs text-ink-soft/70">{description}</p>
              )}
            </div>
          </div>

          {headerContent ? (
            <div className="mx-auto flex w-full max-w-xl justify-center">{headerContent}</div>
          ) : (
            <div className="flex-1" />
          )}

          {headerActions}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink-soft max-sm:h-10 max-sm:w-10 transition-colors hover:bg-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

        {footer && (
          <footer className="sheet-footer flex shrink-0 items-center justify-end gap-2 border-t border-line bg-paper px-4 py-3 max-sm:[&>button]:min-h-11 sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/** Footer button styles, shared so every dialog's actions look the same. */
export const modalButton = {
  primary:
    "rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(194,65,12,0.8)] transition-all hover:bg-accent-hover active:scale-[0.97] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  secondary:
    "rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-[13px] font-semibold text-ink-soft transition-all active:scale-[0.97] hover:border-accent/40 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
  danger:
    "rounded-full bg-red-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all active:scale-[0.97] hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
};
