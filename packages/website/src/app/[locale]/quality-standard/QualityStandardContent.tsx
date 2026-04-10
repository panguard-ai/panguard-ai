'use client';

import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import {
  Shield,
  CheckCircle2,
  FileCode2,
  ExternalLink,
  GitBranch,
  TrendingUp,
  Scale,
  Eye,
  Layers,
  Gauge,
  Filter,
  Microscope,
  UserCheck,
  Rocket,
  XCircle,
  Lock,
} from 'lucide-react';

/* ================================================================
   DATA: pulled from RFC-001 and live metrics
   ================================================================ */

const MATURITY_LEVELS = [
  {
    level: 'draft',
    label: 'Draft',
    gate: 'Valid schema + 1 TP + 1 TN + no ReDoS',
    deploy: 'Not deployed',
    badge: 'bg-surface-2 text-text-secondary border-border',
  },
  {
    level: 'experimental',
    label: 'Experimental',
    gate: '3+ conditions, 3 TP + 3 TN, OWASP + MITRE, false positives documented',
    deploy: 'Alert-only',
    badge: 'bg-brand-sage/10 text-brand-sage border-brand-sage/30',
  },
  {
    level: 'stable',
    label: 'Stable',
    gate: 'Wild-validated (1,000+ samples), FP rate ≤0.5%, human-verified provenance, 3+ evasion tests',
    deploy: 'Block in production',
    badge: 'bg-brand-orange/10 text-brand-orange border-brand-orange/30',
  },
];

const FORMULA_COMPONENTS = [
  {
    name: 'Precision',
    weight: '40%',
    formula: '(1 − wild_fp_rate) × 100',
    meaning: 'Measured false positive rate on real-world skill corpora',
  },
  {
    name: 'Wild validation',
    weight: '30%',
    formula: 'min(wild_samples / 10,000, 1) × 100',
    meaning: 'How much real-world data the rule has been tested against',
  },
  {
    name: 'Coverage',
    weight: '20%',
    formula: 'min(conditions / 5, 1) × 100',
    meaning: 'Detection depth — number of distinct attack patterns covered',
  },
  {
    name: 'Evasion docs',
    weight: '10%',
    formula: 'min(documented_evasions / 5, 1) × 100',
    meaning: 'Transparent acknowledgment of known bypass techniques',
  },
];

const EVIDENCE_ITEMS = [
  {
    icon: GitBranch,
    stat: '34',
    label: 'ATR rules merged into Cisco AI Defense',
    proof: 'github.com/cisco-ai-defense/...',
  },
  {
    icon: Gauge,
    stat: '53,577',
    label: 'Real MCP skills scanned for wild validation',
    proof: 'data/mega-scan-report.json',
  },
  {
    icon: TrendingUp,
    stat: '99.6%',
    label: 'Precision on PINT adversarial benchmark (850 samples)',
    proof: 'data/pint-benchmark/',
  },
  {
    icon: CheckCircle2,
    stat: '96.9%',
    label: 'Recall on SKILL.md corpus (498 samples, 0% FP)',
    proof: 'data/skill-benchmark/',
  },
];

type ComparisonRow = {
  feature: string;
  atr: 'yes' | 'no' | 'partial';
  sigma: 'yes' | 'no' | 'partial';
  yara: 'yes' | 'no' | 'partial';
  owaspCrs: 'yes' | 'no' | 'partial';
  suricata: 'yes' | 'no' | 'partial';
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Maturity ladder with explicit gates',
    atr: 'yes',
    sigma: 'yes',
    yara: 'no',
    owaspCrs: 'yes',
    suricata: 'yes',
  },
  {
    feature: 'Formula-based confidence score (0-100)',
    atr: 'yes',
    sigma: 'no',
    yara: 'no',
    owaspCrs: 'no',
    suricata: 'partial',
  },
  {
    feature: 'Wild validation required for production',
    atr: 'yes',
    sigma: 'no',
    yara: 'no',
    owaspCrs: 'no',
    suricata: 'no',
  },
  {
    feature: 'Per-field provenance tracking',
    atr: 'yes',
    sigma: 'no',
    yara: 'no',
    owaspCrs: 'no',
    suricata: 'no',
  },
  {
    feature: 'Automatic demotion on quality regression',
    atr: 'yes',
    sigma: 'no',
    yara: 'no',
    owaspCrs: 'no',
    suricata: 'no',
  },
  {
    feature: 'Open-source reference implementation',
    atr: 'yes',
    sigma: 'yes',
    yara: 'yes',
    owaspCrs: 'yes',
    suricata: 'yes',
  },
];

