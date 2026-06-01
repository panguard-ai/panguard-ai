/**
 * Asset resolution for the deliverable report — specifically the ATR raster
 * logo embedded on the cover. PDFKit embeds PNG/JPEG only (not SVG), which is
 * why we ship `public/atr-logo-black.png` (800x212) rather than the SVG.
 *
 * Resolution is graceful: if no logo file is found the generator falls back to
 * a text wordmark and never crashes (mirrors report-generator.ts findRulesDir).
 */

import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const LOGO_FILENAME = 'atr-logo-black.png';

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve the ATR logo PNG. Order:
 *   1. PANGUARD_ATR_LOGO_PATH env override (explicit deploy-time path)
 *   2. cwd-based candidates covering repo-root, app-dir, and sibling layouts
 * Returns null when none exist so the caller can fall back to a wordmark.
 */
export function resolveAtrLogoPath(): string | null {
  const envPath = process.env['PANGUARD_ATR_LOGO_PATH'];
  if (envPath && isFile(envPath)) return envPath;

  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, 'packages', 'app', 'public', LOGO_FILENAME), // repo-root cwd
    resolve(cwd, 'public', LOGO_FILENAME), // app-dir cwd
    resolve(cwd, '..', 'app', 'public', LOGO_FILENAME), // sibling-package cwd
  ];
  for (const c of candidates) {
    if (isFile(c)) return c;
  }
  return null;
}
