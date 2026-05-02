/**
 * Sigma `level` → ATR `severity`. Identity mapping for the 5 enum values.
 * Default to 'medium' for missing/unknown levels — Sigma's default level is also `medium`.
 */

import type { IRSeverity } from '../ir/types.js';
import type { SigmaLevel } from '../parsers/sigma/types.js';

export function mapSigmaLevel(level: SigmaLevel | undefined): IRSeverity {
  switch (level) {
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
    case 'informational':
      return level;
    default:
      return 'medium';
  }
}
