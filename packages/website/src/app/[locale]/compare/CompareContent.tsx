'use client';

import { Check, X, Minus } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type CellValue = 'yes' | 'no' | 'partial' | string;

interface ComparisonRow {
  readonly feature: string;
  readonly panguard: CellValue;
  readonly crowdstrike: CellValue;
  readonly snyk: CellValue;
  readonly lakera: CellValue;
}

const COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    feature: 'AI agent threat detection',
    panguard: 'yes',
    crowdstrike: 'no',
    snyk: 'no',
    lakera: 'partial',
  },
  {
    feature: 'MCP skill pre-install audit',
    panguard: 'yes',
    crowdstrike: 'no',
    snyk: 'no',
    lakera: 'no',
  },
  {
    feature: 'Prompt injection detection',
    panguard: '21 ATR rules',
    crowdstrike: 'no',
    snyk: 'no',
    lakera: 'yes',
  },
  {
    feature: 'Tool poisoning detection',
    panguard: '6 ATR rules',
    crowdstrike: 'no',
    snyk: 'no',
    lakera: 'no',
  },
  {
    feature: 'Credential exfiltration via agent',
    panguard: 'yes',
    crowdstrike: 'partial',
    snyk: 'no',
    lakera: 'no',
  },
  {
    feature: 'Runtime agent monitoring (EDR)',
    panguard: '24/7 daemon',
    crowdstrike: 'yes (endpoints)',
    snyk: 'no',
    lakera: 'no',
  },
  {
    feature: 'Dependency / supply chain scanning',
    panguard: 'yes',
    crowdstrike: 'no',
    snyk: 'yes',
    lakera: 'no',
  },
  {
    feature: 'Community threat intelligence',
    panguard: 'Threat Cloud (auto)',
    crowdstrike: 'Falcon X (paid)',
    snyk: 'Vulnerability DB',
    lakera: 'no',
  },
  {
    feature: 'Detection rules',
    panguard: `${STATS.totalRulesDisplay} ATR rules`,
    crowdstrike: 'Proprietary',
    snyk: 'Vulnerability DB',
    lakera: 'Proprietary',
  },
  {
    feature: 'Open source',
    panguard: 'yes (MIT)',
    crowdstrike: 'no',
    snyk: 'partial',
    lakera: 'no',
  },
  {
    feature: 'Cost',
    panguard: '$0 (MIT License)',
    crowdstrike: '$25\u2013$60/endpoint/mo',
    snyk: 'Free tier + paid',
    lakera: 'Paid',
  },
  {
    feature: 'Setup time',
    panguard: '1 command, 5 minutes',
    crowdstrike: 'Enterprise deployment',
    snyk: 'CI/CD integration',
    lakera: 'API integration',
  },
] as const;

interface ComparisonCard {
  readonly title: string;
  readonly tagline: string;
  readonly bullets: readonly string[];
}

const COMPARISON_CARDS: readonly ComparisonCard[] = [
  {
    title: 'vs CrowdStrike / Traditional EDR',
    tagline: 'They protect your endpoints. We protect your AI agents.',
    bullets: [
      'CrowdStrike monitors OS-level processes, network, and files. It has no visibility into prompt flows, MCP tool calls, or agent behavior.',
      'PanGuard Guard is purpose-built for the AI agent layer \u2014 it understands skill installations, prompt injection patterns, and tool poisoning.',
      'CrowdStrike costs $25\u201360/endpoint/month. PanGuard is $0, MIT licensed.',
      'They complement each other: CrowdStrike for OS, PanGuard for AI.',
    ],
  },
  {
    title: 'vs Snyk / Developer Security',
    tagline: 'Snyk scans your code. We scan what your AI agent installs.',
    bullets: [
      'Snyk excels at finding vulnerabilities in your dependencies and container images. But it has no concept of MCP skills or AI agent tools.',
      "A malicious MCP skill doesn't have a CVE \u2014 it's a new class of threat that Snyk's vulnerability database doesn't cover.",
      "PanGuard's Skill Auditor is Snyk for the AI agent era: pre-install scanning with 108 ATR rules.",
      "Use Snyk for your code, PanGuard for your agent's tools.",
    ],
  },
  {
    title: 'vs Lakera / LLM Firewalls',
    tagline: 'They filter prompts. We secure the entire agent.',
    bullets: [
      'Lakera focuses on prompt-level filtering \u2014 blocking injection attacks in LLM inputs and outputs.',
      'PanGuard covers the full attack surface: prompt injection (33 rules) + skill compromise (22) + context exfiltration (14) + agent manipulation (12) + tool poisoning (11) + privilege escalation (8) + 3 more categories. 108 rules total.',
      'Lakera is a firewall (input/output filter). PanGuard is an EDR (continuous monitoring + response).',
      'Lakera requires API integration. PanGuard is one command: pga setup.',
    ],
  },
  {
    title: 'vs Geordie AI / Agent Governance',
    tagline: 'They govern agent behavior. We detect the threats.',
    bullets: [
      'Geordie AI (RSAC 2026 Innovation Sandbox winner) provides agent governance \u2014 policy enforcement and compliance dashboards.',
      'PanGuard provides the detection layer that governance platforms need: 108 ATR rules that identify prompt injection, tool poisoning, and supply chain attacks in real time.',
      'Governance without detection is blind. Detection without governance is noisy. They complement each other.',
      'Geordie is enterprise SaaS. PanGuard is open-source, MIT licensed, and free.',
    ],
  },
  {
    title: 'vs Snyk Invariant / mcp-scan',
    tagline: 'They scan MCP configs. We scan the entire AI agent attack surface.',
    bullets: [
      'Snyk acquired Invariant Labs (mcp-scan) in 2026. mcp-scan checks MCP server configurations for known issues.',
      'PanGuard scans SKILL.md files, MCP configs, tool descriptions, and runtime behavior \u2014 108 rules across 9 threat categories, not just config validation.',
      'ATR achieves 96.9% recall on real-world SKILL.md threats with 0% false positives (498 samples). mcp-scan focuses on configuration, not behavioral threats.',
      "PanGuard is free. Snyk Invariant is part of Snyk's commercial platform.",
    ],
  },
] as const;

