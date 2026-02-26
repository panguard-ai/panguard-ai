"use client";

import { useState } from "react";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";
import {
  ShieldIcon, TerminalIcon, GlobalIcon, CheckIcon,
  AlertIcon, BlockIcon, HistoryIcon, NetworkIcon,
  AnalyticsIcon, ScanIcon,
} from "@/components/ui/BrandIcons";

/* ─── Mockup scan result ─── */
const mockFindings = [
  { severity: "critical", icon: BlockIcon, color: "text-[#ef4444]", label: "SSH root login enabled", detail: "Root login over SSH is allowed. Disable PermitRootLogin in sshd_config." },
  { severity: "high", icon: AlertIcon, color: "text-[#f59e0b]", label: "Outdated OpenSSL (1.1.1)", detail: "Known vulnerabilities in OpenSSL < 3.0. Upgrade to OpenSSL 3.x." },
  { severity: "medium", icon: AlertIcon, color: "text-[#60a5fa]", label: "Port 3306 (MySQL) exposed", detail: "MySQL port is accessible from the internet. Restrict to localhost or VPN." },
  { severity: "low", icon: CheckIcon, color: "text-[#22c55e]", label: "Firewall active", detail: "UFW is enabled with default deny incoming. Good configuration." },
  { severity: "info", icon: CheckIcon, color: "text-[#22c55e]", label: "OS: Ubuntu 22.04 LTS", detail: "Running a supported LTS release with security updates enabled." },
];

const mockSummary = {
  score: 62,
  grade: "C+",
  openPorts: 7,
  os: "Ubuntu 22.04 LTS",
  uptime: "47 days",
  criticalFindings: 1,
  highFindings: 1,
  scanDuration: "58 seconds",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-text-muted hover:text-text-secondary transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckIcon className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function ScanContent() {
  const curlCommand = "curl -sSL https://scan.panguard.ai | sh";

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-6">
              Free Security Scan
            </p>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              How secure is your system?{" "}
              <span className="text-brand-sage">Find out in 60 seconds.</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-lg mx-auto mt-6 leading-relaxed">
              Free. No installation. No credit card.
            </p>
          </FadeInUp>

          {/* ── Two Options ── */}
          <FadeInUp delay={0.2}>
            <div className="grid sm:grid-cols-2 gap-6 mt-12 max-w-3xl mx-auto">
              {/* Option 1: Scan My Server */}
              <div className="card-glow bg-surface-1 rounded-xl border border-border p-6 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <TerminalIcon className="w-5 h-5 text-brand-sage" />
                  <h3 className="text-lg font-bold text-text-primary">
                    Scan My Server
                  </h3>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Run a single command on your server. Panguard scans your
                  system, generates a security report, and deletes itself. No
                  agent installed. No data retained.
                </p>
                <div className="bg-surface-0 rounded-lg border border-border p-3 flex items-center justify-between gap-2 font-mono text-sm">
                  <code className="text-brand-sage truncate">{curlCommand}</code>
                  <CopyButton text={curlCommand} />
                </div>
                <p className="text-[11px] text-text-muted mt-3">
                  Requires: Linux / macOS. The script is open source and
                  auditable.
                </p>
              </div>

              {/* Option 2: Try Online Demo */}
              <div className="card-glow bg-surface-1 rounded-xl border border-border p-6 text-left flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <GlobalIcon className="w-5 h-5 text-brand-sage" />
                  <h3 className="text-lg font-bold text-text-primary">
                    Try Online Demo
                  </h3>
                </div>
                <p className="text-sm text-text-secondary mb-4 flex-1">
                  No server? No problem. Walk through an interactive demo with
                  simulated scan results. See exactly what Panguard finds and
                  how it reports.
                </p>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
                >
                  Launch Demo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ── What the scan checks ── */}
      <SectionWrapper>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                What We Check
              </p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                A full security audit in under a minute.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <div className="space-y-4 mt-6">
                {[
                  { icon: NetworkIcon, label: "Open Port Analysis", desc: "Discovers all open ports and identifies running services." },
                  { icon: NetworkIcon, label: "OS & Software Detection", desc: "Identifies your operating system, kernel version, and installed packages." },
                  { icon: ShieldIcon, label: "Vulnerability Detection", desc: "Cross-references installed software against known CVE databases." },
                  { icon: ScanIcon, label: "Configuration Audit", desc: "Checks SSH, firewall, TLS, and other critical configurations." },
                  { icon: AnalyticsIcon, label: "PDF Report Generation", desc: "Produces a downloadable, shareable PDF report with findings and recommendations." },
                  { icon: HistoryIcon, label: "Historical Comparison", desc: "If you scan again later, see what changed since last time." },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {item.label}
                      </p>
                      <p className="text-xs text-text-tertiary">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>

          {/* ── Example Result Mockup ── */}
          <FadeInUp delay={0.15}>
            <div className="bg-surface-1 rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="bg-surface-2 px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldIcon className="w-5 h-5 text-brand-sage" />
                    <span className="text-sm font-bold text-text-primary">
                      Panguard Scan Report
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    Example Result
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-text-primary">
                      {mockSummary.score}
                    </p>
                    <p className="text-[11px] text-text-muted uppercase tracking-wider">
                      Score
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-[#f59e0b]">
                      {mockSummary.grade}
                    </p>
                    <p className="text-[11px] text-text-muted uppercase tracking-wider">
                      Grade
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-text-muted">Open Ports</span>
                      <p className="text-text-primary font-semibold">
                        {mockSummary.openPorts}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">OS</span>
                      <p className="text-text-primary font-semibold">
                        {mockSummary.os}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Critical</span>
                      <p className="text-[#ef4444] font-semibold">
                        {mockSummary.criticalFindings}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Scan Time</span>
                      <p className="text-text-primary font-semibold">
                        {mockSummary.scanDuration}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Findings */}
              <div className="divide-y divide-border">
                {mockFindings.map((f) => (
                  <div key={f.label} className="px-6 py-3 flex items-start gap-3">
                    <f.icon className={`w-4 h-4 ${f.color} shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {f.label}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {f.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-surface-2 border-t border-border text-center">
                <p className="text-[11px] text-text-muted">
                  This is an example report. Your actual results will vary.
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper dark>
        <div className="text-center">
          <FadeInUp>
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Liked the scan? Get 24/7 protection.
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Panguard Scan is just the beginning. Install Panguard Guard for
              continuous AI-powered monitoring, automated response, and
              plain-language notifications.
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
                href="/product/guard"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Learn About Guard
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
