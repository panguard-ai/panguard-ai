import type { ReactNode } from 'react';

type Tone =
  | 'neutral'
  | 'safe'
  | 'caution'
  | 'alert'
  | 'danger'
  | 'info'
  | 'sage';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-secondary border-border',
  safe: 'bg-status-safe/10 text-status-safe border-status-safe/30',
  caution: 'bg-status-caution/10 text-status-caution border-status-caution/30',
  alert: 'bg-status-alert/10 text-status-alert border-status-alert/30',
  danger: 'bg-status-danger/10 text-status-danger border-status-danger/30',
  info: 'bg-status-info/10 text-status-info border-status-info/30',
  sage: 'bg-brand-sage/10 text-brand-sage border-brand-sage/30',
};

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
