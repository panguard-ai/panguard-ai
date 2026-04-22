'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';

const tones: Record<Tone, string> = {
  success: 'border-status-safe/40 bg-status-safe/10 text-status-safe',
  error: 'border-status-danger/40 bg-status-danger/10 text-status-danger',
  info: 'border-brand-sage/40 bg-brand-sage/10 text-brand-sage',
};

export function InlineToast({
  tone = 'info',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
