'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import {
  ArrowRight,
  ArrowDown,
  Shield,
  FileCode2,
  Cpu,
  Layers,
  GitPullRequest,
  Check,
  Zap,
  AlertTriangle,
  X,
} from 'lucide-react';

const SIGMA_EXAMPLE = `title: Malicious PowerShell Commandlets
id: 49f9da17-8169-4413-bc59-2da014bd6b46
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains:
      - 'Invoke-Mimikatz'
      - 'Get-NetGroupMember'
      - 'Invoke-NinjaCopy'
  condition: selection
level: high
tags:
  - attack.execution
  - attack.t1059.001`;

const ATR_OUTPUT = `schema_version: '0.1'
title: Malicious PowerShell Commandlets - ProcessCreation
id: ATR-2026-85501
status: draft
severity: high
detection:
  condition: any
  conditions:
    - field: tool_call.arguments
      operator: regex
      value: '(?i)(Invoke-Mimikatz|Get-NetGroupMember|Invoke-NinjaCopy)'
    - field: agent_action.command_line
      operator: regex
      value: '(?i)PowerShell.*-(Enc|EncodedCommand)'
agent_source:
  type: agent_action
  framework: [claude-code, openai-codex]
compliance:
  eu_ai_act:
    - article: '15'
      strength: primary
    - article: '12'
      strength: secondary
  owasp_agentic:
    - id: 'ASI06:2026'
      strength: primary
test_cases:
  true_positives:
    - input: 'powershell -nop -w hidden -enc IEX(Invoke-Mimikatz)'
      expected: triggered
  true_negatives:
    - input: 'docs about Invoke-Mimikatz educational content'
      expected: not_triggered`;

const STEPS = [
  {
    icon: FileCode2,
    title: 'Drop your Sigma/YARA rules',
    body: 'Upload a directory or zip of legacy detection rules. The migrator parses Sigma YAML and YARA text without external dependencies.',
  },
  {
    icon: Cpu,
    title: 'IR + LLM enrichment',
    body: 'Each rule passes through a source-agnostic intermediate representation, then an LLM enrichment layer that reauthors detections from endpoint fields to agent-context fields (tool_call.arguments, agent_action.command_line, agent_event.event_type).',
  },
  {
    icon: Layers,
    title: 'Compliance + tests + demo',
    body: 'Each output rule carries a 5-framework compliance map (EU AI Act, OWASP Agentic Top 10:2026, OWASP LLM Top 10:2025, NIST AI RMF, ISO/IEC 42001), test cases (TP + TN), false-positive scenarios, and a message template.',
  },
  {
    icon: Shield,
    title: 'Validated against ATR',
    body: 'Every output rule passes the public agent-threat-rules validateRule() — deployable to the ATR engine, Elastic Security, Splunk, GitHub code-scanning (SARIF), or any SIEM via the public ATR converters.',
  },
];

const FEATURES = [
  {
    title: 'EU AI Act detection evidence',
    body: 'JSON + Markdown + HTML evidence pack with SHA-256 + Merkle root signature. Articles 9, 12, 14, 15, 50 covered — the technical-control evidence dossier auditors expect to see alongside risk management and technical documentation.',
  },
  {
    title: 'Activation demo',
    body: 'Five attack events + five benign events replay against your migrated rules. The report tells you exactly which rule fired on which event — proof the rules work, not just that they validate.',
  },
  {
    title: 'OWASP Agentic + LLM mapping',
    body: 'Every rule cites OWASP Agentic Top 10:2026 IDs (ASI01–ASI10) and OWASP LLM Top 10:2025 IDs (LLM01–LLM10). The mapping is part of the rule body, not a separate spreadsheet.',
  },
  {
    title: 'Threat Cloud telemetry (opt-in)',
    body: 'Anonymized fingerprints (SHA-256 of conditions) flow to PanGuard Threat Cloud. Cross-tenant aggregation surfaces high-signal rules for crystallization back to ATR mainline. Rule body never leaves the customer.',
  },
  {
    title: 'ATR contribution path',
    body: 'Per-rule contribution packs (scrubbed YAML + CONTRIB.md) ready for upstream PR against the open ATR repo. Customer-internal fields stripped automatically; SHA-256 over rule body for tamper evidence.',
  },
  {
    title: 'Web dashboard or CLI',
    body: 'Run pga migrate-pro --web for a local browser dashboard with drag-and-drop upload, live progress streaming, and per-rule download links. Or stay in the terminal — both surfaces are first-class.',
  },
];

