"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  AnalyticsIcon, ShieldIcon, GlobalIcon, DeployIcon,
  TerminalIcon, TeamIcon, EnterpriseIcon,
} from "@/components/ui/BrandIcons";

/* ─── Framework Data ─── */
const frameworks = [
  {
    name: "ISO 27001",
    fullName: "Information Security Management System",
    controls: 114,
    coverage: "94%",
    icon: ShieldIcon,
    whoNeeds: "Any company handling sensitive data, pursuing enterprise customers, or preparing for investment due diligence.",
    whatItCovers: "Risk assessment, access control, cryptography, operations security, supplier relationships, incident management, and business continuity.",
    panguardDoes: "Automatically maps 107 of 114 Annex A controls to your live security telemetry. Generates gap analysis with specific remediation steps for the remaining controls.",
  },
  {
    name: "SOC 2 Type II",
    fullName: "Trust Service Criteria",
    controls: 64,
    coverage: "87%",
    icon: AnalyticsIcon,
    whoNeeds: "SaaS companies selling to US enterprise customers. Required by most procurement teams and investors.",
    whatItCovers: "Security, Availability, Processing Integrity, Confidentiality, and Privacy trust service criteria with continuous evidence collection.",
    panguardDoes: "Automates evidence collection for 56 of 64 controls. Generates audit-ready documentation packages including timestamped logs, configuration snapshots, and AI reasoning chains.",
  },
  {
    name: "Taiwan Cyber Security Act",
    fullName: "TCSA",
    controls: 38,
    coverage: "91%",
    icon: GlobalIcon,
    whoNeeds: "Government contractors, critical infrastructure providers, and any Taiwan-based organization subject to the Cyber Security Management Act.",
    whatItCovers: "Security monitoring, incident reporting, infrastructure protection, risk assessment, and compliance reporting for government-regulated entities.",
    panguardDoes: "Full bilingual output (English + Traditional Chinese). Maps 35 of 38 controls automatically. Generates reports formatted for regulatory submission.",
  },
];

/* ─── Report Types ─── */
const reportTypes = [
  { name: "ISO 27001 Gap Analysis", coverage: "94%", controls: 114, status: "Ready" },
  { name: "SOC 2 Type II Evidence", coverage: "87%", controls: 64, status: "Ready" },
  { name: "Taiwan Cyber Security Act", coverage: "91%", controls: 38, status: "Ready" },
  { name: "Executive Security Summary", coverage: "100%", controls: null, status: "Ready" },
  { name: "Incident Response Report", coverage: "100%", controls: null, status: "Ready" },
  { name: "Bilingual Report (EN/zh-TW)", coverage: "100%", controls: null, status: "Ready" },
];

/* ─── Cost Comparison ─── */
const costRows = [
  { label: "SOC 2 Preparation", consultant: "$30,000 - $60,000", panguard: "Included" },
  { label: "ISO 27001 Gap Analysis", consultant: "$15,000 - $40,000", panguard: "Included" },
  { label: "TCSA Compliance Report", consultant: "NT$300,000 - 800,000", panguard: "From $3/endpoint/mo" },
  { label: "Time to Report", consultant: "2 - 4 months", panguard: "Instant" },
  { label: "Report Freshness", consultant: "Point-in-time", panguard: "Real-time" },
  { label: "Evidence Gathering", consultant: "Manual", panguard: "Automatic" },
];

