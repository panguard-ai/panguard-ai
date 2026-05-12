'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Loader2,
  Wand2,
  Zap,
  Lock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Example rules used by the "Load example" buttons.
// Kept inline rather than imported so the demo bundle stays self-contained
// and viewable when JS-disabled crawlers parse the page (no hydration of
// example text is necessary for indexing).
// ---------------------------------------------------------------------------

const EXAMPLE_SIGMA = `title: Suspicious PowerShell Encoded Command
id: 9c0ea0f0-1234-4d3a-bf17-9b40b9e2af11
status: experimental
description: Detects PowerShell processes invoked with an encoded command flag.
author: ATR Community
date: 2026/05/12
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains:
      - '-EncodedCommand'
      - '-enc '
  condition: selection
level: high
tags:
  - attack.execution
  - attack.t1059.001
`;

const EXAMPLE_YARA = `rule SuspiciousAgentToolName
{
    meta:
        description = "Detects a suspicious tool-call argument name"
        author = "ATR Community"
        date = "2026-05-12"
        severity = "high"
    strings:
        $a = "rm -rf /"
        $b = "curl http://evil.example/"
    condition:
        any of them
}
`;

// ---------------------------------------------------------------------------
// Locked Pilot-only formats — used both by the comparison table and the
// inline upgrade callout.
// ---------------------------------------------------------------------------

const PILOT_FORMATS = [
  'promptfoo',
  'pyrit',
  'ghsa',
  'osv',
  'splunk-spl',
  'snort',
  'elastic-eql',
  'falco',
  'semgrep',
  'codeql',
  'cve-nvd',
  'kev',
  'garak',
] as const;

// ---------------------------------------------------------------------------
// Server response contract — mirrors /api/migrate.
// ---------------------------------------------------------------------------

