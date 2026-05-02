'use client';

import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
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
    body:
      'Upload a directory or zip of legacy detection rules. The migrator parses Sigma YAML and YARA text without external dependencies.',
  },
  {
    icon: Cpu,
    title: 'IR + LLM enrichment',
    body:
      'Each rule passes through a source-agnostic intermediate representation, then an LLM enrichment layer that reauthors detections from endpoint fields to agent-context fields (tool_call.arguments, agent_action.command_line, agent_event.event_type).',
  },
  {
    icon: Layers,
    title: 'Compliance + tests + demo',
    body:
      'Each output rule carries a 5-framework compliance map (EU AI Act, OWASP Agentic Top 10:2026, OWASP LLM Top 10:2025, NIST AI RMF, ISO/IEC 42001), test cases (TP + TN), false-positive scenarios, and a message template.',
  },
  {
    icon: Shield,
    title: 'Validated against ATR',
    body:
      'Every output rule passes the public agent-threat-rules validateRule() — deployable to the ATR engine, Elastic Security, Splunk, GitHub code-scanning (SARIF), or any SIEM via the public ATR converters.',
  },
];

const FEATURES = [
  {
    title: 'EU AI Act audit pack',
    body:
      'JSON + Markdown + HTML evidence pack with SHA-256 + Merkle root signature. Articles 9, 12, 14, 15, 50 covered out of the box. Hand to your auditor without onboarding.',
  },
  {
    title: 'Activation demo',
    body:
      'Five attack events + five benign events replay against your migrated rules. The report tells you exactly which rule fired on which event — proof the rules work, not just that they validate.',
  },
  {
    title: 'OWASP Agentic + LLM mapping',
    body:
      'Every rule cites OWASP Agentic Top 10:2026 IDs (ASI01–ASI10) and OWASP LLM Top 10:2025 IDs (LLM01–LLM10). The mapping is part of the rule body, not a separate spreadsheet.',
  },
  {
    title: 'Threat Cloud telemetry (opt-in)',
    body:
      'Anonymized fingerprints (SHA-256 of conditions) flow to PanGuard Threat Cloud. Cross-tenant aggregation surfaces high-signal rules for crystallization back to ATR mainline. Rule body never leaves the customer.',
  },
  {
    title: 'ATR contribution path',
    body:
      'Per-rule contribution packs (scrubbed YAML + CONTRIB.md) ready for upstream PR against the open ATR repo. Customer-internal fields stripped automatically; SHA-256 over rule body for tamper evidence.',
  },
  {
    title: 'Web dashboard or CLI',
    body:
      'Run pga migrate-pro --web for a local browser dashboard with drag-and-drop upload, live progress streaming, and per-rule download links. Or stay in the terminal — both surfaces are first-class.',
  },
];

const COMMAND = `pga migrate-pro \\
  --input ./customer-rules \\
  --output ./atr-out \\
  --evidence ./atr-out/eu-pack \\
  --demo --enrich --telemetry --contribute \\
  --customer-id ACME-BANK-EU \\
  --audit-period 2026-Q2`;

export default function MigratorContent() {
  return (
    <>
      <SectionWrapper className="pt-32 pb-20">
        <FadeInUp>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Zap className="w-3 h-3" />
              Enterprise · Q3 2026 GA
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Sigma / YARA <span className="text-emerald-400">&rarr;</span> ATR YAML
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed">
              Convert legacy detection rules into AI-agent-context ATR YAML in one command.
              EU AI Act audit pack, OWASP Agentic mapping, live activation demo.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> 50/50 SigmaHQ rules converted
              </span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> 100% activation demo pass
              </span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> 5-framework compliance
              </span>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      <SectionWrapper className="py-16 bg-zinc-950/50">
        <FadeInUp>
          <SectionTitle
            title="One command, full pipeline"
            subtitle="Replace 6 months of consulting with 1 week of setup."
          />
        </FadeInUp>
        <FadeInUp>
          <div className="max-w-4xl mx-auto mt-10 rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono">
              terminal
            </div>
            <pre className="px-6 py-5 text-sm font-mono text-zinc-300 overflow-x-auto">
              <code>{COMMAND}</code>
            </pre>
          </div>
          <p className="text-center text-zinc-500 text-sm mt-4">
            Or launch the web dashboard:{' '}
            <code className="text-emerald-400 bg-zinc-900 px-2 py-0.5 rounded">
              pga migrate-pro --web
            </code>
          </p>
        </FadeInUp>
      </SectionWrapper>

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
                <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-xs text-zinc-500">Step {i + 1}</div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </FadeInUp>
            );
          })}
        </div>
      </SectionWrapper>

      <SectionWrapper className="py-20 bg-zinc-950/50">
        <FadeInUp>
          <SectionTitle
            title="Before / after"
            subtitle="Same intent, agent-context-aware detection."
          />
        </FadeInUp>
        <div className="max-w-6xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeInUp>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono flex justify-between">
                <span>Sigma (input)</span>
                <span>process_creation · windows</span>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{SIGMA_EXAMPLE}</code>
              </pre>
            </div>
          </FadeInUp>
          <FadeInUp>
            <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 overflow-hidden">
              <div className="px-4 py-2 border-b border-emerald-500/30 text-xs text-emerald-300 font-mono flex justify-between">
                <span>ATR (output)</span>
                <span>tool_call.arguments · agent_action.command_line</span>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{ATR_OUTPUT}</code>
              </pre>
            </div>
          </FadeInUp>
        </div>
        <FadeInUp>
          <div className="text-center mt-8 text-sm text-zinc-500">
            <ArrowDown className="w-4 h-4 inline-block mr-2" />
            The migrator reauthors detection fields from endpoint Sysmon to AI-agent telemetry.
            Same threat, language the runtime engine actually sees.
          </div>
        </FadeInUp>
      </SectionWrapper>

      <SectionWrapper className="py-20">
        <FadeInUp>
          <SectionTitle title="What you get" subtitle="Per migration run." />
        </FadeInUp>
        <div className="max-w-6xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <FadeInUp key={i}>
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 h-full">
                <h3 className="text-base font-semibold mb-2 text-emerald-300">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.body}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper className="py-20 bg-zinc-950/50">
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
              body:
                'Customer opens a PR against the public agent-threat-rules repo using the auto-built CONTRIB.md narrative.',
            },
            {
              title: 'TC crystallization',
              body:
                'Anonymized fingerprints aggregated across tenants. Patterns proven across N tenants with low FP get auto-PRed to ATR mainline.',
            },
            {
              title: 'Service-managed',
              body:
                'PanGuard Threat Research opens the PR on the customer’s behalf, credited or anonymous as preferred.',
            },
          ].map((p, i) => (
            <FadeInUp key={i}>
              <div className="flex items-start gap-4 p-5 rounded-lg border border-zinc-800 bg-zinc-900/40">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                  <GitPullRequest className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{p.body}</p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper className="py-24">
        <FadeInUp>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to migrate your detection coverage?
            </h2>
            <p className="text-zinc-400 mb-8">
              Enterprise pilot: 90 days, your full Sigma/YARA corpus converted with audit pack
              delivery. Q3 2026 GA. COMPUTEX 2026 demo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Migrator%20pilot"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition-colors"
              >
                Request pilot access
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/atr-org/agent-threat-rules"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
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
