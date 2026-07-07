'use client';

import { Check, X } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface ComparisonCard {
  readonly title: string;
  readonly tagline: string;
  readonly bullets: readonly string[];
}

const COMPARISON_CARDS: readonly ComparisonCard[] = [
  {
    title: 'vs Endpoint Security (EDR)',
    tagline: 'Endpoint tools watch the OS. PanGuard watches the AI agent.',
    bullets: [
      'Endpoint detection and response (EDR) tools monitor OS-level processes, network connections, and files. That surface is essential \u2014 and it sits below the AI agent layer.',
      'Prompt flows, MCP tool calls, and skill installations do not surface as OS events, so an agent-layer threat can be invisible to an endpoint sensor.',
      'PanGuard Guard is purpose-built for the AI agent layer \u2014 it understands skill installations, prompt injection patterns, and tool poisoning.',
      'Endpoint security and PanGuard cover different layers and complement each other: EDR for the host, PanGuard for the AI agent.',
    ],
  },
  {
    title: 'vs Code & Dependency Scanners',
    tagline: 'Dependency scanners secure your code. PanGuard secures what your agent installs.',
    bullets: [
      'Software composition and dependency scanners are excellent at finding known vulnerabilities in packages and container images \u2014 a mature, necessary practice.',
      "A malicious MCP skill usually has no CVE: it's a newer class of threat that classic vulnerability databases were not built to describe.",
      `PanGuard's Skill Auditor adds pre-install scanning for the AI agent era, with ${STATS.totalRulesDisplay} ATR rules covering skill and tool behavior.`,
      "The two are complementary: dependency scanners for your code, PanGuard for your agent's tools.",
    ],
  },
  {
    title: 'vs Prompt Firewalls',
    tagline: 'Prompt firewalls filter inputs and outputs. PanGuard secures the whole agent.',
    bullets: [
      'Prompt firewalls do input/output filtering \u2014 blocking injection attacks in LLM prompts and responses \u2014 which is valuable at the model boundary.',
      `PanGuard covers the broader agent attack surface: prompt injection plus skill compromise, context exfiltration, agent manipulation, tool poisoning, privilege escalation and more \u2014 ${STATS.totalRulesDisplay} ATR rules across 9 threat categories.`,
      'A firewall filters the prompt boundary; PanGuard adds continuous runtime monitoring and response across the agent lifecycle.',
      'They fit together: a prompt firewall at the model edge, PanGuard across skills, tools, and runtime.',
    ],
  },
  {
    title: 'vs Agent Governance Platforms',
    tagline: 'Governance platforms set the policy. PanGuard supplies the detections.',
    bullets: [
      'Agent governance platforms provide policy enforcement and compliance dashboards \u2014 the control plane for how agents are allowed to behave.',
      `PanGuard provides the detection layer those platforms can build on: ${STATS.totalRulesDisplay} ATR rules that identify prompt injection, tool poisoning, and supply chain attacks in real time.`,
      'Governance answers what is allowed; detection answers what is actually happening. Each is stronger with the other.',
      'ATR is an open standard and PanGuard is MIT-licensed and free, so governance platforms can adopt the detections directly.',
    ],
  },
  {
    title: 'vs MCP Config Scanners',
    tagline: 'Config scanners validate MCP setup. PanGuard covers the full agent surface.',
    bullets: [
      'MCP configuration scanners check MCP server configs for known misconfigurations and issues \u2014 a useful first line at setup time.',
      `PanGuard also scans SKILL.md files, tool descriptions, and runtime behavior \u2014 ${STATS.totalRulesDisplay} ATR rules across 9 threat categories, going beyond static config validation.`,
      'On the real-world SKILL.md corpus (498 samples, Layer-1 deterministic rules) ATR reaches 100% recall; benign false positives are reported per detection lane, never as a single blended number.',
      'Config validation and behavioral detection are complementary layers of the same defense.',
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
          Where PanGuard fits in your security stack
        </h1>
        <p className="text-text-secondary mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
          Endpoint tools secure the OS. Dependency scanners secure your code. Prompt firewalls filter
          the model boundary.
          <br />
          <span className="text-brand-sage font-semibold">
            PanGuard adds the AI agent layer — and complements the tools you already run.
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

function ComparisonCards() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="How the layers fit"
        title="PanGuard alongside adjacent categories"
        subtitle="Where PanGuard fits next to the security categories you already run — and how they complement each other."
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

function DetailedComparisons() {
  const items = [
    {
      slug: 'atr-vs-sigma',
      title: 'ATR vs Sigma',
      blurb: 'Open detection rule standards. Sigma for SIEM, ATR for AI agent runtime.',
    },
    {
      slug: 'atr-vs-garak',
      title: 'ATR vs NVIDIA garak',
      blurb: 'Runtime detection vs adversarial pre-deployment testing. Both needed.',
    },
    {
      slug: 'atr-vs-pyrit',
      title: 'ATR vs Microsoft PyRIT',
      blurb: 'Defender YAML standard vs red-team Python toolkit. Active cooperation.',
    },
    {
      slug: 'atr-vs-owasp-agentic-top-10',
      title: 'ATR vs OWASP Agentic Top 10',
      blurb: 'Executable rules vs taxonomy. ATR ships as OWASP A-S-R-H reference implementation.',
    },
    {
      slug: 'atr-vs-cisco-defenseclaw',
      title: 'PanGuard vs Cisco DefenseClaw',
      blurb:
        'Open standard plus commercial platform vs enterprise bundle. Cisco runs ATR in production.',
    },
  ];

  return (
    <SectionWrapper>
      <SectionTitle
        overline="DETAILED COMPARISONS"
        title="ATR vs other AI security tools"
        subtitle="Honest side-by-side comparisons with the open standards and commercial products in the AI agent security space."
      />
      <div className="max-w-5xl mx-auto mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/compare/${item.slug}`}
            className="block bg-surface-1 rounded-xl border border-border p-5 hover:border-brand-sage/40 transition-colors duration-200"
          >
            <p className="text-sm font-bold text-text-primary mb-1.5">{item.title}</p>
            <p className="text-xs text-text-secondary leading-relaxed">{item.blurb}</p>
          </Link>
        ))}
      </div>
    </SectionWrapper>
  );
}

export default function CompareContent() {
  return (
    <>
      <HeroSection />
      <BlindSpotSection />
      <EvidenceSection />
      <ComparisonCards />
      <DetailedComparisons />
      <CTASection />
    </>
  );
}