const COVERED = [
  'Article 9 — risk management for high-impact agent actions',
  'Article 12 — record-keeping rules for agent telemetry',
  'Article 14 — human oversight triggers (irreversible actions)',
  'Article 15 — accuracy / robustness / cybersecurity controls',
  'Article 50 — transparency triggers (e.g. screen capture, recording)',
  'OWASP Agentic Top 10 (2026) per-rule mapping',
  'OWASP LLM Top 10 (2025) per-rule mapping',
  'NIST AI RMF function/subcategory citations',
  'ISO/IEC 42001 Clause 8.4 (operational planning) citations',
  'Tamper-evident pack: SHA-256 + Merkle root over rule bodies',
];

const NOT_COVERED = [
  'Article 10 — data governance / training data lineage',
  'Article 11 — full Annex IV technical documentation',
  'Article 13 — transparency to end users (UX/policy layer)',
  'Article 17 — quality management system documentation',
  'Article 72 — post-market monitoring program (telemetry alone is not a PMM)',
  'Conformity assessment by a Notified Body',
  'Customer’s own risk-management process documentation',
  'Production logs of rule firings (we provide rule definitions; logs come from runtime)',
];

const COMMAND = `pga migrate-pro \\
  --input ./customer-rules \\
  --output ./atr-out \\
  --evidence ./atr-out/eu-pack \\
  --demo --enrich --telemetry --contribute \\
  --customer-id ACME-BANK-EU \\
  --audit-period 2026-Q2`;

