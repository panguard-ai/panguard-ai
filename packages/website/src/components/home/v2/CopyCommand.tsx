'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * One-click copy command box — dark terminal pill with emerald success state.
 */
export default function CopyCommand({
  command,
  copiedLabel,
  className = '',
}: {
  command: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (permissions / non-secure context) — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy command: ${command}`}
      className={`sheen lift group inline-flex items-center gap-3 rounded-xl border border-border bg-surface-hero px-4 py-3 text-left font-mono text-sm text-text-secondary transition-colors duration-300 ease-out-quint hover:border-border-hover ${className}`}
    >
      <span aria-hidden className="select-none text-brand-sage">
        $
      </span>
      <span className="whitespace-nowrap">{command}</span>
      <span
        aria-live="polite"
        className={`ml-2 inline-flex items-center gap-1 font-sans text-xs transition-colors duration-200 ${
          copied ? 'text-panguard-green' : 'text-text-muted group-hover:text-text-secondary'
        }`}
      >
        {copied ? (
          <>
            <Check aria-hidden className="h-3.5 w-3.5" />
            {copiedLabel}
          </>
        ) : (
          <Copy aria-hidden className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}
