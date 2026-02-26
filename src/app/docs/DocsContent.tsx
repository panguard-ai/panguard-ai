"use client";

import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  TerminalIcon,
  DeployIcon,
  IntegrationIcon,
  ChatIcon,
  ScanIcon,
  ShieldIcon,
  TrapIcon,
  ReportIcon,
  AnalyticsIcon,
} from "@/components/ui/BrandIcons";

/* ────────────────────────  Data  ──────────────────────────────── */

const quickStartCards = [
  {
    icon: TerminalIcon,
    title: "Installation",
    description:
      "Get Panguard running in 60 seconds. One command, zero configuration.",
    linkText: "Quick Start Guide",
    href: "/docs",
  },
  {
    icon: DeployIcon,
    title: "Configuration",
    description:
      "Customize detection rules, notification channels, and scan schedules.",
    linkText: "Configuration Docs",
    href: "/docs",
  },
  {
    icon: IntegrationIcon,
    title: "API Reference",
    description:
      "RESTful API with full endpoint documentation and code examples.",
    linkText: "API Reference",
    href: "/docs",
  },
  {
    icon: ChatIcon,
    title: "Integrations",
    description:
      "Connect Panguard with Slack, Teams, LINE, Jira, and more.",
    linkText: "Integration Guides",
    href: "/docs",
  },
];

const productDocs = [
  {
    icon: ScanIcon,
    title: "Panguard Scan",
    description:
      "Security audit setup, scan configuration, interpreting results, CI/CD integration",
    href: "/docs",
  },
  {
    icon: ShieldIcon,
    title: "Panguard Guard",
    description:
      "Endpoint protection, detection rules, response actions, alert configuration",
    href: "/docs",
  },
  {
    icon: ChatIcon,
    title: "Panguard Chat",
    description:
      "AI copilot setup, Slack/Teams/LINE integration, query examples",
    href: "/docs",
  },
  {
    icon: TrapIcon,
    title: "Panguard Trap",
    description:
      "Honeypot deployment, attacker profiling, threat intelligence feeds",
    href: "/docs",
  },
  {
    icon: ReportIcon,
    title: "Panguard Report",
    description:
      "Compliance reports, SOC 2 evidence collection, PDF customization",
    href: "/docs",
  },
  {
    icon: AnalyticsIcon,
    title: "Dashboard",
    description:
      "Dashboard overview, custom views, team management, SSO setup",
    href: "/docs",
  },
];

const popularArticles = [
  "How to install Panguard on Ubuntu/Debian",
  "How to install Panguard on CentOS/RHEL",
  "Configuring Slack notifications",
  "Understanding threat severity levels",
  "Setting up automated compliance reports",
  "API authentication and rate limits",
  "Troubleshooting agent connectivity",
  "Upgrading Panguard to the latest version",
];

/* ════════════════════════  Component  ═════════════════════════ */

export default function DocsContent() {
  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <SectionWrapper spacing="spacious">
        <SectionTitle
          overline="DOCUMENTATION"
          title="Get Started with Panguard"
          subtitle="Everything you need to install, configure, and master Panguard AI."
        />

        {/* Search bar (decorative) */}
        <FadeInUp delay={0.15}>
          <div className="mt-10 flex justify-center">
            <div className="bg-surface-1 border border-border rounded-full px-5 py-3 w-full max-w-lg mx-auto flex items-center gap-3">
              <Search className="w-5 h-5 text-text-muted shrink-0" />
              <span className="text-text-muted text-sm select-none">
                Search documentation...
              </span>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ───────────── Quick Start Cards ───────────── */}
      <SectionWrapper>
        <FadeInUp>
          <h3 className="text-xs uppercase tracking-[0.12em] text-brand-sage font-semibold mb-8 text-center">
            Quick Start
          </h3>
        </FadeInUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {quickStartCards.map((card, i) => (
            <FadeInUp key={card.title} delay={i * 0.06}>
              <Link href={card.href} className="block h-full">
                <div className="bg-surface-1 border border-border rounded-2xl p-6 card-glow hover:border-brand-sage/40 transition-all group cursor-pointer h-full flex flex-col">
                  <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center mb-4">
                    <card.icon className="w-4 h-4 text-brand-sage" />
                  </div>
                  <h4 className="text-text-primary font-semibold">
                    {card.title}
                  </h4>
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed flex-1">
                    {card.description}
                  </p>
                  <span className="text-brand-sage text-sm font-medium flex items-center gap-1 mt-4 group-hover:gap-2 transition-all">
                    {card.linkText}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────── Product Documentation Grid ───────────── */}
      <SectionWrapper dark>
        <FadeInUp>
          <h3 className="text-xs uppercase tracking-[0.12em] text-brand-sage font-semibold mb-2 text-center">
            Product Documentation
          </h3>
          <p className="text-text-secondary text-center mb-10">
            Deep-dive documentation for every Panguard product module.
          </p>
        </FadeInUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {productDocs.map((doc, i) => (
            <FadeInUp key={doc.title} delay={i * 0.06}>
              <Link href={doc.href} className="block h-full">
                <div className="bg-surface-1 border border-border rounded-2xl p-6 hover:border-brand-sage/40 transition-all group cursor-pointer h-full flex flex-col">
                  <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center mb-4">
                    <doc.icon className="w-4 h-4 text-brand-sage" />
                  </div>
                  <h4 className="text-text-primary font-semibold">
                    {doc.title}
                  </h4>
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed flex-1">
                    {doc.description}
                  </p>
                  <span className="text-brand-sage text-sm font-medium flex items-center gap-1 mt-4 group-hover:gap-2 transition-all">
                    View docs
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────── Popular Articles ───────────── */}
      <SectionWrapper>
        <FadeInUp>
          <h3 className="text-xs uppercase tracking-[0.12em] text-brand-sage font-semibold mb-2 text-center">
            Popular Articles
          </h3>
          <p className="text-text-secondary text-center mb-10">
            Frequently referenced guides and how-tos.
          </p>
        </FadeInUp>

        <div className="max-w-2xl mx-auto divide-y divide-border">
          {popularArticles.map((article, i) => (
            <FadeInUp key={article} delay={i * 0.04}>
              <Link
                href="/docs"
                className="flex items-center justify-between py-4 text-text-secondary hover:text-text-primary transition-colors group"
              >
                <span className="text-sm">{article}</span>
                <ArrowRight className="w-4 h-4 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────── Help CTA ───────────── */}
      <SectionWrapper dark spacing="tight" fadeBorder>
        <FadeInUp>
          <div className="text-center">
            <h3 className="text-xl font-bold text-text-primary mb-3">
              Can&apos;t find what you&apos;re looking for?
            </h3>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto leading-relaxed">
              Our team is here to help. Reach out through our contact page or
              join the community discussion.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="bg-brand-sage text-surface-0 rounded-full px-6 py-2.5 text-sm font-medium hover:bg-brand-sage-light transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/community"
                className="border border-border text-text-secondary rounded-full px-6 py-2.5 text-sm font-medium hover:text-text-primary hover:border-text-muted transition-colors"
              >
                Community Forum
              </Link>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
