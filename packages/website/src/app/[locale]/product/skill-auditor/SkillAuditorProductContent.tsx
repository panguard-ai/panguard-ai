'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Gauge,
  GitBranch,
  Globe,
  Terminal,
  Building2,
  Laptop,
  ChevronRight,
  Copy,
  Check,
  Eye,
  Lock,
  AlertTriangle,
  Search,
  Code,
  FileKey,
  Binary,
  Server,
} from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';

/* ─── Reusable CodeBlock ─── */
function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative bg-[#111] border border-border rounded-xl overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-border text-xs text-text-muted font-mono">
          {title}
        </div>
      )}
      <pre className="p-4 font-mono text-sm text-gray-300 overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-surface-2/50 hover:bg-surface-2 transition-colors"
        aria-label="Copy"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-panguard-green" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>
    </div>
  );
}

/* ─── Static config (icons, colors, keys — not translatable) ─── */
const pillarKeys = ['preInstall', 'riskScore', 'cicd', 'crossPlatform'] as const;
const pillarIcons = [ShieldAlert, Gauge, GitBranch, Globe];

const checkKeys = [
  'promptInjection',
  'hiddenUnicode',
  'encodedPayloads',
  'toolPoisoning',
  'sastSecrets',
  'permissionScope',
  'manifestValidation',
] as const;
const checkIcons = [Shield, Eye, Binary, AlertTriangle, Code, FileKey, Search];

const workflowKeys = ['developer', 'smb', 'enterprise'] as const;
const workflowIcons = [Terminal, Laptop, Building2];
const workflowSteps = [
  [
    '$ panguard skill install cool-agent-tool',
    'Scanning cool-agent-tool... done (0.3s)',
    'Risk: 8/100 (LOW) — Safe to install',
    'Installed successfully.',
  ],
  [
    '$ panguard audit skill ./vendor-skill --json',
    'Risk: 45/100 (HIGH)',
    'Found: env exfiltration pattern at line 23',
    'Blocked. Forwarded report to security@yourcompany.com',
  ],
  [
    '# .github/workflows/skill-gate.yml',
    '- run: panguard audit skill ./skills/ --ci',
    '  # Exits non-zero if any skill scores > 40',
    '  # Blocks merge automatically',
  ],
];

