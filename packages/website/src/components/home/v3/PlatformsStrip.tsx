'use client';

import { useTranslations } from 'next-intl';
import { STATS } from '@/lib/stats';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/**
 * Platform coverage — names from packages/panguard-mcp/src/config/
 * platform-detector.ts (17 auto-detected platforms). Re-verify on bumps.
 */
const PLATFORMS = [
  'Claude Code',
  'Claude Desktop',
  'Cursor',
  'Windsurf',
  'Cline',
  'VS Code Copilot',
  'Codex CLI',
  'Gemini CLI',
  'Zed',
  'Continue',
  'Roo Code',
  'OpenClaw',
  'Hermes Agent',
  'WorkBuddy',
  'NemoClaw',
  'ArkClaw',
  'QClaw',
] as const;

export default function PlatformsStrip() {
  const t = useTranslations('homeV3.platforms');

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <div className="mt-10 flex flex-wrap gap-3">
        {PLATFORMS.map((name) => (
          <span
            key={name}
            className="rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm text-text-primary"
          >
            {name}
          </span>
        ))}
      </div>

      <p className="mt-6 font-mono text-xs text-text-muted">
        {t('note', { count: STATS.adoption.platformsSupported })}
      </p>
    </SectionV2>
  );
}