function ComparisonCell({ v }: { v: 'yes' | 'no' | 'partial' }) {
  if (v === 'yes') return <span className="text-brand-sage font-semibold">✓</span>;
  if (v === 'partial') return <span className="text-brand-orange">~</span>;
  return <span className="text-text-muted">—</span>;
}

/* ================================================================
   DATA: Crystallization gauntlet stages (what a rule goes through)
   ================================================================ */

const GAUNTLET_STAGES = [
  {
    icon: FileCode2,
    stage: '1',
    title: 'LLM Drafter',
    detail:
      'Claude Sonnet 4 generates a YAML rule against a strict prompt requiring 3+ conditions, 5+ TP/TN, 3+ evasion tests, and OWASP + MITRE mapping.',
  },
  {
    icon: Filter,
    stage: '2',
    title: 'Syntax Gate',
    detail:
      'Regex extraction, invalid pattern rejection, PCRE-to-JS normalization. Broken rules are dropped with logged reasons.',
  },
  {
    icon: Scale,
    stage: '3',
    title: 'Quality Gate',
    detail:
      'The RFC-001 formula runs: detection depth, test coverage, reference mapping, documentation completeness. Below the bar, the rule is rejected.',
  },
  {
    icon: Microscope,
    stage: '4',
    title: 'Canary Observation',
    detail:
      'Accepted rules enter a 14-day canary window. Independent confirmations from other clients and wild FP measurements gate further promotion.',
  },
  {
    icon: UserCheck,
    stage: '5',
    title: 'Human Review',
    detail:
      'Provenance starts as llm-generated. Human review upgrades to human-reviewed before the rule can reach stable.',
  },
  {
    icon: Rocket,
    stage: '6',
    title: 'PR-back to ATR',
    detail:
      'Promoted rules are automatically opened as pull requests against the open-source ATR repository for public review and merge.',
  },
];

const EXAMPLE_RULE = {
  title: 'Hidden Credential Exfiltration with Silent Execution Override',
  id: 'ATR-2026-DRAFT-8f3c9a72',
  severity: 'critical',
  conditions: 5,
  truePositives: 5,
  trueNegatives: 5,
  evasionTests: 3,
  owasp: ['LLM01:2025 - Prompt Injection', 'ASI01:2026 - Agent Behaviour Hijack'],
  mitre: ['AML.T0051 - LLM Prompt Injection'],
  gateStatus: 'passed',
  provenance: 'llm-generated',
};

const TC_GUARANTEES = [
  {
    icon: Lock,
    title: 'Rejection logs are public',
    detail:
      'Every rule that fails the gate is logged with its exact failure reason. You can audit what was rejected and why, not just what was accepted.',
  },
  {
    icon: Gauge,
    title: 'Wild FP rate is measured, not estimated',
    detail:
      'Rules are scored against 53,577 real skills from ClawHub, OpenClaw, and Skills.sh — not synthetic benchmarks. Every confidence score reflects production reality.',
  },
  {
    icon: XCircle,
    title: 'Automatic quality regression handling',
    detail:
      'If a stable rule hits a 2% FP rate or accumulates 3 unresolved reports in 30 days, it is automatically demoted to experimental. No humans required, no delays.',
  },
  {
    icon: GitBranch,
    title: 'Every decision is in git',
    detail:
      'Rule additions, promotions, demotions, and provenance changes flow through ATR pull requests. The full history is public, signed, and permanent.',
  },
];

/* ================================================================
   COMPONENT
   ================================================================ */