const riskLevels = [
  { range: '0-14', level: 'LOW', color: 'text-green-400', bg: 'bg-green-400/10', key: 'low' as const },
  { range: '15-39', level: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-400/10', key: 'medium' as const },
  { range: '40-69', level: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-400/10', key: 'high' as const },
  { range: '70-100', level: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-400/10', key: 'critical' as const },
];

export default function SkillAuditorProductContent() {
  const t = useTranslations('product.skillAuditor');

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] flex items-center px-4 sm:px-6 lg:px-[120px] py-20 sm:py-32 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-sage/20 bg-brand-sage/5 text-brand-sage text-xs font-semibold tracking-wide mb-6">
              <Shield className="w-3.5 h-3.5" />
              {t('overline')}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(32px,5vw,64px)] font-extrabold leading-[1.05] tracking-tight text-text-primary max-w-4xl mx-auto">
              {t('title')}
              <span className="text-brand-sage">{t('titleHighlight')}</span>
              {t('titleSuffix') && ` ${t('titleSuffix')}`}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
              {t('subtitle')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-sage text-surface-0 font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {t('cta1')} <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs/skill-auditor"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border text-text-primary font-semibold text-sm hover:bg-surface-1 transition-colors"
              >
                {t('cta2')}
              </Link>
            </div>
          </FadeInUp>

          {/* Quick demo — terminal output stays in English (it's CLI output) */}
          <FadeInUp delay={0.2}>
            <div className="max-w-2xl mx-auto mt-12">
              <CodeBlock
                title="terminal"
                code={`$ panguard audit skill ./suspicious-agent

PANGUARD SKILL AUDIT REPORT
============================
Skill:      suspicious-agent
Risk Score: 72/100
Risk Level: CRITICAL
Duration:   0.3s

FINDINGS:
  [CRITICAL] Prompt injection: "ignore previous instructions"
             SKILL.md:42
  [HIGH]     Reverse shell: "bash -i >& /dev/tcp/..."
             SKILL.md:87

VERDICT: DO NOT INSTALL`}
              />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ── Problem Statement ── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {t('problem.overline')}
            </p>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
              {t('problem.title')}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-6 leading-relaxed text-lg">
              {t('problem.desc')}
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed text-lg">
              {t('problem.desc2')}
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── 4 Pillars ── */}
      <SectionWrapper className="border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4 text-center">
              {t('pillars.overline')}
            </p>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1] text-center max-w-2xl mx-auto">
              {t('pillars.title')}
            </h2>
          </FadeInUp>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {pillarKeys.map((key, i) => {
              const Icon = pillarIcons[i];
              return (
                <FadeInUp key={key} delay={0.05 * i}>
                  <div className="group p-6 rounded-2xl border border-border bg-surface-0 hover:border-brand-sage/30 transition-colors h-full">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-sage/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-brand-sage" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">
                          {t(`pillars.${key}.title`)}
                        </h3>
                        <p className="text-sm text-brand-sage font-medium mt-0.5">
                          {t(`pillars.${key}.subtitle`)}
                        </p>
                        <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                          {t(`pillars.${key}.desc`)}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                            <span className="text-red-400 font-semibold block mb-1">AI Agents</span>
                            <span className="text-text-muted">{t(`pillars.${key}.them`)}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-brand-sage/5 border border-brand-sage/10">
                            <span className="text-brand-sage font-semibold block mb-1">Panguard</span>
                            <span className="text-text-muted">{t(`pillars.${key}.us`)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </div>
      </SectionWrapper>

      {/* ── 7 Checks ── */}
      <SectionWrapper className="border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4 text-center">
              {t('checks.overline')}
            </p>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1] text-center">
              {t('checks.title')}
            </h2>
          </FadeInUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {checkKeys.map((key, i) => {
              const Icon = checkIcons[i];
              return (
                <FadeInUp key={key} delay={0.04 * i}>
                  <div className="p-5 rounded-xl border border-border bg-surface-0 hover:border-brand-sage/20 transition-colors h-full">
                    <Icon className="w-5 h-5 text-brand-sage mb-3" />
                    <h3 className="font-semibold text-text-primary text-sm">
                      {t(`checks.${key}.name`)}
                    </h3>
                    <p className="text-text-muted text-xs mt-1.5 leading-relaxed">
                      {t(`checks.${key}.detail`)}
                    </p>
                  </div>
                </FadeInUp>
              );
            })}
            {/* Stats card */}
            <FadeInUp delay={0.04 * checkKeys.length}>
              <div className="p-5 rounded-xl border border-brand-sage/20 bg-brand-sage/5 h-full flex flex-col justify-center">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-3xl font-extrabold text-brand-sage">{'<'}1s</div>
                    <div className="text-xs text-text-muted mt-1">{t('checks.scanTime')}</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-text-primary">7</div>
                    <div className="text-xs text-text-muted mt-1">{t('checks.checkCategories')}</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-text-primary">11+</div>
                    <div className="text-xs text-text-muted mt-1">{t('checks.injectionPatterns')}</div>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Risk Score ── */}
      <SectionWrapper className="border-t border-border">
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4 text-center">
              {t('riskScoring.overline')}
            </p>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1] text-center">
              {t('riskScoring.title')}
            </h2>
            <p className="text-text-secondary mt-4 text-center max-w-xl mx-auto">
              {t('riskScoring.desc')}
            </p>
          </FadeInUp>
          <div className="mt-8 space-y-3">
            {riskLevels.map((r, i) => (
              <FadeInUp key={r.level} delay={0.05 * i}>
                <div className={`flex items-center gap-4 p-4 rounded-xl border border-border ${r.bg}`}>
                  <div className={`text-2xl font-extrabold ${r.color} w-24 text-center`}>
                    {r.range}
                  </div>
                  <div className={`text-sm font-bold ${r.color} w-24`}>{r.level}</div>
                  <div className="text-text-secondary text-sm flex-1">
                    {t(`riskScoring.${r.key}`)}
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Real Workflows ── */}
      <SectionWrapper className="border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4 text-center">
              {t('workflows.overline')}
            </p>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1] text-center">
              {t('workflows.title')}
            </h2>
          </FadeInUp>
          <div className="grid lg:grid-cols-3 gap-6 mt-10">
            {workflowKeys.map((key, i) => {
              const Icon = workflowIcons[i];
              return (
                <FadeInUp key={key} delay={0.05 * i}>
                  <div className="p-6 rounded-2xl border border-border bg-surface-0 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-brand-sage/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-brand-sage" />
                      </div>
                      <div>
                        <div className="text-xs text-brand-sage font-semibold">
                          {t(`workflows.${key}.persona`)}
                        </div>
                        <div className="text-sm font-bold text-text-primary">
                          {t(`workflows.${key}.title`)}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#111] rounded-lg p-3 font-mono text-xs text-gray-400 leading-relaxed flex-1">
                      {workflowSteps[i].map((s, j) => (
                        <div
                          key={j}
                          className={
                            s.startsWith('$') || s.startsWith('#') ? 'text-gray-200' : ''
                          }
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Panguard Ecosystem ── */}
      <SectionWrapper className="border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {t('ecosystem.overline')}
            </p>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
              {t('ecosystem.title')}
            </h2>
            <p className="text-text-secondary mt-4 max-w-xl mx-auto">
              {t('ecosystem.desc')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-brand-sage/20 bg-brand-sage/5">
                <ShieldCheck className="w-5 h-5 text-brand-sage" />
                <div className="text-left">
                  <div className="text-sm font-bold text-text-primary">Skill Auditor</div>
                  <div className="text-xs text-text-muted">{t('ecosystem.auditor')}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted rotate-90 sm:rotate-0" />
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-border">
                <Lock className="w-5 h-5 text-text-secondary" />
                <div className="text-left">
                  <div className="text-sm font-bold text-text-primary">Runtime Permissions</div>
                  <div className="text-xs text-text-muted">{t('ecosystem.runtime')}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted rotate-90 sm:rotate-0" />
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-brand-sage/20 bg-brand-sage/5">
                <Server className="w-5 h-5 text-brand-sage" />
                <div className="text-left">
                  <div className="text-sm font-bold text-text-primary">Panguard Guard</div>
                  <div className="text-xs text-text-muted">{t('ecosystem.guard')}</div>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 lg:px-[120px] py-20 sm:py-28 border-t border-border">
        <div className="max-w-[800px] mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
              {t('cta.title')}
            </h2>
            <p className="text-text-secondary mt-4 text-lg">
              {t('cta.desc')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="max-w-lg mx-auto mt-8">
              <CodeBlock code="curl -fsSL https://panguard.ai/api/install | bash" title="Install Panguard" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-sage text-surface-0 font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {t('cta.cta1')} <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border text-text-primary font-semibold text-sm hover:bg-surface-1 transition-colors"
              >
                {t('cta.cta2')}
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
