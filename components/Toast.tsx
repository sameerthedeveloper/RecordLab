"use client";

import { useCallback, useState } from "react";
import { AlertCircle } from "lucide-react";

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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 shadow-lg">
        <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
