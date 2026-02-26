"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ComplianceIcon,
  LockIcon,
  ShieldIcon,
  GlobalIcon,
  NetworkIcon,
  ScanIcon,
  CheckIcon,
  AlertIcon,
  MonitorIcon,
  HistoryIcon,
} from "@/components/ui/BrandIcons";

/* ─── Types ─── */
type StatusVariant = "active" | "in-progress" | "planned";

interface ComplianceCard {
  name: string;
  status: string;
  variant: StatusVariant;
  description: string;
}

interface SecurityLayer {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: string[];
}

interface DataPractice {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

interface Subprocessor {
  name: string;
  purpose: string;
  location: string;
}

/* ─── Status Badge Styles ─── */
const statusStyles: Record<StatusVariant, string> = {
  active: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  "in-progress": "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  planned: "bg-text-muted/10 text-text-muted border-border",
};

/* ─── Compliance Status Data ─── */
const complianceCards: readonly ComplianceCard[] = [
  {
    name: "SOC 2 Type II",
    status: "In Progress",
    variant: "in-progress",
    description:
      "Expected Q3 2026. 87% of controls automated. Audit conducted by a Big Four firm covering Security, Availability, and Confidentiality trust service criteria.",
  },
  {
    name: "ISO 27001",
    status: "Planned",
    variant: "planned",
    description:
      "Planned for Q4 2026. Risk assessment framework in place. ISMS built to ISO 27001 standards from day one, making certification a formalization.",
  },
  {
    name: "GDPR Compliant",
    status: "Active",
    variant: "active",
    description:
      "Full GDPR compliance with automated data subject request handling. Data Processing Agreements available for all customers. Privacy by design across the platform.",
  },
  {
    name: "HIPAA Ready",
    status: "In Progress",
    variant: "in-progress",
    description:
      "BAA available for healthcare customers. Encryption controls implemented. Access audit logging and automatic session management enforced.",
  },
];

/* ─── Security Architecture Layers ─── */
const securityLayers: readonly SecurityLayer[] = [
  {
    title: "Data Layer",
    icon: LockIcon,
    items: [
      "AES-256 encryption at rest",
      "TLS 1.3 for all data in transit",
      "Per-tenant key management",
      "Automatic key rotation (90 days)",
      "Hardware security module backed",
    ],
  },
  {
    title: "Application Layer",
    icon: ShieldIcon,
    items: [
      "Multi-factor authentication",
      "Role-based access control (RBAC)",
      "API key scoping and rate limiting",
      "Input validation and sanitization",
      "Session management and auto-expiry",
    ],
  },
  {
    title: "Infrastructure Layer",
    icon: NetworkIcon,
    items: [
      "Single-tenant isolation",
      "24/7 infrastructure monitoring",
      "DDoS protection at edge",
      "Immutable deployment pipeline",
      "Automated vulnerability scanning",
    ],
  },
];

/* ─── Data Handling Practices ─── */
const dataPractices: readonly DataPractice[] = [
  {
    icon: LockIcon,
    title: "Data Encryption",
    description: "AES-256 at rest, TLS 1.3 in transit. Per-tenant encryption keys with automatic rotation.",
  },
  {
    icon: GlobalIcon,
    title: "Data Residency",
    description: "Customer data stored in customer-selected region. No cross-region replication without consent.",
  },
  {
    icon: HistoryIcon,
    title: "Data Retention",
    description: "Configurable retention policies per data type. Automatic purging with cryptographic verification.",
  },
  {
    icon: ShieldIcon,
    title: "Access Controls",
    description: "Role-based access with principle of least privilege. All access changes require approval workflow.",
  },
  {
    icon: ScanIcon,
    title: "Audit Logging",
    description: "Immutable audit trail for all administrative actions. Logs retained for a minimum of 12 months.",
  },
  {
    icon: AlertIcon,
    title: "Incident Response",
    description: "24-hour breach notification SLA. Documented IR plan tested quarterly with tabletop exercises.",
  },
];

/* ─── Subprocessors ─── */
const subprocessors: readonly Subprocessor[] = [
  { name: "AWS", purpose: "Infrastructure", location: "US / EU" },
  { name: "Anthropic", purpose: "AI Processing", location: "US" },
  { name: "Cloudflare", purpose: "CDN & DDoS Protection", location: "Global" },
  { name: "Stripe", purpose: "Payment Processing", location: "US" },
  { name: "SendGrid", purpose: "Transactional Email", location: "US" },
];

/* ═══════════════════════════════════════════════════════════════════
   Trust Center Content
   ═══════════════════════════════════════════════════════════════════ */
export default function TrustContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[50vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-6">
              Trust Center
            </p>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl">
              Security You Can{" "}
              <span className="text-brand-sage">Verify</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mt-6 leading-relaxed">
              Transparency is the foundation of trust. Review our compliance
              status, security architecture, data handling practices, and
              subprocessor relationships -- all in one place.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── Compliance Status Cards ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Compliance Status"
          title="Certifications and frameworks."
          subtitle="Real-time visibility into our compliance posture. We publish status honestly -- including what is in progress, not just what is complete."
        />
        <div className="grid sm:grid-cols-2 gap-4 mt-14">
          {complianceCards.map((card, i) => (
            <FadeInUp key={card.name} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full">
                <div className="flex items-start gap-4">
                  <ComplianceIcon className="w-5 h-5 text-brand-sage shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-text-primary">
                        {card.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusStyles[card.variant]}`}
                      >
                        {card.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Security Architecture ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Security Architecture"
          title="Defense in depth."
          subtitle="Our security model is layered. A failure at any single layer does not compromise the system. Each layer operates independently with its own controls."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {securityLayers.map((layer, i) => (
            <FadeInUp key={layer.title} delay={i * 0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6 h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-brand-sage/10 flex items-center justify-center">
                    <layer.icon className="w-5 h-5 text-brand-sage" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {layer.title}
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {layer.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed"
                    >
                      <CheckIcon className="w-3 h-3 text-brand-sage mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Data Handling Practices ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Data Handling"
          title="How we treat your data."
          subtitle="Every data handling practice is documented, enforced through policy, and verified through automated controls."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {dataPractices.map((practice, i) => (
            <FadeInUp key={practice.title} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full">
                <practice.icon className="w-5 h-5 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary mb-2">
                  {practice.title}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {practice.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Subprocessors ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Subprocessors"
          title="Third parties we work with."
          subtitle="We limit subprocessor usage to essential services only. Each subprocessor undergoes security review before onboarding and is re-evaluated annually."
        />
        <FadeInUp delay={0.1}>
          <div className="mt-14 max-w-3xl mx-auto">
            {/* Table header */}
            <div className="grid grid-cols-3 gap-4 px-6 pb-3 border-b border-border">
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                Subprocessor
              </span>
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                Purpose
              </span>
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-semibold text-right">
                Location
              </span>
            </div>
            {/* Table rows */}
            {subprocessors.map((sp, i) => (
              <FadeInUp key={sp.name} delay={0.12 + i * 0.06}>
                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border last:border-b-0 hover:bg-surface-2/50 transition-colors">
                  <span className="text-sm font-semibold text-text-primary">
                    {sp.name}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {sp.purpose}
                  </span>
                  <span className="text-sm text-text-tertiary text-right">
                    {sp.location}
                  </span>
                </div>
              </FadeInUp>
            ))}
          </div>
        </FadeInUp>
        <FadeInUp delay={0.4}>
          <p className="text-xs text-text-muted text-center mt-6 max-w-lg mx-auto">
            Last updated: February 2026. We notify customers at least 30 days
            before adding new subprocessors. Subscribe to updates via your
            account dashboard.
          </p>
        </FadeInUp>
      </SectionWrapper>

      {/* ── Document Request CTA ── */}
      <SectionWrapper>
        <div className="text-center">
          <FadeInUp>
            <MonitorIcon className="w-8 h-8 text-brand-sage mx-auto mb-4" />
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Need compliance documentation?
            </h2>
            <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
              Request SOC 2 reports, penetration test summaries, our Data
              Processing Agreement, or schedule a security deep-dive with our
              team. Enterprise customers receive priority access to all
              compliance artifacts.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Request Documentation <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/security"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                View Security Practices
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
