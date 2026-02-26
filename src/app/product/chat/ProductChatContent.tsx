"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  TerminalIcon, AlertIcon, ScanIcon, AnalyticsIcon,
  NetworkIcon, TeamIcon, EnterpriseIcon, DeployIcon,
} from "@/components/ui/BrandIcons";

/* ─── Features ─── */
const features = [
  {
    icon: AlertIcon,
    title: "Natural Language Notifications",
    description:
      "No more cryptic alert codes. When Panguard detects something, it tells you in plain language: 'Someone attempted to brute-force your SSH from an IP in Brazil at 2:47 AM. We blocked it. No action needed.'",
  },
  {
    icon: ScanIcon,
    title: "Security Q&A",
    description:
      "Ask questions about your security posture in natural language. 'What happened last night?' 'Are any of my servers running outdated software?' 'Show me all blocked attacks this week.' Get answers backed by real data.",
  },
  {
    icon: NetworkIcon,
    title: "Multi-Platform Support",
    description:
      "Panguard Chat works where you already are. Slack, LINE, Telegram, and Discord integrations are available out of the box. No separate dashboard to check. Security updates arrive in the channel you already monitor.",
  },
  {
    icon: AnalyticsIcon,
    title: "Weekly Summaries",
    description:
      "Every Monday morning, receive an automated weekly security digest: threats blocked, new vulnerabilities patched, configuration changes detected, and an overall security score trend. Share it with your team or board.",
  },
  {
    icon: DeployIcon,
    title: "Incident Walkthroughs",
    description:
      "When a significant event occurs, Chat Agent walks you through what happened, why it matters, and what Panguard did about it. You can ask follow-up questions and drill into the details, all in conversation form.",
  },
  {
    icon: TeamIcon,
    title: "Team Collaboration",
    description:
      "Tag teammates, escalate incidents to specific people, and maintain a conversation history that serves as an audit trail. Everyone on the team gets the context they need without switching tools.",
  },
];

/* ─── Use Cases ─── */
const useCases = [
  {
    icon: TerminalIcon,
    title: "Solo Developer",
    description:
      "You are in a LINE group with your Panguard Chat bot. At 3 AM, it messages you: 'Unusual outbound traffic from your API server. Blocked a data exfiltration attempt. Details attached.' You go back to sleep.",
  },
  {
    icon: TeamIcon,
    title: "Engineering Team",
    description:
      "Your team's Slack #security channel gets real-time updates. When a developer accidentally exposes an internal service, Panguard Chat notifies the channel immediately and suggests a fix. The developer patches it in minutes.",
  },
  {
    icon: EnterpriseIcon,
    title: "Business Owner",
    description:
      "You do not speak security. You just want to know if your business is safe. Every week, Panguard Chat sends a simple summary: 'Everything normal. 47 threats blocked. No action required.' When something needs your attention, it tells you exactly what to do.",
  },
];

/* ─── Chat mockup messages ─── */
const chatMessages = [
  { from: "panguard", text: "Good morning. Here is your weekly security summary for Jan 13-19." },
  { from: "panguard", text: "47 threats blocked | 0 critical incidents | Security score: 91/100 (up 3 points)" },
  { from: "panguard", text: "Notable: We blocked 12 SSH brute-force attempts from 3 unique IPs. All IPs have been added to the blocklist." },
  { from: "user", text: "Where were those IPs from?" },
  { from: "panguard", text: "2 from Russia (Moscow), 1 from China (Shenzhen). All are known scanner IPs in our collective threat database. Your system was never at risk." },
  { from: "user", text: "Thanks. Anything I need to do?" },
  { from: "panguard", text: "Nothing required. Your server is up to date and all configurations look good. I will let you know if anything changes." },
];

export default function ProductChatContent() {
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
              <TerminalIcon className="w-10 h-10 text-brand-sage relative" />
            </div>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              Panguard Chat
            </p>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              Your AI security copilot.{" "}
              <span className="text-brand-sage">
                Plain language, not alert codes.
              </span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              Security that speaks human. Integrated with the tools you already
              use.
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
              Security alerts are useless if nobody understands them.
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">
              Traditional security tools drown you in alerts. CVE numbers,
              severity matrices, MITRE ATT&CK framework references -- all
              designed for security professionals who do not exist in most small
              teams. The result? Alerts get ignored. Important warnings are lost
              in noise. Breaches happen not because they were undetected, but
              because nobody understood the detection.
            </p>
            <p className="text-text-secondary mt-4 leading-relaxed">
              Panguard Chat translates every security event into language any
              human can understand. It tells you what happened, why it matters,
              and what to do about it. And it does it in the messaging platform
              you already have open.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Chat Preview ── */}
      <SectionWrapper dark>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                In Action
              </p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                A conversation, not a dashboard.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">
                Panguard Chat is not a dashboard you have to remember to check.
                It reaches out to you proactively, and responds instantly when
                you have questions. The conversation history doubles as an audit
                trail.
              </p>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-brand-sage" />
                <span className="text-sm font-semibold text-text-primary">
                  Panguard Chat
                </span>
                <span className="text-[10px] text-text-muted ml-auto">
                  #security
                </span>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.from === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.from === "user"
                          ? "bg-brand-sage/20 text-text-primary"
                          : "bg-surface-1 text-text-secondary border border-border"
                      }`}
                    >
                      {msg.text}
                    </div>
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
          title="What Panguard Chat does."
          subtitle="The communication layer for your entire security operation."
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
          title="Who uses Panguard Chat."
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
              Security that talks to you.
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Join the early access program and connect Panguard Chat to your
              Slack, LINE, or Telegram.
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
