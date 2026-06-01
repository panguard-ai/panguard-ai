/**
 * Shared, dependency-free display constants for the deliverables UI. No
 * 'use client' and no server-only imports, so both the server detail page and
 * the client editor components can consume these without a boundary clash.
 */

import type { Severity } from '@/lib/types';

export type SeverityTone = 'danger' | 'alert' | 'caution' | 'info' | 'neutral';

export const SEVERITY_TONE: Record<Severity, SeverityTone> = {
  critical: 'danger',
  high: 'alert',
  medium: 'caution',
  low: 'info',
  info: 'neutral',
};

export const SEVERITY_OPTS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
] as const;

/** Matches the Input/Select surface styling for raw <textarea> elements. */
export const TEXTAREA_CLASS =
  'rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage min-h-[80px] resize-y';
