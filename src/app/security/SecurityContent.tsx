"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
  ShieldIcon, LockIcon, ScanIcon, NetworkIcon, AnalyticsIcon, CheckIcon,
  DeployIcon, GlobalIcon, AlertIcon, HistoryIcon,
} from "@/components/ui/BrandIcons";

/* ─── Security Practices ─── */
const practices = [
  {
    icon: NetworkIcon,
    title: "Single-Tenant Architecture",
    description:
      "Every customer deployment runs in an isolated environment. There is no shared database, no shared compute, and no shared network segment. A breach in one tenant cannot propagate to another.",
  },
  {
    icon: LockIcon,
    title: "End-to-End Encryption",
    description:
      "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Encryption keys are managed per-tenant with automatic rotation every 90 days. Key material never leaves the hardware security module.",
  },
  {
    icon: ScanIcon,
    title: "Zero Data Retention",
    description:
      "Cloud AI queries are ephemeral. Payloads sent to Claude or GPT are not stored, not used for training, and not logged beyond the request lifecycle. PII is stripped before any data leaves the device.",
  },
  {
    icon: ScanIcon,
    title: "Auditable AI Decisions",
    description:
      "Every automated action taken by Panguard is logged with a full reasoning chain. You can trace exactly why an event was flagged, what confidence score it received, and what response was executed.",
  },
  {
    icon: ShieldIcon,
    title: "Continuous Penetration Testing",
    description:
      "We engage independent third-party security firms to conduct penetration tests on a quarterly basis. Critical findings are remediated within 48 hours. Test results are available to enterprise customers upon request.",
  },
  {
    icon: HistoryIcon,
    title: "Secure Development Lifecycle",
    description:
      "Every code change goes through automated SAST/DAST scanning, dependency auditing, and peer review. We follow OWASP best practices and maintain a bug bounty program for external researchers.",
  },
];

/* ─── Compliance Frameworks ─── */
const compliance = [
  {
    badge: "SOC 2 Type II",
    status: "In Progress",
    statusColor: "text-[#f59e0b]",
    description:
      "We are actively pursuing SOC 2 Type II certification covering Security, Availability, and Confidentiality trust service criteria. Our audit is conducted by a Big Four firm. Expected completion: Q3 2026.",
  },
  {
    badge: "ISO 27001",
    status: "Planned",
    statusColor: "text-[#60a5fa]",
    description:
      "ISO 27001 certification is on our roadmap for 2026. Our information security management system (ISMS) is being built to ISO 27001 standards from day one, making certification a formalization rather than a transformation.",
  },
  {
    badge: "GDPR",
    status: "Compliant",
    statusColor: "text-[#22c55e]",
    description:
      "Panguard is designed for GDPR compliance by default. Data minimization, purpose limitation, and the right to erasure are built into the architecture. We offer Data Processing Agreements (DPA) to all customers.",
  },
  {
    badge: "Taiwan Cybersecurity Management Act",
    status: "Compliant",
    statusColor: "text-[#22c55e]",
    description:
      "For customers operating under Taiwan's Cybersecurity Management Act, Panguard's reporting and audit capabilities are designed to meet regulatory requirements for critical infrastructure providers.",
  },
];

/* ─── Data Handling ─── */
const dataFlow = [
  {
    icon: NetworkIcon,
    zone: "On-Device (Local)",
    color: "border-[#22c55e]",
    items: [
      "Raw system logs and telemetry",
      "Context Memory baseline database",
      "Sigma/YARA rule engine and results",
      "Local LLM inference (Ollama)",
      "Incident response playbook execution",
      "Full event history and forensic logs",
    ],
  },
  {
    icon: GlobalIcon,
    zone: "Cloud (Ephemeral)",
    color: "border-[#f59e0b]",
    items: [
      "Anonymized event payloads (PII stripped)",
      "Cloud AI inference requests (not stored)",
      "Collective threat intelligence contributions (hashed IOCs only)",
      "Software update checks and rule feed syncs",
    ],
  },
  {
    icon: ShieldIcon,
    zone: "Never Transmitted",
    color: "border-[#ef4444]",
    items: [
      "IP addresses or hostnames",
      "User credentials or tokens",
      "File contents or source code",
      "Database contents or query logs",
      "Personal or business data",
    ],
  },
];