interface MigrateResponseOk {
  readonly outcome: 'converted' | 'failed';
  readonly yaml: string;
  readonly atrId: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

interface MigrateResponseError {
  readonly error: string;
  readonly outcome?: 'skipped' | 'failed';
  readonly skipReason?: string;
  readonly detail?: string;
  readonly warnings?: readonly string[];
  readonly errors?: readonly string[];
}

type DetectedSource = 'sigma' | 'yara' | 'auto';

interface ConvertedState {
  readonly yaml: string;
  readonly atrId: string;
  readonly warnings: readonly string[];
}

interface ErrorState {
  readonly title: string;
  readonly detail: string | null;
}

// ---------------------------------------------------------------------------
// Lightweight heuristic so the UI can show which format the server will
// route into. Same logic the server uses — keeps the dropdown's auto
// label honest.
// ---------------------------------------------------------------------------
function sniffSource(text: string): 'sigma' | 'yara' {
  const trimmed = text.trimStart();
  if (/^(?:private\s+|global\s+)*rule\s+[A-Za-z_]/.test(trimmed)) return 'yara';
  return 'sigma';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MigratorDemo() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  const [input, setInput] = useState('');
  const [source, setSource] = useState<DetectedSource>('auto');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConvertedState | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [copied, setCopied] = useState(false);

  const effectiveSource: 'sigma' | 'yara' = useMemo(() => {
    if (source !== 'auto') return source;
    if (input.trim().length === 0) return 'sigma';
    return sniffSource(input);
  }, [source, input]);

  const loadExample = useCallback((kind: 'sigma' | 'yara') => {
    setInput(kind === 'sigma' ? EXAMPLE_SIGMA : EXAMPLE_YARA);
    setSource(kind);
    setResult(null);
    setError(null);
  }, []);

  const onConvert = useCallback(async () => {
    setError(null);
    setResult(null);
    if (input.trim().length === 0) {
      setError({
        title: isZh ? '請貼上一條 Sigma 或 YARA 規則' : 'Paste a Sigma or YARA rule first',
        detail: null,
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ source, text: input }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | MigrateResponseOk
        | MigrateResponseError;
      if (!res.ok) {
        const errBody = body as MigrateResponseError;
        const reason =
          errBody.skipReason ??
          errBody.detail ??
          (errBody.errors && errBody.errors.length > 0 ? errBody.errors[0] : null);
        setError({
          title: humanizeError(errBody.error ?? 'unknown', isZh),
          detail: reason ?? null,
        });
        return;
      }
      const okBody = body as MigrateResponseOk;
      setResult({
        yaml: okBody.yaml,
        atrId: okBody.atrId,
        warnings: okBody.warnings ?? [],
      });
    } catch (err) {
      setError({
        title: isZh ? '網路錯誤' : 'Network error',
        detail: err instanceof Error ? err.message : null,
      });
    } finally {
      setBusy(false);
    }
  }, [input, source, isZh]);

  const onCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.yaml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // navigator.clipboard may be blocked on insecure origins — degrade silently;
      // the user can still select+copy the text manually.
    }
  }, [result]);

  const onDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.atrId}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <>
      {/* HERO — server-renderable copy, JS only enhances */}
      <SectionWrapper className="pt-24 pb-10">
        <FadeInUp>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-brand-sage-glow bg-brand-sage-wash">
              <Zap className="w-3 h-3 text-brand-sage" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-sage">
                {isZh ? '免註冊 · 開放原始碼' : 'No signup · Open source'}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6 text-text-primary">
              {isZh ? (
                <>
                  Sigma / YARA <span className="text-panguard-green">&rarr;</span> ATR YAML
                </>
              ) : (
                <>
                  Sigma to ATR YAML converter <span className="text-panguard-green">&mdash;</span>{' '}
                  open source, free
                </>
              )}
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed">
              {isZh
                ? '貼上一條 Sigma 或 YARA 規則，立刻拿到一份 schema-valid 的 ATR YAML。免註冊，瀏覽器即時轉換。'
                : 'Paste a Sigma or YARA rule and get schema-valid ATR YAML back. No signup. Runs in your browser.'}
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* LIVE DEMO */}
      <SectionWrapper className="pt-4 pb-16">
        <FadeInUp>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadExample('sigma')}
                  className="px-3 py-1.5 text-xs rounded-full border border-border bg-surface-1 text-text-secondary hover:border-brand-sage hover:text-text-primary transition-colors"
                >
                  {isZh ? '載入 Sigma 範例' : 'Load example Sigma'}
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('yara')}
                  className="px-3 py-1.5 text-xs rounded-full border border-border bg-surface-1 text-text-secondary hover:border-brand-sage hover:text-text-primary transition-colors"
                >
                  {isZh ? '載入 YARA 範例' : 'Load example YARA'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="source-select" className="text-text-muted">
                  {isZh ? '格式' : 'Format'}
                </label>
                <select
                  id="source-select"
                  value={source}
                  onChange={(e) => setSource(e.target.value as DetectedSource)}
                  className="bg-surface-1 border border-border rounded-md px-2 py-1 text-text-primary focus:outline-none focus:border-brand-sage"
                >
                  <option value="auto">
                    {isZh ? '自動偵測' : 'Auto-detect'}
                    {input.trim().length > 0 ? ` (${effectiveSource})` : ''}
                  </option>
                  <option value="sigma">Sigma</option>
                  <option value="yara">YARA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* INPUT PANE */}
              <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
                <div className="px-4 py-2 border-b border-border-subtle text-[11px] uppercase tracking-[0.15em] text-text-muted font-semibold flex items-center justify-between">
                  <span>{isZh ? '輸入 (Sigma 或 YARA)' : 'Input (Sigma or YARA)'}</span>
                  <span className="font-mono normal-case tracking-normal text-[10px]">
                    {input.length.toLocaleString()} {isZh ? '字元' : 'chars'}
                  </span>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isZh
                      ? '在這裡貼上一條 Sigma 或 YARA 規則...'
                      : 'Paste a Sigma or YARA rule here...'
                  }
                  spellCheck={false}
                  className="w-full h-[420px] px-5 py-4 text-xs font-mono text-text-primary bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
                  aria-label={isZh ? '輸入規則' : 'Rule input'}
                />
              </div>

              {/* OUTPUT PANE */}
              <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-border-subtle text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold flex items-center justify-between">
                  <span>{isZh ? '輸出 (ATR YAML)' : 'Output (ATR YAML)'}</span>
                  {result ? (
                    <span className="font-mono normal-case tracking-normal text-[10px] text-text-muted">
                      {result.atrId}
                    </span>
                  ) : null}
                </div>
                <div className="flex-1 overflow-auto">
                  {result ? (
                    <pre className="px-5 py-4 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre">
                      <code>{result.yaml}</code>
                    </pre>
                  ) : error ? (
                    <div className="px-5 py-6 text-sm">
                      <p className="text-severity-medium font-semibold mb-2">{error.title}</p>
                      {error.detail ? (
                        <p className="text-text-muted text-xs leading-relaxed font-mono">
                          {error.detail}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-sm text-text-muted">
                      {isZh
                        ? '轉換結果會出現在這裡。Community tier 支援 Sigma 與 YARA — 解析、IR 中介層、ATR schema 驗證。'
                        : 'Conversion output will appear here. The Community tier covers Sigma and YARA — parser, IR, and ATR schema validation.'}
                    </div>
                  )}
                </div>
                {result ? (
                  <div className="px-4 py-2 border-t border-border-subtle flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border text-text-secondary hover:border-brand-sage hover:text-text-primary transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-panguard-green" />
                          {isZh ? '已複製' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          {isZh ? '複製' : 'Copy ATR YAML'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border text-text-secondary hover:border-brand-sage hover:text-text-primary transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      {isZh ? '下載 .yaml' : 'Download .yaml'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* CONVERT BUTTON */}
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={onConvert}
                disabled={busy}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-panguard-green text-white font-semibold text-sm hover:bg-panguard-green-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isZh ? '轉換中...' : 'Converting...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {isZh ? '轉換為 ATR YAML' : 'Convert to ATR YAML'}
                  </>
                )}
              </button>
            </div>

            {/* WARNINGS — only after a successful conversion */}
            {result && result.warnings.length > 0 ? (
              <div className="mt-6 max-w-3xl mx-auto rounded-xl border border-severity-medium/30 bg-severity-medium/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.15em] text-severity-medium font-semibold mb-2">
                  {isZh ? '需要人工複核' : 'Needs human review'}
                </p>
                <ul className="space-y-1 text-xs text-text-secondary">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="font-mono leading-relaxed">
                      &middot; {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* AFTER-SUCCESS UPSELL — D3 inline upgrade hint */}
            {result ? (
              <div className="mt-8 max-w-3xl mx-auto">
                <p className="text-center text-xs text-text-muted mb-3">
                  {isZh ? '已用於' : 'Used by'} Microsoft (Agent Governance Toolkit) &middot; Cisco
                  (skill-scanner) &middot; MISP &middot; NIST OSCAL Path 1
                </p>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary mb-1">
                      {isZh ? '下一步？' : "What's next?"}
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {isZh
                        ? `Community 支援 Sigma 與 YARA。再加上 13 種來源格式（promptfoo、pyrit、splunk、garak …）以及 EU AI Act 證據包：Pilot $25K / 90 天。`
                        : `Community covers Sigma and YARA. Convert 13 more formats (promptfoo, pyrit, splunk, garak, …) and get an EU AI Act evidence pack: Start Pilot ($25K / 90d).`}
                    </p>
                  </div>
                  <a
                    href="/pricing?intent=pilot#pilot"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-400 text-surface-0 font-semibold text-xs hover:bg-amber-300 transition-colors whitespace-nowrap"
                  >
                    {isZh ? 'Pilot $25K / 90d' : 'Start Pilot $25K / 90d'}
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* COMPARISON TABLE — Community vs Pilot */}
      <SectionWrapper className="py-16 bg-surface-1/30">
        <FadeInUp>
          <SectionTitle
            overline={isZh ? 'COMMUNITY vs PILOT' : 'COMMUNITY vs PILOT'}
            title={isZh ? '哪一條軌道符合你的需求？' : 'Which tier matches your scope?'}
            subtitle={
              isZh
                ? 'Community 免費永久。Pilot 加上 13 種來源格式、LLM enrichment、EU AI Act 證據包、Threat Cloud 貢獻管線。'
                : 'Community is free forever. Pilot adds 13 more input formats, LLM enrichment, an EU AI Act evidence pack, and the Threat Cloud contribute pipeline.'
            }
          />
        </FadeInUp>
        <div className="max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Community card */}
          <FadeInUp delay={0.05}>
            <div className="rounded-2xl border border-brand-sage/30 bg-surface-1 p-6 h-full flex flex-col">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold">
                  Community
                </p>
                <span className="text-2xl font-extrabold text-text-primary">$0</span>
              </div>
              <p className="text-xs text-text-muted mb-4">
                {isZh ? '永久免費 · MIT 授權' : 'Forever · MIT'}
              </p>
              <ul className="space-y-2 text-sm text-text-secondary flex-1">
                <ComparisonRow ok>{isZh ? 'Sigma 解析器' : 'Sigma parser'}</ComparisonRow>
                <ComparisonRow ok>{isZh ? 'YARA 解析器' : 'YARA parser'}</ComparisonRow>
                <ComparisonRow ok>{isZh ? 'IR 中介層' : 'IR transformer'}</ComparisonRow>
                <ComparisonRow ok>{isZh ? 'ATR schema 驗證' : 'ATR schema validation'}</ComparisonRow>
                <ComparisonRow ok>{isZh ? 'CLI + Web demo' : 'CLI + web demo'}</ComparisonRow>
                <ComparisonRow ok>{isZh ? '可自架' : 'Self-host forever'}</ComparisonRow>
              </ul>
              <a
                href="https://www.npmjs.com/package/@panguard-ai/migrator-community"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold hover:underline"
              >
                {isZh ? '在 npm 安裝' : 'Install on npm'} <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>

          {/* Pilot card */}
          <FadeInUp delay={0.1}>
            <div className="rounded-2xl border border-amber-400/30 bg-surface-1 p-6 h-full flex flex-col">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-amber-400 font-semibold">
                  Pilot &middot; 90 days
                </p>
                <span className="text-2xl font-extrabold text-text-primary">$25K</span>
              </div>
              <p className="text-xs text-text-muted mb-4">
                {isZh ? '一個團隊 · 一份規則語料庫' : 'One team · one rule corpus'}
              </p>
              <ul className="space-y-2 text-sm text-text-secondary flex-1">
                <ComparisonRow ok pilot>
                  {isZh ? '全部 Community 功能' : 'Everything in Community'}
                </ComparisonRow>
                <ComparisonRow ok pilot>
                  {isZh ? '13 種額外輸入格式' : '13 more input formats'} (
                  <span className="font-mono text-[10px] text-text-muted">
                    {PILOT_FORMATS.join(', ')}
                  </span>
                  )
                </ComparisonRow>
                <ComparisonRow ok pilot>
                  {isZh ? 'LLM 強化 (5 種合規框架對應)' : 'LLM enrichment (5-framework mapping)'}
                </ComparisonRow>
                <ComparisonRow ok pilot>
                  {isZh ? 'EU AI Act 稽核證據包' : 'EU AI Act evidence pack'}
                </ComparisonRow>
                <ComparisonRow ok pilot>
                  {isZh ? 'Threat Cloud 貢獻管線' : 'Threat Cloud contribute pipeline'}
                </ComparisonRow>
                <ComparisonRow ok pilot>
                  {isZh ? '可全額抵入 Y1 合約' : 'Credits 100% toward Year 1 contract'}
                </ComparisonRow>
              </ul>
              <a
                href="/pricing?intent=pilot#pilot"
                className="mt-5 inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold hover:underline"
              >
                {isZh ? '開啟 Pilot' : 'Start Pilot'} <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>
        </div>

        {/* Bottom CTAs */}
        <FadeInUp delay={0.15}>
          <div className="max-w-3xl mx-auto mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/pricing?intent=pilot#pilot"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-surface-0 font-semibold text-sm hover:bg-amber-300 transition-colors"
            >
              <Lock className="w-4 h-4" />
              {isZh ? 'Pilot 解鎖 — $25K / 90d' : 'Unlock Pilot — $25K / 90d'}
            </a>
            <a
              href="/contact?tier=pilot"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-text-secondary text-sm hover:border-brand-sage hover:text-text-primary transition-colors"
            >
              {isZh ? '與業務洽談' : 'Talk to sales'}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function ComparisonRow({
  children,
  ok,
  pilot,
}: {
  readonly children: React.ReactNode;
  readonly ok: boolean;
  readonly pilot?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check
        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
          pilot ? 'text-amber-400' : 'text-panguard-green'
        }`}
        aria-hidden
      />
      <div className="flex-1 leading-relaxed">
        {children}
        {pilot ? (
          <span className="ml-2 inline-block text-[9px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5 align-middle">
            {ok ? 'Pilot only' : 'Pilot'}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function humanizeError(code: string, isZh: boolean): string {
  switch (code) {
    case 'empty_input':
      return isZh ? '請貼上一條 Sigma 或 YARA 規則' : 'Paste a Sigma or YARA rule first';
    case 'input_too_large':
      return isZh ? '輸入過大 (上限 64KB)' : 'Input too large (max 64KB)';
    case 'invalid_json':
      return isZh ? '請求格式錯誤' : 'Invalid request payload';
    case 'sigma_parse_error':
      return isZh ? 'Sigma YAML 解析失敗' : 'Could not parse Sigma YAML';
    case 'sigma_not_object':
      return isZh ? 'Sigma 規則必須是 YAML mapping' : 'Sigma input must be a YAML mapping';
    case 'rule_skipped':
      return isZh ? '規則被略過' : 'Rule was skipped';
    case 'unexpected':
      return isZh ? '伺服器例外' : 'Server error';
    default:
      return isZh ? '轉換失敗' : 'Conversion failed';
  }
}
