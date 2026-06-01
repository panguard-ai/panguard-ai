/**
 * Design tokens for the deliverable PDF. Adapted from the panguard-scan report
 * palette so the two report families read as one product. A4 geometry, a
 * professional navy/blue scheme, and severity + classification colour helpers.
 */

import type { Severity } from '@/lib/types';
import type { Classification } from './types';

/** Hex colours used throughout the document. */
export const COLORS = {
  primary: '#1a365d',
  secondary: '#2d3748',
  accent: '#3182ce',
  critical: '#c53030',
  high: '#c05621',
  medium: '#b7791f',
  low: '#276749',
  info: '#2b6cb0',
  none: '#718096',
  background: '#f7fafc',
  tableHeader: '#edf2f7',
  white: '#ffffff',
  text: '#2d3748',
  lightText: '#718096',
  border: '#e2e8f0',
} as const;

/** Standard PDFKit font families (Helvetica is built-in; safe everywhere). */
export const FONTS = {
  heading: 'Helvetica-Bold',
  body: 'Helvetica',
  oblique: 'Helvetica-Oblique',
  mono: 'Courier',
} as const;

/** A4 page geometry in PDF points. */
export const LAYOUT = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  margin: 50,
  contentWidth: 495.28,
  headerHeight: 28,
  footerHeight: 28,
} as const;

/** Colour for a severity band. */
export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return COLORS.critical;
    case 'high':
      return COLORS.high;
    case 'medium':
      return COLORS.medium;
    case 'low':
      return COLORS.low;
    case 'info':
    default:
      return COLORS.info;
  }
}

/** Colour for the classification banner. */
export function classificationColor(classification: Classification): string {
  switch (classification) {
    case 'restricted':
      return COLORS.critical;
    case 'confidential':
      return COLORS.high;
    case 'internal':
      return COLORS.accent;
    case 'public':
    default:
      return COLORS.low;
  }
}