/* ─── Taiwan Benefits ─── */
const taiwanBenefits = [
  {
    icon: GlobalIcon,
    title: "Bilingual Output",
    desc: "Reports generated simultaneously in English and Traditional Chinese (zh-TW). No manual translation needed.",
  },
  {
    icon: EnterpriseIcon,
    title: "Government Contractor Ready",
    desc: "Formatted for regulatory submission. Covers all 38 TCSA controls required for government-affiliated organizations.",
  },
  {
    icon: TerminalIcon,
    title: "Local Consultant Replacement",
    desc: "Taiwan compliance consultants charge NT$300K-800K per engagement. Panguard generates equivalent reports continuously for a fraction of the cost.",
  },
  {
    icon: TeamIcon,
    title: "Cross-Border Compliance",
    desc: "Taiwanese companies selling internationally need both TCSA and ISO 27001/SOC 2. Generate all three from one platform.",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Compliance Content
   ═══════════════════════════════════════════════════════════════════ */
export default function ComplianceContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[50vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              Compliance
            </p>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              Compliance automation for{" "}
              <span className="text-brand-sage">Taiwan and global standards.</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              ISO 27001, SOC 2, and Taiwan Cyber Security Act -- automated,
              affordable, and always current.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/early-access"
                className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Generate Your First Report
              </Link>
              <Link
                href="/demo"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Schedule Demo
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ── Problem ── */}
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
              Getting SOC 2 certified costs $20,000 to $60,000 in consultant
              fees. ISO 27001 is even more. In Taiwan, TCSA compliance
              engagements run NT$300,000 to NT$800,000. The process takes
              months, requires dedicated staff, and the documentation is
              outdated the moment the audit ends.
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed">
              Panguard already monitors your systems 24/7 -- it has all the
              data an auditor needs. Our compliance engine takes that
              telemetry and automatically maps it to framework controls,
              generating audit-ready documentation that stays current every
              single day.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Framework Detail Cards ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Supported Frameworks"
          title="Three frameworks. One platform."
          subtitle="Every finding is automatically mapped to relevant controls. Auditors see exactly which controls are satisfied and which need attention."
        />
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {frameworks.map((fw, i) => (
            <FadeInUp key={fw.name} delay={i * 0.08}>
              <div className="bg-surface-2 rounded-xl border border-border p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-sage/10 flex items-center justify-center">
                    <fw.icon className="w-5 h-5 text-brand-sage" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{fw.name}</p>
                    <p className="text-[11px] text-text-muted">{fw.fullName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-5 py-3 border-y border-border">
                  <div className="text-center flex-1">
                    <p className="text-2xl font-extrabold text-brand-sage">{fw.coverage}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Coverage</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-2xl font-extrabold text-text-primary">{fw.controls}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Controls</p>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-sage font-semibold mb-1">Who needs it</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{fw.whoNeeds}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-sage font-semibold mb-1">What it covers</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{fw.whatItCovers}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-sage font-semibold mb-1">What Panguard does</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{fw.panguardDoes}</p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Taiwan Focus ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Taiwan Market"
          title="Built for Taiwan. Works globally."
          subtitle="Panguard is the only AI security platform with native Taiwan Cyber Security Act support and bilingual compliance reporting."
        />
        <div className="grid sm:grid-cols-2 gap-6 mt-14">
          {taiwanBenefits.map((b, i) => (
            <FadeInUp key={b.title} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full">
                <b.icon className="w-5 h-5 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary mb-2">{b.title}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{b.desc}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Report Preview ── */}
      <SectionWrapper dark>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                Report Library
              </p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                Every framework. One click.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">
                Select the compliance framework you need, and Panguard
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
                  Available Reports
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
                            {report.controls} controls | {report.coverage} coverage
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

      {/* ── Cost Comparison ── */}
      <SectionWrapper>
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
            <div className="bg-surface-1 rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">
                <div className="p-3"></div>
                <div className="p-3 border-l border-border">Consultant</div>
                <div className="p-3 border-l border-border text-brand-sage">Panguard</div>
              </div>
              {costRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 text-sm ${
                    i < costRows.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="p-3 text-text-primary font-medium">{row.label}</div>
                  <div className="p-3 text-text-tertiary border-l border-border">{row.consultant}</div>
                  <div className="p-3 text-brand-sage font-semibold border-l border-border">{row.panguard}</div>
                </div>
              ))}
            </div>
          </FadeInUp>
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
              Generate your first compliance report in minutes, not months.
              ISO 27001, SOC 2, and Taiwan Cyber Security Act -- all from
              one platform.
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
                href="/product/report"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                See Panguard Report
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <p className="text-xs text-text-muted mt-6">
              Want to see our own compliance status?{" "}
              <Link href="/trust" className="text-brand-sage hover:text-brand-sage-light underline underline-offset-2">
                Visit our Trust Center
              </Link>
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
