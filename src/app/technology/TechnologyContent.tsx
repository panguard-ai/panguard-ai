"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ShieldIcon, ScanIcon, TerminalIcon, AnalyticsIcon, ResponseIcon,
  AlertIcon, CheckIcon, NetworkIcon, SettingsIcon, GlobalIcon,
  HistoryIcon, LockIcon,
} from "@/components/ui/BrandIcons";

/* ─── Three-layer funnel data ─── */
const layers = [
  {
    badge: "Layer 1",
    badgeColor: "bg-brand-sage/10 text-brand-sage",
    name: "Rule Engine",
    tech: "Sigma + YARA",
    pct: "~90 %",
    cost: "$0",
    width: "100%",
    description:
      "Open-source Sigma and YARA rules form the bedrock. They process the vast majority of security events instantly, on-device, with zero cost per event. New community rules are pulled daily from curated feeds and automatically compiled into the local engine.",
  },
  {
    badge: "Layer 2",
    badgeColor: "bg-[#60a5fa]/10 text-[#60a5fa]",
    name: "Edge AI",
    tech: "Local LLM via Ollama",
    pct: "~7 %",
    cost: "~$0",
    width: "70%",
    description:
      "Events that rules cannot confidently classify are escalated to a local large-language model running on Ollama. This keeps sensitive data on the device, avoids network latency, and adds contextual reasoning without cloud dependency.",
  },
  {
    badge: "Layer 3",
    badgeColor: "bg-[#f59e0b]/10 text-[#f59e0b]",
    name: "Cloud AI",
    tech: "Claude / GPT",
    pct: "~3 %",
    cost: "~$0.02",
    width: "40%",
    description:
      "Only the most ambiguous or novel threats reach cloud AI for deep reasoning. The payload is scrubbed of PII before transmission. Cloud AI returns a structured verdict with a confidence score and a plain-language explanation.",
  },
];

/* ─── Five Agent Architecture ─── */
const agents = [
  {
    icon: ScanIcon,
    name: "Detect Agent",
    role: "First Responder",
    description:
      "Continuously monitors system logs, network traffic, and file-system changes. Applies Sigma and YARA rules in real-time, flagging anomalies the moment they appear. It produces raw event signals enriched with MITRE ATT&CK TTP tags.",
  },
  {
    icon: SettingsIcon,
    name: "Analyze Agent",
    role: "AI Investigator",
    description:
      "Receives flagged events from the Detect Agent and performs multi-step reasoning. It correlates events across time, queries the Context Memory for baseline deviations, and assigns a confidence score from 0 to 100.",
  },
  {
    icon: ResponseIcon,
    name: "Respond Agent",
    role: "Automated Defender",
    description:
      "Executes response playbooks based on confidence thresholds. High-confidence threats trigger automatic isolation, firewall rule injection, or process termination. Medium-confidence events queue human-review tasks with full context.",
  },
  {
    icon: AnalyticsIcon,
    name: "Report Agent",
    role: "Compliance Writer",
    description:
      "Transforms raw incident data into structured reports mapped to ISO 27001, SOC 2, and other frameworks. Generates executive summaries, timeline visualizations, and audit-ready evidence packages automatically.",
  },
  {
    icon: TerminalIcon,
    name: "Chat Agent",
    role: "Security Copilot",
    description:
      "The human interface. Users ask questions in plain language and receive answers backed by real telemetry. Integrated with LINE, Slack, and Telegram. Sends proactive weekly summaries and real-time breach notifications.",
  },
];

/* ─── Confidence Scoring ─── */
const confidenceBands = [
  {
    range: "85 -- 100",
    label: "Auto-respond",
    color: "bg-[#22c55e]",
    barWidth: "100%",
    description:
      "High-confidence threats are neutralized automatically. The Respond Agent executes the matching playbook within seconds, then logs every action for audit.",
  },
  {
    range: "50 -- 84",
    label: "Notify & Review",
    color: "bg-[#f59e0b]",
    barWidth: "84%",
    description:
      "Medium-confidence events trigger a notification to the designated human reviewer via Chat Agent. Full context and AI reasoning are attached so the reviewer can approve or dismiss in one click.",
  },
  {
    range: "0 -- 49",
    label: "Log & Learn",
    color: "bg-[#60a5fa]",
    barWidth: "49%",
    description:
      "Low-confidence signals are logged with full metadata and fed into the Context Memory system. Over time, the baseline model refines itself and these signals either graduate to higher bands or are suppressed as noise.",
  },
];

