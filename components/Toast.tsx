"use client";

import { useCallback, useState } from "react";
import { Info } from "lucide-react";

interface ToastState {
  id: number;
  message: string;
}

/** Minimal fixed-position toast: call `showToast(message)`, render `<ToastViewport toast={toast} />`. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  }, []);

  return { toast, showToast };
}

export function ToastViewport({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] max-md:bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border border-white/10 bg-ink/90 px-5 py-3 text-[13px] font-medium text-paper shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <Info className="h-4 w-4 shrink-0 text-accent-soft" strokeWidth={2.25} />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
