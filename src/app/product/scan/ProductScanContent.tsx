"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ScanIcon, ResponseIcon, AnalyticsIcon, ShieldIcon, NetworkIcon,
  HistoryIcon, TerminalIcon, TeamIcon, EnterpriseIcon,
} from "@/components/ui/BrandIcons";

/* ─── Features ─── */
const features = [
  {
    icon: ResponseIcon,
    title: "Instant Scan",
    description:
      "One curl command. No agent to install, no account to create, no configuration to write. The scanner runs, produces a report, and removes itself from your system. Under 60 seconds from start to finish.",
  },
  {
    icon: AnalyticsIcon,
    title: "PDF Report",
    description:
      "Every scan generates a downloadable PDF report with an executive summary, a security score, detailed findings sorted by severity, and actionable remediation steps for each issue found.",
  },
  {
    icon: ShieldIcon,
    title: "Vulnerability Detection",
    description:
      "Cross-references your installed packages, kernel version, and running services against the National Vulnerability Database (NVD). Known CVEs are flagged with severity ratings and patch guidance.",
  },
  {
    icon: NetworkIcon,
    title: "OS Detection",
    description:
      "Automatically identifies your operating system, distribution, kernel version, and installed package manager. Checks whether you are running a supported release with active security updates.",
  },
  {
    icon: NetworkIcon,
    title: "Open Port Analysis",
    description:
      "Discovers all listening ports, identifies the services behind them, and flags any that should not be publicly accessible. Detects common misconfigurations like exposed databases or admin panels.",
  },
  {
    icon: HistoryIcon,
    title: "Historical Comparison",
    description:
      "Run the scan again next week and see what changed. New ports opened, new vulnerabilities introduced, old issues fixed. Track your security posture over time without installing anything permanently.",
  },
];

/* ─── Use Cases ─── */
const useCases = [
  {
    icon: TerminalIcon,
    title: "Solo Developer",
    description:
      "You just deployed a new VPS for your side project. Before you share the URL, run a Panguard Scan to make sure you did not accidentally expose your database port or leave SSH password auth enabled.",
  },
  {
    icon: TeamIcon,
    title: "Startup CTO",
    description:
      "Your team ships fast and sometimes infrastructure config gets messy. Schedule a weekly Panguard Scan via cron to catch configuration drift before it becomes a breach. Share the PDF with your board.",
  },
  {
    icon: EnterpriseIcon,
    title: "MSP / Consultant",
    description:
      "You manage servers for multiple clients. Run Panguard Scan across all of them, generate branded reports, and demonstrate the value you deliver. No per-client installation needed.",
  },
];

export default function ProductScanContent() {
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
              <ScanIcon className="w-10 h-10 text-brand-sage relative" />
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              Panguard Scan
            </p>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              60-second AI security audit.{" "}
              <span className="text-brand-sage">Free. No installation.</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              One command. Full report. Zero footprint.
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
              You deployed a server. Is it secure?
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">
              Most developers and small businesses have no idea whether their
              servers are configured securely. They copy a DigitalOcean tutorial,
              deploy their app, and hope for the best. Meanwhile, exposed ports,
              default credentials, and unpatched software create attack surfaces
              that automated scanners exploit within hours.
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed">
              Professional security audits cost $5,000 to $50,000 and take weeks.
              Panguard Scan gives you 80% of that value in 60 seconds, for free.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Features ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Features"
          title="What Panguard Scan does."
          subtitle="A comprehensive security snapshot without any permanent installation."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {features.map((f, i) => (
            <FadeInUp key={f.title} delay={i * 0.08}>
              <div className="bg-surface-2 rounded-xl border border-border p-6 h-full card-glow">
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

      {/* ── Use Cases ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Use Cases"
          title="Who uses Panguard Scan."
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
              Try it now. Free forever.
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Run your first scan in under a minute. If you like what you see,
              upgrade to Panguard Guard for continuous protection.
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
                href="/scan"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Run Free Scan
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