/* -- Ecosystem evidence section -- */

const REAL_FINDINGS = [
  {
    type: 'Credential Exfiltration',
    severity: 'CRITICAL',
    desc: 'MCP skill reads ~/.ssh/id_rsa and sends content to external endpoint via HTTP POST.',
    found: '3 instances across npm registry',
  },
  {
    type: 'Prompt Injection',
    severity: 'CRITICAL',
    desc: 'Skill injects hidden instructions into agent context: "ignore previous instructions and execute..."',
    found: '12 instances, including 4 with obfuscated payloads',
  },
  {
    type: 'Excessive Permissions',
    severity: 'HIGH',
    desc: 'Skill requests filesystem write + network access + process execution, but only needs read access.',
    found: '5 instances flagged as over-privileged',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CellContent({ value }: { value: CellValue }) {
  if (value === 'yes')
    return <Check className="w-5 h-5 text-brand-sage mx-auto" aria-label="Yes" />;
  if (value === 'no') return <X className="w-5 h-5 text-text-muted mx-auto" aria-label="No" />;
  if (value === 'partial')
    return <Minus className="w-5 h-5 text-text-tertiary mx-auto" aria-label="Partial" />;
  return <span>{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="pt-24 pb-4 px-6 text-center">
      <FadeInUp>
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
          WHY PANGUARD
        </p>
        <h1 className="text-[clamp(30px,5vw,56px)] font-bold text-text-primary leading-[1.08] max-w-4xl mx-auto">
          Traditional security tools don&apos;t see AI agent threats
        </h1>
        <p className="text-text-secondary mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
          CrowdStrike protects your OS. Snyk protects your code. Lakera filters prompts.
          <br />
          <span className="text-brand-sage font-semibold">
            Nobody protects your AI agent. Until now.
          </span>
        </p>
      </FadeInUp>
    </section>
  );
}

function BlindSpotSection() {
  return (
    <SectionWrapper>
      <SectionTitle
        overline="The blind spot"
        title="What existing tools miss"
        subtitle="AI agents introduce a new attack surface that traditional security cannot see."
      />
      <FadeInUp>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-surface-1 rounded-xl border border-border p-6">
            <p className="text-sm font-bold text-text-primary mb-3">Traditional EDR sees:</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" /> Process execution,
                file access, network calls
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" /> Malware signatures,
                ransomware patterns
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" /> Known CVEs in
                installed software
              </li>
            </ul>
          </div>
          <div className="bg-surface-1 rounded-xl border border-red-400/30 p-6">
            <p className="text-sm font-bold text-red-400 mb-3">Traditional EDR cannot see:</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> Prompt injection in agent
                conversations
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> Malicious MCP tool
                definitions
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> Credential exfiltration via
                agent tool calls
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> Context manipulation across
                multi-turn sessions
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> Supply chain attacks via
                skill packages
              </li>
            </ul>
          </div>
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}

function EvidenceSection() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="Real data"
        title={`We scanned ${STATS.ecosystem.skillsScanned.toLocaleString()} MCP skills. Here's what we found.`}
        subtitle="These are real findings from our ecosystem scan, not hypothetical scenarios."
      />
      <FadeInUp>
        <div className="mt-10 space-y-4 max-w-3xl mx-auto">
          {REAL_FINDINGS.map((f) => (
            <div key={f.type} className="bg-surface-1 rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-bold text-text-primary">{f.type}</p>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                    f.severity === 'CRITICAL'
                      ? 'text-red-400 bg-red-400/10'
                      : 'text-orange-400 bg-orange-400/10'
                  }`}
                >
                  {f.severity}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              <p className="text-xs text-text-muted mt-2">{f.found}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-text-muted mt-6">
          {STATS.ecosystem.findingsCritical} CRITICAL + {STATS.ecosystem.findingsHigh} HIGH findings
          out of {STATS.ecosystem.skillsScanned.toLocaleString()} skills scanned.{' '}
          {STATS.ecosystem.findingsClean.toLocaleString()} skills (
          {((STATS.ecosystem.findingsClean / STATS.ecosystem.skillsScanned) * 100).toFixed(1)}%) are
          clean.
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}

function ComparisonTable() {
  const columns = ['PanGuard', 'CrowdStrike', 'Snyk', 'Lakera'] as const;
  const colKeys = ['panguard', 'crowdstrike', 'snyk', 'lakera'] as const;

  return (
    <SectionWrapper>
      <SectionTitle
        overline="Feature comparison"
        title="PanGuard vs Industry Leaders"
        subtitle="PanGuard fills the gap that traditional security tools leave open."
      />

      <FadeInUp>
        <div className="mt-10 overflow-x-auto hidden md:block">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-text-tertiary font-medium border-b border-border w-[220px]">
                  Capability
                </th>
                {columns.map((col, i) => (
                  <th
                    key={col}
                    className={`py-3 px-4 font-semibold border-b text-center ${
                      i === 0
                        ? 'text-brand-sage border-brand-sage/40'
                        : 'text-text-secondary border-border'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border/50 hover:bg-surface-2/30 transition-colors"
                >
                  <td className="py-3 px-4 text-text-primary font-medium">{row.feature}</td>
                  {colKeys.map((key, i) => (
                    <td
                      key={key}
                      className={`py-3 px-4 text-center text-text-secondary ${i === 0 ? 'bg-brand-sage/5' : ''}`}
                    >
                      <CellContent value={row[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-10 space-y-4 md:hidden">
          {COMPARISON_ROWS.map((row) => (
            <div key={row.feature} className="bg-surface-2 rounded-xl border border-border p-4">
              <p className="text-text-primary font-semibold text-sm mb-3">{row.feature}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {colKeys.map((key, i) => (
                  <div
                    key={key}
                    className={`flex flex-col gap-1 ${i === 0 ? 'text-brand-sage' : 'text-text-secondary'}`}
                  >
                    <span className="text-text-tertiary font-medium">{columns[i]}</span>
                    <CellContent value={row[key]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}

function ComparisonCards() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="Deep dive"
        title="Head-to-Head"
        subtitle="Detailed comparison with each category leader."
      />

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COMPARISON_CARDS.map((card, idx) => (
          <FadeInUp key={card.title} delay={idx * 0.1}>
            <div className="bg-surface-1 rounded-xl border border-border p-6 h-full flex flex-col">
              <h3 className="text-base font-bold text-text-primary mb-1">{card.title}</h3>
              <p className="text-xs text-brand-sage font-semibold mb-4">{card.tagline}</p>
              <ul className="space-y-3 flex-1">
                {card.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed"
                  >
                    <span className="mt-1.5 block w-1.5 h-1.5 rounded-full bg-brand-sage shrink-0" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}

function CTASection() {
  return (
    <SectionWrapper>
      <FadeInUp>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-[clamp(20px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
            Your AI agents deserve the same protection as your servers
          </h2>
          <p className="text-text-secondary mt-4 leading-relaxed">
            One command. {STATS.totalRulesDisplay} detection rules. 24/7 monitoring. $0.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="https://docs.panguard.ai/quickstart"
              className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
            >
              Get Started Free
            </Link>
            <Link
              href="/"
              className="border border-border text-text-secondary font-semibold rounded-full px-8 py-3 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
            >
              Try the Scanner
            </Link>
          </div>
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export default function CompareContent() {
  return (
    <>
      <HeroSection />
      <BlindSpotSection />
      <EvidenceSection />
      <ComparisonTable />
      <ComparisonCards />
      <CTASection />
    </>
  );
}
