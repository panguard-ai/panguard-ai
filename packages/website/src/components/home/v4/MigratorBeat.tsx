'use client';

/**
 * BEAT 7 — Migrator (v4 homepage).
 *
 * Condenses the two previous Migrator pitches (RegulatedIndustriesPositioning
 * section C + DetectionHeritageBridge) into ONE section. Terminal LEFT /
 * copy RIGHT — alternates direction against PositioningSplit (copy-left).
 *
 * Deliberately absent: the era timeline and the sovereign-AI essay from
 * DetectionHeritageBridge — both move off the homepage entirely.
 */

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { Eyebrow, SectionV2 } from '../v2/primitives';

/** The 15 source formats, lifted from DetectionHeritageBridge's input card. */
const LEGACY_FORMATS = [
  'Sigma',
  'Splunk SPL',
  'Elastic EQL',
  'YARA',
  'Snort',
  'Falco',
  'Semgrep',
  'CodeQL',
  'CVE-NVD',
  'GHSA',
  'OSV',
  'CISA KEV',
  'garak',
  'PyRIT',
  'promptfoo',
] as const;

export default function MigratorBeat() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <SectionV2>
      <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-16">
        {/* ── Terminal (LEFT on desktop, below copy on mobile) ── */}
        <FadeInUp delay={0.15} className="order-2 lg:order-1 lg:col-span-2">
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-hero p-6 font-mono text-xs sm:text-sm">
            <div className="space-y-1.5">
              <div className="whitespace-nowrap">
                <span className="select-none text-brand-sage">$ </span>
                <span className="font-semibold text-text-primary">
                  npm install -g @panguard-ai/migrator-community
                </span>
              </div>
              <div className="whitespace-nowrap">
                <span className="select-none text-brand-sage">$ </span>
                <span className="text-text-secondary">panguard-migrate sigma/ --output atr/</span>
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* ── Copy (RIGHT on desktop, first on mobile) ── */}
        <FadeInUp className="order-1 lg:order-2 lg:col-span-3">
          <Eyebrow>
            {isZh
              ? '不丟棄你既有的偵測投資'
              : 'Do not throw out your existing detection investment'}
          </Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl">
            {isZh ? (
              <>
                ATR Migrator — Sigma / YARA / Snort{' '}
                <span className="text-brand-sage">一鍵升級成 AI Agent 規則。</span>
              </>
            ) : (
              <>
                ATR Migrator — convert Sigma / YARA / Snort{' '}
                <span className="text-brand-sage">into AI agent rules in seconds.</span>
              </>
            )}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            {isZh
              ? '銀行、醫院、政府、半導體廠的 SOC，累積了二十年的偵測 IP——SIEM 查詢、惡意樣本特徵、IDS 規則、CVE 對應、靜態分析。'
              : 'Banks, hospitals, government agencies, and semiconductor SOCs have accumulated two decades of detection IP — SIEM queries, malware signatures, IDS rules, CVE mappings, static analysis.'}
          </p>

          {/* 15 legacy formats — mono chip row */}
          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-micro text-text-muted">
              {isZh ? '輸入：15 種舊時代格式' : 'Input: 15 legacy formats'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEGACY_FORMATS.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-border bg-surface-1 px-2.5 py-1 font-mono text-[11px] text-text-secondary"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Community / Pro — one line each */}
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-text-secondary">
            <p>
              <strong className="text-text-primary">
                {isZh ? 'Community 免費(npm,MIT):' : 'Community Free (npm, MIT):'}
              </strong>{' '}
              {isZh
                ? 'Sigma + YARA + Snort 解析器、中介表達式、ATR YAML 輸出、CLI。'
                : 'Sigma + YARA + Snort parsers, IR transformer, ATR YAML output, CLI.'}
            </p>
            <p>
              <strong className="text-text-primary">
                {isZh
                  ? 'Migrator Pro(PanGuard Enterprise):'
                  : 'Migrator Pro (PanGuard Enterprise):'}
              </strong>{' '}
              {isZh
                ? '規則手工調到 Cisco merge PR 等級 · 5 框架合規自動對照 · SHA-256 簽章的稽核證據包 · Threat Cloud 整合 · 地端部署。'
                : 'human enrichment to Cisco-merge-PR quality · 5-framework compliance auto-mapping · SHA-256 audit evidence pack · TC integration · on-prem deployment.'}
            </p>
          </div>

          {/* Single secondary CTA */}
          <div className="mt-8">
            <Link
              href="/migrator"
              className="sheen lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
            >
              {isZh ? '看完整 Migrator 規格' : 'See full Migrator spec'}
            </Link>
          </div>
        </FadeInUp>
      </div>
    </SectionV2>
  );
}
