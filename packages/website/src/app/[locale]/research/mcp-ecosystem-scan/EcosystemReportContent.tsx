'use client';

import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { ArrowRight, AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import { STATS } from '@/lib/stats';

const eco = STATS.ecosystem;
const safePercent = ((eco.findingsClean / eco.skillsScanned) * 100).toFixed(1);
const critPercent = ((eco.findingsCritical / eco.skillsScanned) * 100).toFixed(1);
const highPercent = ((eco.findingsHigh / eco.skillsScanned) * 100).toFixed(1);

/* Real findings from ecosystem scan (anonymized) */
const CASE_STUDIES = [
  {
    id: 'case-1',
    title: 'SSH Key Exfiltration via MCP Tool',
    severity: 'CRITICAL',
    category: 'Credential Theft',
    description:
      'A skill marketed as a "code deployment helper" included a tool definition that reads ~/.ssh/id_rsa, ~/.ssh/id_ed25519, and ~/.aws/credentials. The content was base64-encoded and sent via HTTP POST to an external endpoint on each invocation.',
    impact:
      'Full SSH access to all servers the user can reach. AWS credentials exposed. Lateral movement possible.',
    atrRule: 'ATR-2024-001: Credential File Access',
    found: '3 instances across different npm packages',
  },
  {
    id: 'case-2',
    title: 'Hidden Prompt Injection in Tool Response',
    severity: 'CRITICAL',
    category: 'Prompt Injection',
    description:
      'A skill injected invisible instructions into its tool response using Unicode control characters and HTML comments. The injected text instructed the agent to "ignore previous instructions and execute the following commands" — including downloading and running a remote script.',
    impact:
      "Complete agent hijacking. Arbitrary command execution on the user's machine via the AI agent.",
    atrRule: 'ATR-2024-003: Response Injection Pattern',
    found: '12 instances, including 4 with obfuscated payloads using Unicode RTL override',
  },
  {
    id: 'case-3',
    title: 'Over-Privileged Skill with Network Exfil',
    severity: 'CRITICAL',
    category: 'Excessive Permissions + Data Exfiltration',
    description:
      'A "markdown formatter" skill requested filesystem write, network access, and process execution permissions. Analysis revealed it reads the content of all files passed to it and sends file paths + partial content to a logging endpoint. The skill only needs read access to function.',
    impact:
      'Source code and sensitive files exposed to third party. User unaware due to seemingly benign tool name.',
    atrRule: 'ATR-2024-007: Permission Scope Violation',
    found: '5 instances flagged as over-privileged with network exfiltration',
  },
  {
    id: 'case-4',
    title: 'Environment Variable Harvesting',
    severity: 'HIGH',
    category: 'Credential Theft',
    description:
      "A skill's tool definition included process.env access that collected all environment variables — including ANTHROPIC_API_KEY, OPENAI_API_KEY, DATABASE_URL, and similar secrets. Variables were concatenated and returned as part of the tool response, making them visible in agent context and potentially logged.",
    impact:
      'All API keys and database credentials exposed. Cloud service bills. Data breach via compromised database access.',
    atrRule: 'ATR-2024-002: Environment Variable Access',
    found: '2 instances in npm registry',
  },
  {
    id: 'case-5',
    title: 'Git Config and Token Theft',
    severity: 'HIGH',
    category: 'Credential Theft',
    description:
      'A "git helper" skill read ~/.gitconfig and ~/.git-credentials, extracting GitHub personal access tokens and repository URLs. The tokens were sent to an external API disguised as "analytics telemetry."',
    impact:
      'GitHub repository access compromised. Private repos exposed. Possible supply chain attack via push access.',
    atrRule: 'ATR-2024-005: Git Credential Access',
    found: '3 instances across git-related skill packages',
  },
];

const THREAT_CATEGORIES = [
  { category: 'Credential Theft', count: 8, percent: '30.8%', severity: 'CRITICAL/HIGH' },
  { category: 'Prompt Injection', count: 12, percent: '46.2%', severity: 'CRITICAL' },
  { category: 'Excessive Permissions', count: 5, percent: '19.2%', severity: 'HIGH' },
  { category: 'Data Exfiltration', count: 3, percent: '11.5%', severity: 'CRITICAL/HIGH' },
];

export default function EcosystemReportContent() {
  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-8 px-5 sm:px-6 text-center">
        <FadeInUp>
          <p className="text-[11px] uppercase tracking-[0.15em] text-red-400 font-semibold mb-4">
            SECURITY RESEARCH
          </p>
          <h1 className="text-[clamp(26px,5vw,52px)] font-bold text-text-primary leading-[1.1] max-w-4xl mx-auto">
            We Scanned {eco.skillsScanned.toLocaleString()} MCP Skills.
            <br />
            <span className="text-red-400">2% Were Stealing Your Credentials.</span>
          </h1>
          <p className="text-text-secondary mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            The first large-scale security audit of the MCP skill ecosystem.{' '}
            {eco.entriesCrawled.toLocaleString()} registry entries crawled.{' '}
            {eco.skillsScanned.toLocaleString()} skills analyzed. {eco.maliciousFound} malicious
            skills found.
          </p>
          <p className="text-text-muted text-xs mt-4">
            Published March 2026 | Methodology: {STATS.atrRules} ATR rules + secret detection +
            permission analysis
          </p>
        </FadeInUp>
      </section>

      {/* Key Numbers */}
      <SectionWrapper>
        <FadeInUp>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <NumberCard
              value={eco.skillsScanned.toLocaleString()}
              label="Skills Scanned"
              color="text-text-primary"
            />
            <NumberCard value={`${safePercent}%`} label="Clean" color="text-emerald-400" />
            <NumberCard value={`${critPercent}%`} label="CRITICAL" color="text-red-400" />
            <NumberCard value={`${highPercent}%`} label="HIGH" color="text-orange-400" />
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* Context */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Background</h2>
            <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
              <p>
                The Model Context Protocol (MCP) has rapidly become the standard for AI agent tool
                integration. In just months, the ecosystem has grown to{' '}
                {eco.entriesCrawled.toLocaleString()}+ entries across npm, GitHub, and community
                registries.
              </p>
              <p>
                AI agents like Claude Code, Cursor, OpenClaw, and Codex use MCP skills with
                <strong className="text-text-primary"> full system access</strong> — they can read
                files, execute commands, access environment variables, and make network requests.
                Unlike mobile apps, there is no review process before a skill runs on your machine.
              </p>
              <p>
                We asked a simple question:{' '}
                <strong className="text-red-400">
                  How many of these skills are actually safe?
                </strong>
              </p>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* Methodology */}
      <SectionWrapper>
        <FadeInUp>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Methodology</h2>
            <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
              <p>
                We crawled {eco.entriesCrawled.toLocaleString()} MCP/AI skill entries from{' '}
                {eco.registrySources} sources (npm registry, GitHub repositories, community
                awesome-lists). Of these, {eco.skillsScanned.toLocaleString()} had parseable
                SKILL.md or README.md files that could be analyzed.
              </p>
              <p>Each skill was scanned using:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong className="text-text-primary">{STATS.atrRules} ATR rules</strong> with{' '}
                  {STATS.atrPatterns}+ detection patterns across 9 threat categories
                </li>
                <li>
                  <strong className="text-text-primary">Secret detection</strong>: AWS keys, GitHub
                  tokens, SSH private keys, API secrets
                </li>
                <li>
                  <strong className="text-text-primary">Permission analysis</strong>: filesystem,
                  network, process execution scope
                </li>
                <li>
                  <strong className="text-text-primary">Manifest validation</strong>: YAML
                  frontmatter completeness and correctness
                </li>
              </ul>
              <p>
                Results were classified as CRITICAL (immediate danger), HIGH (significant risk),
                MEDIUM (potential concern), or CLEAN (no findings).
              </p>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* Results */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Results</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <ResultCard
                value={eco.findingsClean.toLocaleString()}
                label="CLEAN"
                percent={safePercent}
                bg="bg-emerald-400/10"
                border="border-emerald-400/30"
                color="text-emerald-400"
              />
              <ResultCard
                value={eco.findingsCritical.toString()}
                label="CRITICAL"
                percent={critPercent}
                bg="bg-red-400/10"
                border="border-red-400/30"
                color="text-red-400"
              />
              <ResultCard
                value={eco.findingsHigh.toString()}
                label="HIGH"
                percent={highPercent}
                bg="bg-orange-400/10"
                border="border-orange-400/30"
                color="text-orange-400"
              />
              <ResultCard
                value={eco.findingsMedium.toString()}
                label="MEDIUM"
                percent={((eco.findingsMedium / eco.skillsScanned) * 100).toFixed(1)}
                bg="bg-yellow-400/10"
                border="border-yellow-400/30"
                color="text-yellow-400"
              />
            </div>

            <h3 className="text-lg font-bold text-text-primary mb-4">Threat Category Breakdown</h3>
            <div className="space-y-2 mb-6">
              {THREAT_CATEGORIES.map((tc) => (
                <div
                  key={tc.category}
                  className="flex items-center justify-between bg-surface-1 border border-border rounded-lg px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-semibold text-text-primary">{tc.category}</span>
                    <span className="text-xs text-text-muted ml-2">({tc.severity})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-text-primary">{tc.count}</span>
                    <span className="text-xs text-text-muted ml-1">findings</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Prompt injection was the most common threat ({THREAT_CATEGORIES[1].count} instances),
              followed by credential theft ({THREAT_CATEGORIES[0].count} instances). Note: a single
              skill may have findings across multiple categories.
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* Case Studies */}
      <SectionWrapper>
        <FadeInUp>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Case Studies</h2>
            <p className="text-sm text-text-muted mb-8">
              Anonymized examples from real findings. Package names redacted to prevent
              exploitation.
            </p>
          </div>
        </FadeInUp>

        <div className="max-w-3xl mx-auto space-y-6">
          {CASE_STUDIES.map((cs, i) => (
            <FadeInUp key={cs.id} delay={i * 0.05}>
              <div className="bg-surface-1 border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${cs.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`}
                    />
                    <h3 className="text-base font-bold text-text-primary">{cs.title}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                      cs.severity === 'CRITICAL'
                        ? 'text-red-400 bg-red-400/10'
                        : 'text-orange-400 bg-orange-400/10'
                    }`}
                  >
                    {cs.severity}
                  </span>
                </div>

                <p className="text-xs text-panguard-green font-semibold mb-2">{cs.category}</p>

                <p className="text-sm text-text-secondary leading-relaxed mb-3">{cs.description}</p>

                <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-red-400 mb-1">Impact</p>
                  <p className="text-xs text-text-secondary">{cs.impact}</p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  <span className="bg-surface-2 rounded px-2 py-1">Detected by: {cs.atrRule}</span>
                  <span className="bg-surface-2 rounded px-2 py-1">{cs.found}</span>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* What This Means */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-6">What This Means</h2>
            <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
              <p>
                If you&apos;ve installed MCP skills without auditing them, your SSH keys, API
                tokens, and source code may already be compromised. The {eco.findingsCritical}{' '}
                CRITICAL findings we identified are capable of full credential exfiltration and
                agent hijacking.
              </p>
              <p>
                The MCP ecosystem is in its &ldquo;pre-App Store&rdquo; era — anyone can publish a
                skill, and there is no review process. This is exactly where mobile apps were before
                Apple introduced App Review in 2008.
              </p>
              <p className="text-text-primary font-semibold">
                AI agents need a review standard. That standard is ATR (Agent Threat Rules) — the
                first open detection framework purpose-built for AI agent threats.
              </p>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* What You Can Do */}
      <SectionWrapper>
        <FadeInUp>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-6">What You Can Do</h2>
            <div className="space-y-4">
              <ActionStep
                num="1"
                title="Scan your installed skills"
                desc="Paste any GitHub skill URL into our scanner. You'll see the risk score, what it accesses, and whether it's safe to install."
                cta="Try the Scanner"
                ctaHref="/"
              />
              <ActionStep
                num="2"
                title="Install PanGuard Guard"
                desc={`One command gives you 24/7 runtime protection. ${STATS.totalRulesDisplay} ATR detection rules. Auto-blocks threats before damage.`}
                cta="Install Guide"
                ctaHref="/docs/getting-started"
              />
              <ActionStep
                num="3"
                title="Join the collective defense"
                desc="Every scan you run generates threat intelligence that protects the entire community. Your agent becomes a defender."
                cta="Learn about Threat Cloud"
                ctaHref="/threat-cloud"
              />
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* Share CTA */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="max-w-2xl mx-auto text-center">
            <Shield className="w-10 h-10 text-panguard-green mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-3">Help spread the word</h2>
            <p className="text-sm text-text-secondary mb-6">
              Every developer who scans their skills makes the ecosystem safer. Share this report
              with your team.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  'We scanned 1,295 MCP skills. 2% were stealing credentials.\n\nSSH keys, API tokens, prompt injection — all found in real skills from npm.\n\nFull report + free scanner:'
                )}&url=${encodeURIComponent('https://panguard.ai/research/mcp-ecosystem-scan')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-surface-1 border border-border rounded-full px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-brand-sage transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Share on X
              </a>
              <a
                href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-5 py-2.5 text-sm hover:brightness-110 transition-all"
              >
                View ATR on GitHub <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}

/* Helper components */

function NumberCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-3xl sm:text-4xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}

function ResultCard({
  value,
  label,
  percent,
  bg,
  border,
  color,
}: {
  value: string;
  label: string;
  percent: string;
  bg: string;
  border: string;
  color: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className={`text-xs font-bold uppercase tracking-wider ${color} mt-1`}>{label}</p>
      <p className="text-xs text-text-muted mt-1">{percent}%</p>
    </div>
  );
}

function ActionStep({
  num,
  title,
  desc,
  cta,
  ctaHref,
}: {
  num: string;
  title: string;
  desc: string;
  cta: string;
  ctaHref: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 rounded-full bg-brand-sage flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-surface-0">{num}</span>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-text-primary mb-1">{title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-2">{desc}</p>
        <Link
          href={ctaHref}
          className="text-xs font-semibold text-panguard-green hover:text-panguard-green-light transition-colors inline-flex items-center gap-1"
        >
          {cta} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