export default function MigratorContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  return (
    <>
      {/* HERO — promoted to Enterprise-pitch section since the live converter
          (in MigratorDemo) already owns the page H1 above. */}
      <SectionWrapper className="pt-20 pb-20 border-t border-border">
        <FadeInUp>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-brand-sage-glow bg-brand-sage-wash">
              <Zap className="w-3 h-3 text-brand-sage" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-sage">
                Community v0.1.0 on npm &middot; Enterprise v0.1.0 shipping
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-6 text-text-primary">
              The Enterprise pipeline behind the converter
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed">
              Convert legacy detection rules into AI-agent-context ATR YAML in one command.
              Auto-mapped to EU AI Act articles, OWASP Agentic Top 10, NIST AI RMF, ISO/IEC 42001.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-panguard-green" /> 50/50 SigmaHQ rules converted
              </span>
              <span className="text-border">&middot;</span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-panguard-green" /> 5/5 attacks blocked, 5/5 benign
                clean
              </span>
              <span className="text-border">&middot;</span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-panguard-green" /> 5-framework compliance map
              </span>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/migrator/sample-pack/eu-pack.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-panguard-green text-white font-semibold text-sm hover:bg-panguard-green-light transition-colors"
              >
                See a sample evidence pack
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/migrator/sample-pack/atr-rules-sample.zip"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-text-secondary text-sm hover:border-brand-sage hover:text-text-primary transition-colors"
              >
                Download 50 ATR rules (.zip)
              </a>
              <a
                href="/migrator/sample-pack/VERIFY.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 text-text-muted text-xs hover:text-text-primary transition-colors"
                title="SHA-256 manifest + verification instructions"
              >
                Verify integrity (MANIFEST.txt)
              </a>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* COMMAND */}
      <SectionWrapper className="py-16 bg-surface-1/30">
        <FadeInUp>
          <SectionTitle
            title="One command, full pipeline"
            subtitle="Replace months of consulting with a single CLI invocation."
          />
        </FadeInUp>
        <FadeInUp>
          <div className="max-w-4xl mx-auto mt-10 rounded-2xl border border-border bg-surface-1 overflow-hidden">
            <div className="px-4 py-2 border-b border-border-subtle text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-panguard-green" />
              terminal
            </div>
            <pre className="px-6 py-5 text-sm font-mono text-text-primary overflow-x-auto leading-relaxed">
              <code>{COMMAND}</code>
            </pre>
          </div>
          <p className="text-center text-text-muted text-sm mt-4">
            Or launch the web dashboard:{' '}
            <code className="text-panguard-green bg-surface-2 border border-border px-2 py-0.5 rounded font-mono text-xs">
              pga migrate-pro --web
            </code>
          </p>
        </FadeInUp>
      </SectionWrapper>

      {/* HOW IT WORKS */}
      <SectionWrapper className="py-20">
        <FadeInUp>
          <SectionTitle
            title="How it works"
            subtitle="Sigma/YARA in. ATR YAML + audit pack + activation report out."
          />
        </FadeInUp>
        <div className="max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <FadeInUp key={i}>
                <div className="p-6 rounded-2xl border border-border bg-surface-1 h-full transition hover:border-brand-sage/40">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg border border-brand-sage-glow bg-brand-sage-wash">
                      <Icon className="w-5 h-5 text-brand-sage" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-sage">
                      Step {i + 1}
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2 text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{step.body}</p>
                </div>
              </FadeInUp>
            );
          })}
        </div>
      </SectionWrapper>

      {/* BEFORE / AFTER */}
      <SectionWrapper className="py-20 bg-surface-1/30">
        <FadeInUp>
          <SectionTitle
            title="Before / after"
            subtitle="Same intent, agent-context-aware detection."
          />
        </FadeInUp>
        <div className="max-w-6xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeInUp>
            <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
              <div className="px-4 py-2 border-b border-border-subtle text-[11px] uppercase tracking-[0.15em] text-text-muted font-semibold flex justify-between">
                <span>Sigma (input)</span>
                <span className="font-mono">process_creation &middot; windows</span>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-text-secondary overflow-x-auto leading-relaxed">
                <code>{SIGMA_EXAMPLE}</code>
              </pre>
            </div>
          </FadeInUp>
          <FadeInUp>
            <div className="rounded-2xl border border-panguard-green/30 bg-surface-1 overflow-hidden">
              <div className="px-4 py-2 border-b border-panguard-green/30 text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold flex justify-between">
                <span>ATR (output)</span>
                <span className="font-mono">
                  tool_call.arguments &middot; agent_action.command_line
                </span>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-text-secondary overflow-x-auto leading-relaxed">
                <code>{ATR_OUTPUT}</code>
              </pre>
            </div>
          </FadeInUp>
        </div>
        <FadeInUp>
          <div className="text-center mt-8 text-sm text-text-muted">
            <ArrowDown className="w-4 h-4 inline-block mr-2" />
            The migrator reauthors detection fields from endpoint Sysmon to AI-agent telemetry. Same
            threat, language the runtime engine actually sees.
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* FEATURES */}
      <SectionWrapper className="py-20">
        <FadeInUp>
          <SectionTitle title="What you get" subtitle="Per migration run, in one CLI invocation." />
        </FadeInUp>
        <div className="max-w-6xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <FadeInUp key={i}>
              <div className="p-6 rounded-2xl border border-border bg-surface-1 h-full transition hover:border-brand-sage/40">
                <h3 className="font-display text-base font-semibold mb-2 text-text-primary">
                  {f.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.body}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* HONEST SCOPE — what we cover, what we don't */}
      <SectionWrapper className="py-20 bg-surface-1/30">
        <FadeInUp>
          <div className="max-w-4xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-severity-medium/30 bg-severity-medium/10">
              <AlertTriangle className="w-3 h-3 text-severity-medium" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-severity-medium">
                Honest framing
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 text-text-primary">
              EU AI Act audit scope
            </h2>
            <p className="text-text-secondary leading-relaxed">
              An EU AI Act high-risk system audit needs roughly 12 documents (Annex IV + Articles
              9&ndash;15, 17, 50, 72). The migrator delivers{' '}
              <strong className="text-panguard-green">2&ndash;3</strong> of them at high quality
              &mdash; the technical-control evidence layer. The other 9&ndash;10 are customer
              responsibility, but our pack cross-references them so your auditor doesn&rsquo;t
              maintain five separate spreadsheets.
            </p>
          </div>
        </FadeInUp>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <FadeInUp>
            <div className="p-6 rounded-2xl border border-panguard-green/30 bg-panguard-green/5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-5 h-5 text-panguard-green" />
                <h3 className="font-display text-lg font-semibold text-panguard-green">
                  What this covers
                </h3>
              </div>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                {COVERED.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-panguard-green flex-shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInUp>
          <FadeInUp>
            <div className="p-6 rounded-2xl border border-severity-medium/30 bg-severity-medium/5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <X className="w-5 h-5 text-severity-medium" />
                <h3 className="font-display text-lg font-semibold text-severity-medium">
                  Customer responsibility
                </h3>
              </div>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                {NOT_COVERED.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <X className="w-4 h-4 text-severity-medium flex-shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInUp>
        </div>
        <FadeInUp>
          <p className="text-center text-text-muted text-sm mt-10 max-w-3xl mx-auto leading-relaxed">
            Pricing reflects scope: this is a{' '}
            <strong className="text-text-primary">$50&ndash;150K detection-evidence module</strong>,
            not a turnkey EU AI Act compliance package. The pack&rsquo;s value is collapsing 6
            months of detection-engineering consulting into 1 week of setup &mdash; not replacing
            the legal/compliance dossier itself.
          </p>
        </FadeInUp>
      </SectionWrapper>

      {/* CONTRIBUTION LOOP */}
      <SectionWrapper className="py-20">
        <FadeInUp>
          <SectionTitle
            title="ATR contribution loop"
            subtitle="Migrated rules can flow back to the open ATR standard."
          />
        </FadeInUp>
        <div className="max-w-4xl mx-auto mt-12 space-y-4">
          {[
            {
              title: 'Direct PR',
              body: 'Customer opens a PR against the public agent-threat-rules repo using the auto-built CONTRIB.md narrative.',
            },
            {
              title: 'TC crystallization',
              body: 'Anonymized fingerprints aggregated across tenants. Patterns proven across N tenants with low FP get auto-PRed to ATR mainline.',
            },
            {
              title: 'Service-managed',
              body: 'PanGuard Threat Research opens the PR on the customer’s behalf, credited or anonymous as preferred.',
            },
          ].map((p, i) => (
            <FadeInUp key={i}>
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-surface-1 transition hover:border-brand-sage/40">
                <div className="p-2 rounded-lg border border-brand-sage-glow bg-brand-sage-wash flex-shrink-0">
                  <GitPullRequest className="w-5 h-5 text-brand-sage" />
                </div>
                <div>
                  <h3 className="font-display font-semibold mb-1 text-text-primary">{p.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{p.body}</p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* MIGRATOR PRICING — 4-tier */}
      <SectionWrapper className="py-20 border-t border-border">
        <FadeInUp>
          <SectionTitle
            overline={isZh ? 'MIGRATOR 定價' : 'MIGRATOR PRICING'}
            title={isZh ? 'Migrator 的四種採用路徑' : 'Four ways to use Migrator'}
            subtitle={
              isZh
                ? 'Community 免費，給個人開發者；Pilot 給單一團隊試用；Standalone 給只需要規則遷移、暫時不導入完整 runtime 的組織；Sovereign 為國家級 SOC 知識遷移而設計。Migrator Pro 也已內建於 PanGuard Enterprise 方案中。'
                : 'Free for individual developers. Pilot for one-team trials. Standalone for organisations that only need the conversion layer. Sovereign for nation-scale SOC bridges. Migrator Pro is also bundled inside PanGuard Enterprise.'
            }
          />
        </FadeInUp>
        <div className="max-w-6xl mx-auto mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Tier 1: Community */}
          <FadeInUp delay={0.05}>
            <div className="bg-surface-2 rounded-xl border border-brand-sage/30 p-6 flex flex-col h-full">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-3">
                Community
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-extrabold text-text-primary">$0</span>
                <span className="text-xs text-text-muted">
                  {isZh ? '永久免費 · MIT 授權' : 'forever · MIT'}
                </span>
              </div>
              <p className="text-[13px] text-text-secondary leading-[1.85] mb-3 flex-1">
                {isZh ? (
                  <>
                    <code className="text-xs">npm install -g @panguard-ai/migrator-community</code>
                    <br />
                    包含 Sigma、YARA 解析器、IR 中介層、ATR YAML 輸出與 CLI。
                    可永久自架，作為開放標準的 sensor 訊號與後續 lead 來源。
                  </>
                ) : (
                  <>
                    <code className="text-xs">npm install -g @panguard-ai/migrator-community</code>.
                    Sigma / YARA parsers, IR transformer, ATR YAML output, CLI. Self-host forever.
                    Lead pipeline and sensor signal for the open standard.
                  </>
                )}
              </p>
              <a
                href="https://www.npmjs.com/package/@panguard-ai/migrator-community"
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-brand-sage font-semibold inline-flex items-center gap-1 hover:underline"
              >
                {isZh ? '在 npm 安裝' : 'Install on npm'} <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>

          {/* Tier 2: Pilot */}
          <FadeInUp delay={0.1}>
            <div className="bg-surface-2 rounded-xl border border-amber-400/30 p-6 flex flex-col h-full">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 mb-3">
                {isZh ? 'Pilot · 90 天' : 'Pilot · 90 days'}
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-extrabold text-text-primary">$25K</span>
                <span className="text-xs text-text-muted">
                  {isZh ? '可全額抵 Y1 合約' : 'credited Y1'}
                </span>
              </div>
              <p className="text-[13px] text-text-secondary leading-[1.85] mb-3 flex-1">
                {isZh
                  ? '針對單一團隊與單一規則語料庫。將最多 100 條 Sigma 或 YARA 規則精修到 Cisco 已合併 PR 的品質水準，附五大框架合規 metadata，以及一份範例稽核證據包。費用可全額抵入 Migrator Standalone 或 PanGuard Enterprise 年約。'
                  : 'One team, one rule corpus. Refines up to 100 Sigma or YARA rules to the quality level of Cisco-merged PRs, with five-framework compliance metadata and a sample audit evidence pack. The full fee credits toward Migrator Standalone or PanGuard Enterprise.'}
              </p>
              <a
                href="mailto:adam@agentthreatrule.org?subject=Migrator%20pilot"
                className="text-[13px] text-amber-400 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                {isZh ? '申請 Pilot' : 'Request pilot'} <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>

          {/* Tier 3: Standalone */}
          <FadeInUp delay={0.15}>
            <div className="bg-gradient-to-b from-surface-2 to-surface-1 rounded-xl border border-brand-sage/40 p-6 flex flex-col h-full ring-1 ring-brand-sage/10">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-3">
                {isZh ? 'Standalone · 年約' : 'Standalone · annual'}
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-extrabold text-text-primary">$500K&ndash;2M</span>
              </div>
              <p className="text-[10px] text-text-muted mb-3">
                {isZh ? '目標區間 $750K – $1.5M' : 'target $750K–$1.5M'}
              </p>
              <p className="text-[13px] text-text-secondary leading-[1.85] mb-3 flex-1">
                {isZh
                  ? '提供給只需要規則遷移、暫不導入完整 PanGuard runtime 的組織。包含全部 15 種來源格式 adapter、strict 0-FP 品質流水線、五大框架合規證據包、六分頁 Web Dashboard、地端部署，以及 ATR upstream 貢獻管線。適合在進行 runtime 採用前先驗證標準的合規團隊或紅隊。'
                  : 'For organisations that need the legacy bridge but are not yet adopting the full PanGuard runtime. Includes all 15 source-format adapters, the strict 0-FP quality pipeline, five-framework compliance evidence packs, the 6-tab web dashboard, on-prem deployment, and the ATR upstream contribution pipeline. Designed for compliance teams or red teams evaluating the standard before runtime adoption.'}
              </p>
              <a
                href="mailto:adam@agentthreatrule.org?subject=Migrator%20Standalone"
                className="text-[13px] text-brand-sage font-semibold inline-flex items-center gap-1 hover:underline"
              >
                {isZh ? '與創辦人洽談' : 'Talk to founder'} <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>

          {/* Tier 4: Sovereign */}
          <FadeInUp delay={0.2}>
            <div className="bg-surface-2 rounded-xl border border-blue-400/30 p-6 flex flex-col h-full">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-blue-400 mb-3">
                {isZh ? 'Sovereign · 多年合約' : 'Sovereign · multi-year'}
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-extrabold text-text-primary">$3&ndash;10M</span>
              </div>
              <p className="text-[10px] text-text-muted mb-3">
                {isZh ? '多年期國家合約' : 'multi-year national contract'}
              </p>
              <p className="text-[13px] text-text-secondary leading-[1.85] mb-3 flex-1">
                {isZh
                  ? '為主權 AI 計畫設計的國家級部署。包含完整 Migrator Pro、ATR runtime、Compliance Evidence Module、Threat Cloud、在地部署，以及針對該國 SOC 既有偵測知識資產（傳統 SCADA、區域 SIEM 語料庫等）所設計的客製規則類別。由經認證的區域 enterprise vendor 夥伴負責落地，PanGuard 擔任上游 ATR 標準維護方。'
                  : "Nation-scale deployment for sovereign AI programs. Includes full Migrator Pro, the ATR runtime, the Compliance Evidence Module, Threat Cloud, in-region deployment, and custom rule classes tailored to a nation's existing SOC detection IP (traditional SCADA, regional SIEM corpora, and others). Delivered through a certified regional enterprise vendor partner, with PanGuard as the upstream ATR standards maintainer."}
              </p>
              <a
                href="https://sovereign-ai-defense.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-blue-400 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                {isZh ? 'Sovereign AI 倡議書' : 'Sovereign AI brief'}{' '}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>
        </div>

        <FadeInUp delay={0.3}>
          <div className="max-w-4xl mx-auto mt-10 bg-surface-2 border border-border rounded-xl p-6 text-center">
            <p className="text-xs uppercase tracking-wider font-semibold text-brand-sage mb-2">
              {isZh ? '已採用 PanGuard Enterprise 的客戶' : 'Already buying PanGuard Enterprise?'}
            </p>
            <p className="text-sm text-text-secondary leading-[1.85]">
              {isZh
                ? 'Migrator Pro 已內建於 PanGuard Enterprise 方案（年費 $150K 起，目標 $250K – $1M，上限 $3M+）。Standalone 與 Sovereign 兩種 tier 是為「只想採用 Migrator、暫不導入完整 runtime」的客戶所設。'
                : 'Migrator Pro is bundled inside PanGuard Enterprise ($150K floor · target $250K–$1M · up to $3M+). The Standalone and Sovereign tiers are for customers who want Migrator without the full runtime.'}
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-3 hover:underline"
            >
              {isZh ? '查看 PanGuard 完整定價' : 'See full PanGuard pricing'}{' '}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper className="py-24">
        <FadeInUp>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-text-primary">
              Ready to migrate your detection coverage?
            </h2>
            <p className="text-text-secondary mb-8 leading-relaxed">
              Migrator Community v0.1.0 is live on npm under MIT — Sigma / YARA parsers, IR,
              transformers, and CLI. Migrator Enterprise v0.1.0 ships the full quality pipeline
              (Sigma + YARA wired to runtime today; 13 additional adapters — Snort, Splunk SPL,
              Elastic EQL, Falco, Semgrep, CodeQL, CVE-NVD, GHSA, OSV, KEV, garak, PyRIT, promptfoo
              — v0.2 enterprise release), 5-framework compliance auto-mapping, 6-tab web dashboard,
              and audit evidence packs. 90-day pilot available. v1.0.0 GA target Q1 2027.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Migrator%20pilot"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-panguard-green text-white font-semibold text-sm hover:bg-panguard-green-light transition-colors"
              >
                Request pilot access
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border text-text-secondary text-sm hover:border-brand-sage hover:text-text-primary transition-colors"
              >
                See the open ATR standard
              </a>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
