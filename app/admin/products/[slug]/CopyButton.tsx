"use client";

import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
  compact?: boolean;
}

export function CopyButton({
  value,
  label = "Copiar",
  compact = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text =
      typeof window !== "undefined"
        ? `${window.location.origin}${value.startsWith("/") ? value : `/${value}`}`
        : value;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        {copied ? (
          <>
            <svg
              className="w-3 h-3 text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Copiado</span>
          </>
        ) : (
          <>
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2" />
            </svg>
            {label}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] tracking-[0.15em] uppercase text-neutral-400 border border-white/15 px-3 py-2 hover:border-white/30 hover:text-white transition-colors whitespace-nowrap"
    >
      {copied ? "Copiado ✓" : label}
    </button>
  );
}