/* ─── Trust Center Downloads ─── */
const downloads = [
  { label: "SOC 2 Type II Report", status: "Coming Q3 2026", icon: AnalyticsIcon },
  { label: "Penetration Test Summary", status: "Available on request", icon: ShieldIcon },
  { label: "Data Processing Agreement (DPA)", status: "Available", icon: AnalyticsIcon },
  { label: "Security Whitepaper", status: "Available", icon: AnalyticsIcon },
  { label: "Architecture Overview", status: "Available", icon: NetworkIcon },
  { label: "Incident Response Plan", status: "Available on request", icon: AlertIcon },
];

export default function SecurityContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[50vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-6">
              Security & Trust
            </p>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl">
              We&apos;re a security company.
              <br className="hidden sm:block" />
              <span className="text-brand-sage">Our own security</span> is
              non-negotiable.
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mt-6 leading-relaxed">
              You trust us to protect your infrastructure. That means we hold
              ourselves to a higher standard than we hold anyone else. Here is
              exactly how we do it.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── Security Practices ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Practices"
          title="How we secure ourselves."
          subtitle="These are not aspirational goals. They are current, enforced practices that apply to every line of code, every deployment, and every employee."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {practices.map((p, i) => (
            <FadeInUp key={p.title} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full">
                <p.icon className="w-5 h-5 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary mb-2">
                  {p.title}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {p.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Compliance ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Compliance"
          title="Frameworks we follow."
          subtitle="Compliance is not a checkbox exercise. It is the minimum bar. We build to the spirit of these frameworks, not just their letter."
        />
        <div className="max-w-3xl mx-auto mt-14 space-y-4">
          {compliance.map((c, i) => (
            <FadeInUp key={c.badge} delay={i * 0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-text-primary">
                    {c.badge}
                  </span>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider ${c.statusColor}`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {c.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Data Handling ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Data Handling"
          title="What stays local. What goes to the cloud."
          subtitle="Transparency about data flows is fundamental. Here is a complete breakdown of where your data lives and what -- if anything -- leaves the device."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {dataFlow.map((zone, i) => (
            <FadeInUp key={zone.zone} delay={i * 0.1}>
              <div
                className={`bg-surface-1 rounded-xl border-l-4 ${zone.color} border border-border p-6 h-full`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <zone.icon className="w-5 h-5 text-brand-sage" />
                  <p className="text-sm font-bold text-text-primary">
                    {zone.zone}
                  </p>
                </div>
                <ul className="space-y-2">
                  {zone.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed"
                    >
                      <CheckIcon className="w-3 h-3 text-text-muted mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Anonymization note */}
        <FadeInUp delay={0.3}>
          <div className="mt-8 bg-surface-1 rounded-xl border border-border p-6 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <LockIcon className="w-5 h-5 text-brand-sage shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-text-primary mb-1">
                  Anonymization Pipeline
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Before any event data is sent to cloud AI or the collective
                  intelligence network, it passes through a multi-stage
                  anonymization pipeline. IP addresses are hashed, hostnames are
                  replaced with generic identifiers, file paths are normalized,
                  and user data is removed entirely. The pipeline is
                  deterministic, so the same threat pattern always produces the
                  same anonymized signature -- enabling correlation without
                  exposing identity.
                </p>
              </div>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ── Responsible Disclosure ── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <CheckIcon className="w-8 h-8 text-brand-sage mx-auto mb-4" />
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Responsible Disclosure
            </h2>
            <p className="text-text-secondary mt-4 leading-relaxed max-w-xl mx-auto">
              Found a vulnerability in Panguard? We appreciate security
              researchers who help us keep our users safe. Please report any
              security issues through our responsible disclosure program. We
              commit to acknowledging reports within 24 hours and providing an
              initial assessment within 72 hours.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/legal/responsible-disclosure"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Disclosure Policy <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href="mailto:security@panguard.ai"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                security@panguard.ai
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Trust Center ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Trust Center"
          title="Documentation you can verify."
          subtitle="Download our security documentation, request audit reports, or review our compliance artifacts."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {downloads.map((doc, i) => (
            <FadeInUp key={doc.label} delay={i * 0.08}>
              <div className="card-glow bg-surface-1 rounded-xl border border-border p-5 flex items-start gap-4 hover:border-border-hover transition-colors group">
                <doc.icon className="w-5 h-5 text-brand-sage shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-sage transition-colors">
                    {doc.label}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {doc.status}
                  </p>
                </div>
                <DeployIcon className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors shrink-0 mt-0.5" />
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper dark>
        <div className="text-center">
          <FadeInUp>
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Questions about our security?
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Our security team is happy to discuss our practices, provide
              documentation, or schedule a deep-dive call with your CISO.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Contact Security Team <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