export default function QualityStandardContent() {
  const formulaDisplay =
    'confidence = 0.4 × precision + 0.3 × wild + 0.2 × coverage + 0.1 × evasion';

  return (
    <>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <SectionWrapper className="pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="max-w-5xl mx-auto text-center">
          <FadeInUp>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold bg-brand-sage/10 border border-brand-sage/30 rounded-full px-4 py-1.5 mb-6">
              <Scale size={14} />
              RFC-001 · ATR Quality Standard v1.0
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(36px,6vw,64px)] font-bold text-text-primary leading-[1.05] mb-6">
              The first AI agent rule standard
              <br />
              <span className="text-brand-sage">with provenance tracking</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-3xl mx-auto mb-10">
              Every rule has a confidence score you can compute yourself. Every mapping has a
              provenance you can audit. No black boxes, no vendor lock-in — just a public formula,
              open-source code, and wild-validated data.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/proposals/001-atr-quality-standard-rfc.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                <FileCode2 size={16} />
                Read RFC-001
                <ExternalLink size={14} />
              </a>
              <a
                href="https://www.npmjs.com/package/agent-threat-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border text-text-secondary font-semibold text-sm rounded-full px-6 py-3 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
              >
                npm install agent-threat-rules
              </a>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-12 text-xs text-text-muted">
              Reference implementation · MIT licensed · 67 unit tests · used in production
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── EVIDENCE STRIP ──────────────────────────────────────── */}
      <SectionWrapper className="py-12 bg-surface-1 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold text-center mb-8">
              Built on verifiable data, not claims
            </p>
          </FadeInUp>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {EVIDENCE_ITEMS.map((item, i) => (
              <FadeInUp key={item.label} delay={0.05 * i}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-sage/10 border border-brand-sage/20 mb-4">
                    <item.icon size={22} className="text-brand-sage" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
                    {item.stat}
                  </div>
                  <div className="text-sm text-text-secondary leading-snug mb-2">{item.label}</div>
                  <div className="text-[11px] text-text-muted font-mono">{item.proof}</div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── THE FORMULA ─────────────────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="The Formula"
              title="Confidence is a number, not an opinion"
              subtitle="Every component is computed from measurable facts. Run it yourself — the formula is public."
            />
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <div className="mt-12 bg-surface-1 border border-border rounded-2xl p-6 md:p-10">
              <div className="font-mono text-sm md:text-base text-text-primary bg-surface-0 border border-border rounded-xl p-5 md:p-6 overflow-x-auto">
                {formulaDisplay}
              </div>
              <div className="mt-8 grid md:grid-cols-2 gap-5">
                {FORMULA_COMPONENTS.map((c) => (
                  <div key={c.name} className="border border-border rounded-xl p-5 bg-surface-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text-primary font-semibold">{c.name}</span>
                      <span className="text-xs font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
                        {c.weight}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-text-muted mb-2">{c.formula}</div>
                    <p className="text-sm text-text-secondary leading-relaxed">{c.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="border border-brand-sage/30 bg-brand-sage/5 rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-2">
                  90–100 · Very High
                </div>
                <div className="text-text-primary font-semibold text-sm">
                  Safe to block in production
                </div>
              </div>
              <div className="border border-brand-orange/30 bg-brand-orange/5 rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-brand-orange font-semibold mb-2">
                  60–79 · Medium
                </div>
                <div className="text-text-primary font-semibold text-sm">
                  Alert-only with monitoring
                </div>
              </div>
              <div className="border border-border bg-surface-1 rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                  &lt;40 · Draft
                </div>
                <div className="text-text-secondary font-semibold text-sm">
                  Do not deploy to production
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── TWO-DIMENSIONAL COMPLIANCE ──────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24 bg-surface-1 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="The Differentiator"
              title="Two-dimensional compliance model"
              subtitle="The industry first: separating 'does the rule have the metadata' from 'who verified it'."
            />
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <div className="mt-12 grid md:grid-cols-2 gap-6">
              <div className="border border-border rounded-2xl p-7 bg-surface-0">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-sage/10 border border-brand-sage/30 mb-5">
                  <Layers size={20} className="text-brand-sage" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Dimension 1 · Technical compliance
                </h3>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Does the rule have the required metadata? Detection conditions, test cases, OWASP
                  and MITRE references, false positive documentation. Machine-verifiable in under a
                  millisecond.
                </p>
                <div className="text-xs font-mono text-text-muted">
                  validateRuleMeetsStandard(rule)
                </div>
              </div>

              <div className="border border-brand-orange/30 rounded-2xl p-7 bg-brand-orange/5">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-orange/10 border border-brand-orange/30 mb-5">
                  <Eye size={20} className="text-brand-orange" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Dimension 2 · Trust compliance
                </h3>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Who verified the metadata?{' '}
                  <code className="text-brand-orange">human-reviewed</code>,{' '}
                  <code className="text-brand-orange">community-contributed</code>,{' '}
                  <code className="text-brand-orange">auto-generated</code>, or{' '}
                  <code className="text-brand-orange">llm-generated</code>. Stable promotion
                  requires verified provenance — not just presence.
                </p>
                <div className="text-xs font-mono text-text-muted">
                  metadata_provenance: {'{ mitre_atlas: human-reviewed }'}
                </div>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-10 border border-border rounded-2xl p-7 bg-surface-0">
              <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-4">
                Why this matters
              </div>
              <p className="text-text-primary leading-relaxed mb-4">
                Traditional rule standards (Sigma, YARA, OWASP CRS) treat compliance as binary —
                either the metadata is there or it is not. This creates a perverse incentive:
                vendors pad metadata to pass the check without doing the underlying review work.
              </p>
              <p className="text-text-secondary leading-relaxed">
                ATR separates the two dimensions. Auto-generated mappings can pass the experimental
                gate for fast iteration. Stable promotion — the level that enterprises block in
                production — requires human review. Fast iteration and honest trust, at the same
                time.
              </p>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── MATURITY LADDER ─────────────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="The Ladder"
              title="Every rule has an explicit gate to climb"
              subtitle="Promotion requires passing specific, mechanical criteria. Demotion is automatic on quality regression."
            />
          </FadeInUp>

          <div className="mt-12 space-y-4">
            {MATURITY_LEVELS.map((level, i) => (
              <FadeInUp key={level.level} delay={0.1 * i}>
                <div className="border border-border rounded-2xl p-6 md:p-7 bg-surface-1 hover:border-brand-sage/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start md:gap-8">
                    <div className="mb-4 md:mb-0 md:w-44 flex-shrink-0">
                      <div
                        className={`inline-block text-[11px] uppercase tracking-[0.12em] font-semibold border rounded-full px-3 py-1 ${level.badge}`}
                      >
                        {level.label}
                      </div>
                    </div>
                    <div className="flex-1 grid md:grid-cols-2 gap-5">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                          Promotion gate
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">{level.gate}</p>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                          Deployment guidance
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">{level.deploy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.3}>
            <div className="mt-8 border border-border rounded-2xl p-6 bg-surface-0">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center">
                  <Shield size={18} className="text-brand-orange" />
                </div>
                <div>
                  <div className="text-text-primary font-semibold mb-1">Automatic demotion</div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Stable rules with wild false positive rate above 2%, or three unresolved false
                    positive reports within 30 days, are automatically demoted to experimental. No
                    human decision required. The system self-corrects.
                  </p>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── CRYSTALLIZATION GAUNTLET ────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24 bg-surface-1 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="The Gauntlet"
              title="Six stages before a rule reaches production"
              subtitle="An LLM-drafted rule passes through six independent verification stages before it ever protects a user. Each stage has mechanical, public criteria."
            />
          </FadeInUp>

          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GAUNTLET_STAGES.map((s, i) => (
              <FadeInUp key={s.stage} delay={0.05 * i}>
                <div className="border border-border rounded-2xl p-6 bg-surface-1 h-full hover:border-brand-sage/30 transition-colors">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-sage/10 border border-brand-sage/30 flex items-center justify-center">
                      <s.icon size={20} className="text-brand-sage" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold">
                        Stage {s.stage}
                      </div>
                      <h3 className="text-text-primary font-bold text-lg leading-tight mt-0.5">
                        {s.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{s.detail}</p>
                </div>
              </FadeInUp>
            ))}
          </div>

          {/* Real example card */}
          <FadeInUp delay={0.3}>
            <div className="mt-14 border border-brand-sage/30 rounded-2xl overflow-hidden bg-surface-0">
              <div className="bg-brand-sage/5 border-b border-brand-sage/20 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-brand-sage" />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-sage">
                    Live Crystallization Output · Gate Passed
                  </span>
                </div>
                <code className="text-[11px] text-text-muted font-mono">{EXAMPLE_RULE.id}</code>
              </div>
              <div className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-2">
                  {EXAMPLE_RULE.title}
                </h3>
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-brand-orange bg-brand-orange/10 border border-brand-orange/30 rounded-full px-3 py-1 mb-6">
                  Severity · {EXAMPLE_RULE.severity}
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="border border-border rounded-xl p-4 bg-surface-1">
                    <div className="text-2xl font-bold text-brand-sage mb-1">
                      {EXAMPLE_RULE.conditions}
                    </div>
                    <div className="text-xs text-text-secondary">Detection layers</div>
                  </div>
                  <div className="border border-border rounded-xl p-4 bg-surface-1">
                    <div className="text-2xl font-bold text-brand-sage mb-1">
                      {EXAMPLE_RULE.truePositives}+{EXAMPLE_RULE.trueNegatives}
                    </div>
                    <div className="text-xs text-text-secondary">TP + TN test cases</div>
                  </div>
                  <div className="border border-border rounded-xl p-4 bg-surface-1">
                    <div className="text-2xl font-bold text-brand-sage mb-1">
                      {EXAMPLE_RULE.evasionTests}
                    </div>
                    <div className="text-xs text-text-secondary">Evasion tests</div>
                  </div>
                  <div className="border border-border rounded-xl p-4 bg-surface-1">
                    <div className="text-2xl font-bold text-brand-sage mb-1">100%</div>
                    <div className="text-xs text-text-secondary">Required fields present</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5 mb-6">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                      OWASP mapping
                    </div>
                    <ul className="space-y-1.5">
                      {EXAMPLE_RULE.owasp.map((o) => (
                        <li
                          key={o}
                          className="text-xs font-mono text-text-secondary flex items-center gap-2"
                        >
                          <CheckCircle2 size={12} className="text-brand-sage flex-shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                      MITRE ATLAS mapping
                    </div>
                    <ul className="space-y-1.5">
                      {EXAMPLE_RULE.mitre.map((m) => (
                        <li
                          key={m}
                          className="text-xs font-mono text-text-secondary flex items-center gap-2"
                        >
                          <CheckCircle2 size={12} className="text-brand-sage flex-shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-border pt-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-1">
                      Provenance
                    </div>
                    <code className="text-xs text-brand-orange font-mono">
                      {EXAMPLE_RULE.provenance}
                    </code>
                  </div>
                  <p className="text-xs text-text-muted italic max-w-md text-right">
                    Tagged honestly as LLM-generated. Confidence capped at 70 until human review
                    upgrades provenance to human-reviewed.
                  </p>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── TC RUNTIME GUARANTEES ───────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="Threat Cloud Protection"
              title="The flywheel is running in production"
              subtitle="Not a proposal. Not a research paper. Live infrastructure, measurable outputs, git-tracked history."
            />
          </FadeInUp>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {TC_GUARANTEES.map((g, i) => (
              <FadeInUp key={g.title} delay={0.05 * i}>
                <div className="border border-border rounded-2xl p-6 bg-surface-0 h-full">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-sage/10 border border-brand-sage/30 flex items-center justify-center">
                      <g.icon size={20} className="text-brand-sage" />
                    </div>
                    <div>
                      <h3 className="text-text-primary font-bold text-base mb-2">{g.title}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{g.detail}</p>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.3}>
            <div className="mt-12 border border-border rounded-2xl p-6 md:p-8 bg-surface-0">
              <div className="grid md:grid-cols-4 gap-6 md:gap-4">
                <div className="text-center md:text-left">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                    Live TC endpoint
                  </div>
                  <code className="text-sm text-text-primary font-mono break-all">
                    tc.panguard.ai
                  </code>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                    Rules in production
                  </div>
                  <div className="text-2xl font-bold text-text-primary">109</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                    Guard clients polling
                  </div>
                  <div className="text-2xl font-bold text-text-primary">every 5 min</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">
                    PR-back cadence
                  </div>
                  <div className="text-2xl font-bold text-text-primary">every 6 h</div>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── COMPARISON ──────────────────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24 bg-surface-1 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="The Landscape"
              title="How ATR compares to existing rule standards"
              subtitle="Sigma, YARA, OWASP CRS, and Suricata solved this for malware, SIEM, WAF, and IDS. Nobody had solved it for AI agents — until now."
            />
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <div className="mt-12 overflow-x-auto">
              <table className="w-full border border-border rounded-2xl overflow-hidden bg-surface-0">
                <thead>
                  <tr className="border-b border-border bg-surface-1">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider py-4 px-5">
                      Feature
                    </th>
                    <th className="text-center text-xs font-semibold text-brand-sage uppercase tracking-wider py-4 px-4">
                      ATR
                    </th>
                    <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider py-4 px-4">
                      Sigma
                    </th>
                    <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider py-4 px-4">
                      YARA
                    </th>
                    <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider py-4 px-4">
                      OWASP CRS
                    </th>
                    <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider py-4 px-4">
                      Suricata
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i < COMPARISON_ROWS.length - 1 ? 'border-b border-border' : ''}
                    >
                      <td className="py-4 px-5 text-sm text-text-primary">{row.feature}</td>
                      <td className="py-4 px-4 text-center text-lg">
                        <ComparisonCell v={row.atr} />
                      </td>
                      <td className="py-4 px-4 text-center text-lg">
                        <ComparisonCell v={row.sigma} />
                      </td>
                      <td className="py-4 px-4 text-center text-lg">
                        <ComparisonCell v={row.yara} />
                      </td>
                      <td className="py-4 px-4 text-center text-lg">
                        <ComparisonCell v={row.owaspCrs} />
                      </td>
                      <td className="py-4 px-4 text-center text-lg">
                        <ComparisonCell v={row.suricata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <p className="mt-6 text-sm text-text-muted text-center italic">
              ATR is the only standard that requires wild-scan validation with measured FP rates and
              automatic demotion on quality regression.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── VERIFY IT YOURSELF ──────────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <FadeInUp>
            <SectionTitle
              overline="Verify It Yourself"
              title="Don't trust us — run the validator"
              subtitle="Every function is pure, open source, and documented. Score your own rules — or ours — in under a minute."
            />
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <div className="mt-12 bg-surface-1 border border-border rounded-2xl p-6 md:p-8">
              <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-3">
                Install
              </div>
              <div className="font-mono text-sm text-text-primary bg-surface-0 border border-border rounded-xl p-4 mb-8 overflow-x-auto">
                npm install agent-threat-rules
              </div>

              <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold mb-3">
                Score any rule
              </div>
              <pre className="font-mono text-xs md:text-sm text-text-primary bg-surface-0 border border-border rounded-xl p-5 overflow-x-auto leading-relaxed">
                {`import {
  parseATRRule,
  computeConfidence,
  validateRuleMeetsStandard,
} from 'agent-threat-rules/quality';

const rule = parseATRRule(yamlContent);
const score = computeConfidence(rule);
const gate = validateRuleMeetsStandard(rule, 'stable');

console.log('Confidence:', score.total);   // 0-100
console.log('Passes stable:', gate.passed);
console.log('Issues:', gate.issues);`}
              </pre>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="border border-border rounded-xl p-5 bg-surface-0">
                <div className="text-text-primary font-semibold text-sm mb-2">Pure functions</div>
                <p className="text-xs text-text-muted leading-relaxed">
                  No I/O. No network calls. No hidden state. Deterministic output — same input, same
                  score, every time.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5 bg-surface-0">
                <div className="text-text-primary font-semibold text-sm mb-2">
                  Works with any rule format
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Bring your own adapter. ATR ships a YAML parser; Sigma, YARA, or custom formats
                  plug in through a simple interface.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5 bg-surface-0">
                <div className="text-text-primary font-semibold text-sm mb-2">
                  67 unit tests, 100% branch coverage
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Every weight, every threshold, every edge case. Audit the tests before you audit
                  the formula.
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── CTA / FOOTER ────────────────────────────────────────── */}
      <SectionWrapper className="py-20 md:py-24 bg-surface-1 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(28px,4vw,42px)] font-bold text-text-primary leading-tight mb-5">
              Measurable. Auditable. Open.
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed mb-10">
              The ATR Quality Standard is live, in production, and ready to adopt. Any scanner —
              ATR, Cisco, Snyk, Microsoft AGT, or yours — can score rules on the same axes with the
              same library.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/proposals/001-atr-quality-standard-rfc.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Read the RFC
                <ExternalLink size={14} />
              </a>
              <Link
                href="/atr"
                className="inline-flex items-center gap-2 border border-border text-text-secondary font-semibold text-sm rounded-full px-6 py-3 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
              >
                See ATR in action
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
