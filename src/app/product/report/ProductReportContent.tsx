"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  AnalyticsIcon, CheckIcon, ShieldIcon, HistoryIcon,
  TerminalIcon, TeamIcon, EnterpriseIcon, DeployIcon,
} from "@/components/ui/BrandIcons";

/* ─── Features ─── */
const features = [
  {
    icon: AnalyticsIcon,
    title: "Automated Report Generation",
    description:
      "Panguard Report transforms raw security telemetry into structured, readable compliance reports. No manual data gathering, no spreadsheet wrangling, no copy-pasting from dashboards. Reports are generated on-demand or on a schedule.",
  },
  {
    icon: CheckIcon,
    title: "Compliance Mapping",
    description:
      "Every finding is automatically mapped to relevant compliance controls. ISO 27001 Annex A, SOC 2 Trust Service Criteria, GDPR articles, NIST CSF categories. Auditors see exactly which controls are satisfied and which need attention.",
  },
  {
    icon: ShieldIcon,
    title: "Audit-Ready Output",
    description:
      "Reports include evidence packages: timestamped logs, configuration snapshots, response action records, and AI reasoning chains. Auditors get the artifacts they need without you scrambling to produce them.",
  },
  {
    icon: AnalyticsIcon,
    title: "Cost Savings vs. Consultants",
    description:
      "A compliance consultant charges $150-300/hour. Annual SOC 2 preparation costs $20,000-60,000. Panguard Report generates the same documentation continuously, automatically, for a fraction of the cost.",
  },
  {
    icon: HistoryIcon,
    title: "Continuous Compliance",
    description:
      "Compliance is not a point-in-time exercise. Panguard Report generates fresh reports whenever you need them, reflecting your current security posture -- not the state of things six months ago during the last audit.",
  },
  {
    icon: AnalyticsIcon,
    title: "Executive Dashboards",
    description:
      "Visual summaries for non-technical stakeholders: security score trends, threat landscape overview, compliance coverage percentages, and risk heat maps. Share with your board or investors in one click.",
  },
];

/* ─── Use Cases ─── */
const useCases = [
  {
    icon: TerminalIcon,
    title: "Startup Raising Funding",
    description:
      "Investors are asking about your security posture. Instead of hiring a consultant, generate an ISO 27001 gap analysis and SOC 2 readiness report with Panguard Report. Show investors you take security seriously, without spending $50K.",
  },
  {
    icon: TeamIcon,
    title: "Enterprise Sales Team",
    description:
      "Your biggest prospect just sent a 200-question security questionnaire. Panguard Report pre-fills most of the answers with data from your actual security telemetry. What used to take your team two weeks now takes two hours.",
  },
  {
    icon: EnterpriseIcon,
    title: "Compliance Officer",
    description:
      "Annual audit season is approaching. Instead of a three-month scramble to gather evidence, Panguard Report has been continuously generating audit-ready documentation all year. The auditor gets a complete, current evidence package on day one.",
  },
];

/* ─── Report types mockup ─── */
const reportTypes = [
  { name: "ISO 27001 Gap Analysis", coverage: "94%", controls: 114, status: "Ready" },
  { name: "SOC 2 Type II Evidence", coverage: "87%", controls: 64, status: "Ready" },
  { name: "GDPR Compliance Report", coverage: "96%", controls: 42, status: "Ready" },
  { name: "NIST CSF Assessment", coverage: "82%", controls: 108, status: "Ready" },
  { name: "Executive Security Summary", coverage: "100%", controls: null, status: "Ready" },
  { name: "Incident Response Report", coverage: "100%", controls: null, status: "Ready" },
];

export default function ProductReportContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[50vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-sage/20 animate-[spin_12s_linear_infinite]" />
              <div className="absolute inset-2 rounded-full border border-brand-sage/10 animate-[spin_8s_linear_infinite_reverse]" />
              <AnalyticsIcon className="w-10 h-10 text-brand-sage relative" />
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              Panguard Report
            </p>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              Auto-generated compliance reports.{" "}
              <span className="text-brand-sage">ISO 27001. SOC 2.</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              Turn your security data into audit-ready documentation.
              Automatically.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── Pain Point ── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              The Problem
            </p>
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              Compliance is expensive, slow, and painful.
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">
              For a small business, getting SOC 2 certified costs $20,000 to
              $60,000 in consultant fees alone. ISO 27001 is even more. The
              process takes months, requires dedicated staff, and the
              documentation is outdated the moment the audit ends. Most small
              businesses simply cannot afford it -- even when their enterprise
              customers require it.
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed">
              Panguard Report changes the economics of compliance. Because
              Panguard already monitors your systems 24/7, it has all the data
              an auditor needs. Report takes that data and automatically maps it
              to compliance frameworks, generating audit-ready documentation
              that stays current every single day.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Report Types Mockup ── */}
      <SectionWrapper dark>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                Available Reports
              </p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                Every framework. One click.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">
                Select the compliance framework you need, and Panguard Report
                generates a complete report mapped to every control. Coverage
                percentages show exactly where you stand. Gaps are highlighted
                with specific remediation guidance.
              </p>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">
                  Report Library
                </span>
              </div>
              <div className="divide-y divide-border">
                {reportTypes.map((report) => (
                  <div
                    key={report.name}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-surface-3/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AnalyticsIcon className="w-4 h-4 text-brand-sage shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {report.name}
                        </p>
                        {report.controls && (
                          <p className="text-[11px] text-text-muted">
                            {report.controls} controls | {report.coverage}{" "}
                            coverage
                          </p>
                        )}
                      </div>
                    </div>
                    <DeployIcon className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Features ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Features"
          title="What Panguard Report does."
          subtitle="Compliance automation that saves thousands and keeps you audit-ready year-round."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {features.map((f, i) => (
            <FadeInUp key={f.title} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full card-glow">
                <f.icon className="w-5 h-5 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary mb-2">
                  {f.title}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Cost Comparison ── */}
      <SectionWrapper dark>
        <div className="max-w-2xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-10">
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                Cost Comparison
              </p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                The math is simple.
              </h2>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">
                <div className="p-3"></div>
                <div className="p-3 border-l border-border">Consultant</div>
                <div className="p-3 border-l border-border text-brand-sage">
                  Panguard
                </div>
              </div>
              {[
                { label: "SOC 2 Preparation", consultant: "$30,000-60,000", panguard: "Included" },
                { label: "ISO 27001 Gap Analysis", consultant: "$15,000-40,000", panguard: "Included" },
                { label: "Time to Report", consultant: "2-4 months", panguard: "Instant" },
                { label: "Freshness", consultant: "Point-in-time", panguard: "Real-time" },
                { label: "Evidence Gathering", consultant: "Manual", panguard: "Automatic" },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 text-sm ${
                    i < 4 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="p-3 text-text-primary font-medium">
                    {row.label}
                  </div>
                  <div className="p-3 text-text-tertiary border-l border-border">
                    {row.consultant}
                  </div>
                  <div className="p-3 text-brand-sage font-semibold border-l border-border">
                    {row.panguard}
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Use Cases ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Use Cases"
          title="Who uses Panguard Report."
        />
        <div className="grid sm:grid-cols-3 gap-6 mt-14">
          {useCases.map((uc, i) => (
            <FadeInUp key={uc.title} delay={i * 0.1}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full card-glow">
                <uc.icon className="w-6 h-6 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary mb-2">
                  {uc.title}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {uc.description}
                </p>
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
              Compliance without the consultant bill.
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Join the early access program and generate your first compliance
              report in minutes, not months.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/early-access"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Get Early Access <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/security"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Our Security Practices
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