/* ─── Tech Stack ─── */
const techStack = [
  { icon: TerminalIcon, name: "TypeScript", desc: "End-to-end type safety" },
  { icon: ShieldIcon, name: "Sigma Rules", desc: "Industry-standard detection" },
  { icon: LockIcon, name: "YARA Rules", desc: "Malware pattern matching" },
  { icon: SettingsIcon, name: "Ollama", desc: "Local LLM inference" },
  { icon: SettingsIcon, name: "Claude / GPT", desc: "Cloud AI reasoning" },
  { icon: TerminalIcon, name: "Node.js", desc: "Agent runtime" },
  { icon: NetworkIcon, name: "SQLite + Redis", desc: "Event store & cache" },
  { icon: NetworkIcon, name: "Docker", desc: "Single-command deployment" },
  { icon: GlobalIcon, name: "REST / WebSocket", desc: "Real-time telemetry" },
  { icon: AnalyticsIcon, name: "Prometheus", desc: "Metrics & alerting" },
];

export default function TechnologyContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-6">
              Architecture
            </p>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl">
              Security that <span className="text-brand-sage">thinks</span>,
              <br className="hidden sm:block" /> not just scans.
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mt-6 leading-relaxed">
              A three-layer AI defense funnel, five autonomous agents, and a
              context memory that learns your environment. Built so the 90 % of
              events that are noise cost nothing, and the 3 % that matter get
              the deepest reasoning available.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── Three-Layer Funnel ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Defense Funnel"
          title="Three layers. 90 % free."
          subtitle="Events flow downward through increasingly powerful -- and increasingly expensive -- analysis layers. The funnel ensures cost efficiency while guaranteeing that no genuine threat is missed."
        />
        <div className="max-w-3xl mx-auto mt-14 space-y-6">
          {layers.map((l, i) => (
            <FadeInUp key={l.badge} delay={i * 0.1}>
              <div
                className="bg-surface-1 rounded-xl p-6 border border-border mx-auto"
                style={{ maxWidth: l.width }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`${l.badgeColor} text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full`}
                    >
                      {l.badge}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {l.name}
                      </p>
                      <p className="text-xs text-text-tertiary">{l.tech}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-text-secondary font-medium">
                      {l.pct}
                    </span>
                    <span className="text-text-tertiary">{l.cost}/event</span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {l.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Five Agent Architecture ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Agent Architecture"
          title="Five agents. One mission."
          subtitle="Each agent is a specialist. Together they form an autonomous security operations pipeline that detects, analyzes, responds, reports, and communicates -- without human intervention."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {agents.map((a, i) => (
            <FadeInUp key={a.name} delay={i * 0.08}>
              <div className="bg-surface-2 rounded-xl p-6 border border-border h-full flex flex-col">
                <a.icon className="w-6 h-6 text-brand-sage mb-4 shrink-0" />
                <p className="text-sm font-bold text-text-primary">
                  {a.name}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-brand-sage font-semibold mt-0.5 mb-3">
                  {a.role}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed flex-1">
                  {a.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Flow arrows (desktop) */}
        <FadeInUp delay={0.4}>
          <div className="hidden lg:flex items-center justify-center gap-2 mt-6 text-text-muted">
            {["Detect", "Analyze", "Respond", "Report", "Chat"].map(
              (step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-tertiary">
                    {step}
                  </span>
                  {i < 4 && (
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                  )}
                </span>
              )
            )}
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ── Context Memory ── */}
      <SectionWrapper>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                Context Memory
              </p>
              <h2 className="text-[clamp(32px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
                Seven days to learn you. Then it never forgets.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">
                During the first seven days after installation, Panguard
                silently observes your system: normal network patterns, typical
                process trees, expected cron schedules, and standard user
                behaviour. This builds a per-device baseline stored in an
                encrypted local database.
              </p>
              <p className="text-text-secondary mt-4 leading-relaxed">
                After the learning window, any deviation from baseline is scored
                and flagged. The model continually refines itself -- a new
                legitimate service gets adopted into the baseline within hours,
                while a novel attack pattern triggers escalation immediately.
              </p>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-1 rounded-xl border border-border p-6 space-y-4">
              {[
                { day: "Day 1-2", label: "Observation", desc: "Collecting process trees, network connections, file-system baselines" },
                { day: "Day 3-4", label: "Pattern extraction", desc: "Building statistical models of normal behavior per service" },
                { day: "Day 5-6", label: "Threshold tuning", desc: "Calibrating alert thresholds to minimize false positives" },
                { day: "Day 7+", label: "Active protection", desc: "Full detection + auto-response with continuous refinement" },
              ].map((step) => (
                <div key={step.day} className="flex gap-4 items-start">
                  <div className="shrink-0 w-20">
                    <span className="text-xs font-semibold text-brand-sage">
                      {step.day}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {step.label}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Confidence Scoring ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Confidence Scoring"
          title="Every event gets a score."
          subtitle="A 0-100 confidence score determines what happens next. High scores trigger automatic response. Medium scores notify humans. Low scores feed the learning system."
        />
        <div className="max-w-3xl mx-auto mt-14 space-y-6">
          {confidenceBands.map((band, i) => (
            <FadeInUp key={band.label} delay={i * 0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <span className="text-lg font-bold text-text-primary font-mono">
                    {band.range}
                  </span>
                  <span className="text-sm font-semibold text-text-secondary">
                    {band.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-3 rounded-full mb-3">
                  <div
                    className={`h-full ${band.color} rounded-full`}
                    style={{ width: band.barWidth }}
                  />
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {band.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Collective Threat Intelligence ── */}
      <SectionWrapper>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeInUp>
            <div className="bg-surface-1 rounded-xl border border-border p-6">
              <div className="space-y-4">
                {[
                  { icon: ScanIcon, label: "Anonymous sharing", desc: "Threat indicators are stripped of all identifying data before contribution." },
                  { icon: NetworkIcon, label: "Distributed cache", desc: "New threat signatures propagate to the entire fleet within minutes." },
                  { icon: HistoryIcon, label: "Automatic rule push", desc: "Community-validated signatures are compiled into Sigma/YARA rules and pushed to every agent." },
                  { icon: ShieldIcon, label: "Privacy-first", desc: "No IP addresses, hostnames, or user data leave the device. Only hashes and behavioral patterns." },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4 items-start">
                    <item.icon className="w-5 h-5 text-brand-sage shrink-0 mt-0.5" />
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
            </div>
          </FadeInUp>
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                Collective Intelligence
              </p>
              <h2 className="text-[clamp(32px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
                One device detects it. Every device blocks it.
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">
                When a Panguard agent identifies a previously unknown threat, an
                anonymous indicator of compromise (IOC) is contributed to the
                collective intelligence network. Within minutes, every other
                Panguard agent receives the new signature.
              </p>
              <p className="text-text-secondary mt-4 leading-relaxed">
                This creates a feedback loop: the more devices in the network,
                the faster new threats are caught, and the stronger every
                individual agent becomes. A small business with one server
                benefits from threat data generated across the entire Panguard
                fleet.
              </p>
            </FadeInUp>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Graceful Degradation ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Resilience"
          title="Security never stops."
          subtitle="Network down? API tokens depleted? Cloud provider outage? Panguard degrades gracefully through its three layers. Protection is always on."
        />
        <div className="max-w-3xl mx-auto mt-14">
          <FadeInUp>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              {[
                {
                  status: "Optimal",
                  color: "bg-[#22c55e]",
                  icon: CheckIcon,
                  desc: "Cloud AI + Local LLM + Rule Engine -- full three-layer analysis on every event.",
                },
                {
                  status: "Cloud Unavailable",
                  color: "bg-[#f59e0b]",
                  icon: AlertIcon,
                  desc: "Local LLM + Rule Engine. Complex events queue for cloud retry. No gaps in protection.",
                },
                {
                  status: "LLM Offline",
                  color: "bg-[#f59e0b]",
                  icon: AlertIcon,
                  desc: "Rule Engine only. Sigma + YARA still catch 90 % of known threats. Events are logged for later AI analysis.",
                },
                {
                  status: "Emergency Mode",
                  color: "bg-[#ef4444]",
                  icon: AlertIcon,
                  desc: "Core watchdog process monitors critical signals. If Panguard itself is targeted, the watchdog alerts the owner and preserves forensic logs.",
                },
              ].map((level, i) => (
                <div
                  key={level.status}
                  className={`flex items-start gap-4 p-6 ${
                    i < 3 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${level.color} mt-1.5 shrink-0`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <level.icon className="w-4 h-4 text-text-tertiary" />
                      <p className="text-sm font-semibold text-text-primary">
                        {level.status}
                      </p>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {level.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Tech Stack ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Stack"
          title="Built on proven foundations."
          subtitle="Every component is chosen for reliability, performance, and developer ergonomics. No proprietary lock-in."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-14">
          {techStack.map((t, i) => (
            <FadeInUp key={t.name} delay={i * 0.05}>
              <div className="card-glow bg-surface-1 rounded-xl border border-border p-5 text-center hover:border-border-hover transition-colors">
                <t.icon className="w-5 h-5 text-brand-sage mx-auto mb-3" />
                <p className="text-sm font-semibold text-text-primary">
                  {t.name}
                </p>
                <p className="text-xs text-text-tertiary mt-1">{t.desc}</p>
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
              Ready to see it in action?
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">
              Run a free security scan in 60 seconds, or talk to our team about
              deploying Panguard in your infrastructure.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Free Scan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/early-access"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Get Early Access
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
