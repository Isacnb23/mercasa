"use client";

import { ACCENT, FOCUS_RING, TEXT_MUTED } from "@/components/ui/drawer-tokens";

// "No pudimos cargar esto" + enlace "Reintentar", con el mismo lenguaje en todo el flujo.
export function RetryLine({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-[13px]" style={{ color: TEXT_MUTED }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`rounded text-[13px] font-semibold underline underline-offset-4 motion-safe:transition hover:opacity-70 ${FOCUS_RING}`}
        style={{ color: ACCENT }}
      >
        {retryLabel}
      </button>
    </div>
  );
}
