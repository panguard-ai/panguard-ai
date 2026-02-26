"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ShieldIcon, NetworkIcon, ResponseIcon, AnalyticsIcon,
  SettingsIcon, HistoryIcon, TerminalIcon, TeamIcon, EnterpriseIcon, CheckIcon,
} from "@/components/ui/BrandIcons";

/* ─── Features ─── */
const features = [
  {
    icon: NetworkIcon,
    title: "5-Agent AI Pipeline",
    description:
      "Events flow through 5 specialized AI agents: Detect (Sigma/YARA rules + local LLM), Analyze (threat classification), Respond (auto-remediation), Report (compliance documentation), and Chat (human notification). 90% of events handled at zero cost by rules alone.",
  },
  {
    icon: ResponseIcon,
    title: "3 Auto-Response Types",
    description:
      "High-confidence threats are neutralized automatically via three response modules: IP Blocker (firewall rules), Process Killer (malicious process termination), and File Quarantine (suspicious file isolation). Every action is logged and reversible.",
  },
  {
    icon: AnalyticsIcon,
    title: "4 Notification Channels",
    description:
      "Get alerts where you already are: LINE, Telegram, Slack, and Email. Each channel supports rich formatting with threat details, severity badges, and one-click remediation links.",
  },
  {
    icon: SettingsIcon,
    title: "Confidence Scoring",
    description:
      "Every event receives a 0-100 confidence score. Scores above 85 trigger auto-response. 50-84 sends a notification. Below 50, the event is logged and fed into the learning system.",
  },
  {
    icon: HistoryIcon,
    title: "Graceful Degradation",
    description:
      "Cloud AI down? Local LLM (Ollama) takes over. LLM offline? The rule engine with 847 Sigma and 1,203 YARA rules handles it. Guard never stops protecting, regardless of network conditions.",
  },
  {
    icon: HistoryIcon,
    title: "7-Day Context Memory",
    description:
      "Seven-day learning period builds a behavioral baseline for your specific system. After that, any deviation is flagged with context. The baseline continuously refines itself over time.",
  },
];

/* ─── Use Cases ─── */
const useCases = [
  {
    icon: TerminalIcon,
    title: "Production Server",
    description:
      "You are running a SaaS product on a $20/month VPS. You cannot afford a SOC team, but you also cannot afford a breach. Panguard Guard gives you enterprise-grade monitoring for a fraction of the cost of a single security analyst.",
  },
  {
    icon: TeamIcon,
    title: "Development Team",
    description:
      "Your team of 10 developers pushes code daily. Panguard Guard monitors your staging and production environments, catches misconfigurations before they become vulnerabilities, and reports everything in Slack.",
  },
  {
    icon: EnterpriseIcon,
    title: "Multi-Server Fleet",
    description:
      "You manage 50 servers across multiple cloud providers. Install Panguard Guard once per server and get a unified security view. Collective intelligence means a threat seen on one server protects all of them.",
  },
];

export default function ProductGuardContent() {
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
              <ShieldIcon className="w-10 h-10 text-brand-sage relative" />
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              Panguard Guard
            </p>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              24/7 AI endpoint protection.{" "}
              <span className="text-brand-sage">One command to install.</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              The always-on security agent that detects, analyzes, and responds
              to threats automatically.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="mt-10 max-w-3xl mx-auto bg-surface-1 rounded-xl border border-border shadow-2xl overflow-hidden">
              {/* Dashboard header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-safe animate-pulse" />
                  <span className="text-xs text-text-secondary font-medium">All Systems Protected</span>
                </div>
                <span className="text-[10px] text-text-muted">Last updated: just now</span>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-px bg-border">
                {[
                  { label: "Threats Blocked", value: "2,847", color: "text-status-safe" },
                  { label: "Active Endpoints", value: "12", color: "text-brand-sage" },
                  { label: "Uptime", value: "99.97%", color: "text-text-primary" },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-1 p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-text-muted mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Recent events */}
              <div className="p-4 space-y-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Recent Events</p>
                {[
                  { time: "2m ago", event: "Blocked SSH brute force from 185.x.x.x", severity: "text-status-caution" },
                  { time: "15m ago", event: "Port scan detected and blocked (24 ports)", severity: "text-status-caution" },
                  { time: "1h ago", event: "Suspicious process quarantined: /tmp/.cache", severity: "text-status-alert" },
                  { time: "3h ago", event: "Weekly AI model updated to v2.1.4", severity: "text-status-safe" },
                ].map((e) => (
                  <div key={e.event} className="flex items-start gap-3 text-xs">
                    <span className="text-text-muted shrink-0 w-12">{e.time}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${e.severity.replace("text-", "bg-")} mt-1.5 shrink-0`} />
                    <span className="text-text-secondary">{e.event}</span>
                  </div>
                ))}
              </div>
            </div>
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
              A scan tells you what is wrong. It does not fix it.
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">
              Scanning once is better than nothing. But threats do not wait for
              your next scan. Attackers probe your systems 24/7. New
              vulnerabilities are published daily. Configuration drift happens
              with every deployment. You need continuous protection, not periodic
              checkups.
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed">
              Panguard Guard is the permanent security agent that lives on your
              server, watches everything in real-time, and takes action before
              you even know there is a problem. It installs in one command, runs
              in the background, and tells you about threats in plain language.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Features ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Features"
          title="What Panguard Guard does."
          subtitle="Enterprise-grade endpoint protection, designed for teams that do not have a dedicated security team."
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

      {/* ── Install Demo ── */}
      <SectionWrapper>
        <div className="max-w-2xl mx-auto text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              Installation
            </p>
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              One command. Done.
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="bg-surface-1 rounded-xl border border-border p-6 mt-8 text-left font-mono text-sm">
              <p className="text-text-muted mb-2"># Install Panguard Guard</p>
              <p className="text-brand-sage">
                curl -sSL https://get.panguard.ai | sh
              </p>
              <p className="text-text-muted mt-4 mb-2"># That&apos;s it. Guard is now running.</p>
              <p className="text-text-secondary">
                <span className="text-[#22c55e]">[OK]</span> Panguard Guard
                v1.0.0 installed
              </p>
              <p className="text-text-secondary">
                <span className="text-[#22c55e]">[OK]</span> Rule engine loaded
                (2,847 Sigma + 1,203 YARA rules)
              </p>
              <p className="text-text-secondary">
                <span className="text-[#22c55e]">[OK]</span> Local LLM ready
                (Ollama)
              </p>
              <p className="text-text-secondary">
                <span className="text-[#22c55e]">[OK]</span> Monitoring started.
                Learning period: 7 days.
              </p>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-text-tertiary">
              {["Linux", "macOS", "Docker", "Kubernetes"].map((os) => (
                <span key={os} className="flex items-center gap-1.5">
                  <CheckIcon className="w-3 h-3 text-brand-sage" />
                  {os}
                </span>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Use Cases ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Use Cases"
          title="Who uses Panguard Guard."
        />
        <div className="grid sm:grid-cols-3 gap-6 mt-14">
          {useCases.map((uc, i) => (
            <FadeInUp key={uc.title} delay={i * 0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6 h-full card-glow">
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
      <SectionWrapper>
        <div className="text-center">
          <FadeInUp>
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Your server deserves a security guard.
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Join the early access program and be among the first to deploy
              Panguard Guard on your infrastructure.
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
                href="/technology"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Read the Architecture
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
