"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  NetworkIcon,
  SettingsIcon,
  GlobalIcon,
  AnalyticsIcon,
  DeployIcon,
  SupportIcon,
  TeamIcon,
  MonitorIcon,
  LockIcon,
  CheckIcon,
  ShieldIcon,
  EnterpriseIcon,
} from "@/components/ui/BrandIcons";

/* ────────────────────────────  Data  ──────────────────────────── */

const partnerTypes = [
  {
    icon: NetworkIcon,
    title: "MSP Partners",
    subtitle: "Managed Security Service Providers",
    description:
      "Add Panguard's AI-powered security to your managed services portfolio. Multi-tenant dashboard, white-label options, volume pricing.",
    highlights: [
      "Multi-tenant management console",
      "White-label deployment options",
      "Volume-based pricing tiers",
      "Automated provisioning API",
    ],
  },
  {
    icon: SettingsIcon,
    title: "Technology Partners",
    subtitle: "Integration & Technology",
    description:
      "Integrate Panguard with your platform. API access, co-marketing opportunities, joint solution development.",
    highlights: [
      "Full REST API access",
      "Co-marketing programs",
      "Joint solution development",
      "Technical integration support",
    ],
  },
  {
    icon: GlobalIcon,
    title: "Reseller Partners",
    subtitle: "Value-Added Resellers",
    description:
      "Resell Panguard AI to your customer base. Deal registration, sales enablement, dedicated partner manager.",
    highlights: [
      "Deal registration protection",
      "Sales enablement resources",
      "Dedicated partner manager",
      "Competitive margin structure",
    ],
  },
];

const benefits = [
  {
    icon: AnalyticsIcon,
    title: "Revenue Share",
    description: "Competitive margins on all customer subscriptions",
  },
  {
    icon: DeployIcon,
    title: "Sales Enablement",
    description: "Co-branded materials, demo environments, training",
  },
  {
    icon: SupportIcon,
    title: "Technical Support",
    description: "Priority partner support channel with dedicated SE",
  },
  {
    icon: TeamIcon,
    title: "Co-Marketing",
    description: "Joint webinars, case studies, and event sponsorship",
  },
  {
    icon: LockIcon,
    title: "Deal Registration",
    description: "Protected deals with transparent pipeline visibility",
  },
  {
    icon: MonitorIcon,
    title: "Early Access",
    description: "Preview new features and beta programs before GA",
  },
];

interface Tier {
  name: string;
  requirement: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

const tiers: Tier[] = [
  {
    name: "Registered",
    requirement: "Free to join",
    description:
      "Get started with the Panguard partner program. Access basic resources and start building your practice.",
    features: [
      "Partner portal access",
      "Product documentation",
      "Standard margins",
      "Community support forum",
      "Co-branded landing page",
      "Monthly partner newsletter",
    ],
    highlighted: false,
  },
  {
    name: "Silver",
    requirement: "5+ customers",
    description:
      "Enhanced benefits for growing partners. Dedicated support and improved economics.",
    features: [
      "Everything in Registered",
      "Enhanced margin structure",
      "Dedicated partner support",
      "Sales enablement kit",
      "Demo environment access",
      "Quarterly business reviews",
      "Lead sharing program",
      "Priority deal registration",
    ],
    highlighted: true,
  },
  {
    name: "Gold",
    requirement: "20+ customers",
    description:
      "Top-tier partnership with maximum benefits, executive sponsorship, and co-development opportunities.",
    features: [
      "Everything in Silver",
      "Highest margin tier",
      "Executive sponsor assigned",
      "Co-development opportunities",
      "Joint go-to-market planning",
      "Custom integrations support",
      "Early access to roadmap",
      "Annual partner summit invite",
      "Dedicated marketing budget",
      "White-glove onboarding for customers",
    ],
    highlighted: false,
  },
];

/* ═══════════════════════  Component  ═══════════════════════════ */

export default function PartnersContent() {
  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper spacing="spacious">
        <SectionTitle
          overline="Partner Program"
          title="Grow With Panguard AI"
          serif
          subtitle="Join our partner ecosystem and deliver enterprise-grade AI security to your customers."
        />
      </SectionWrapper>

      {/* ── Partner Types ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Partnership Models"
          title="Choose your path."
          subtitle="Three partnership tracks designed for different business models. All backed by the same world-class technology and support."
        />
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {partnerTypes.map((partner, i) => (
            <FadeInUp key={partner.title} delay={i * 0.08}>
              <div className="bg-surface-1 border border-border rounded-2xl p-8 card-glow hover:border-brand-sage/40 transition-all h-full flex flex-col">
                <partner.icon className="w-8 h-8 text-brand-sage mb-5" />
                <h3 className="text-lg font-bold text-text-primary">
                  {partner.title}
                </h3>
                <p className="text-[11px] uppercase tracking-wider text-brand-sage font-semibold mt-1 mb-3">
                  {partner.subtitle}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  {partner.description}
                </p>
                <ul className="space-y-2.5 mt-auto">
                  {partner.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-text-secondary"
                    >
                      <CheckIcon className="w-4 h-4 text-brand-sage mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Benefits Grid ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Partner Benefits"
          title="Built for mutual growth."
          subtitle="Every partner gets access to tools, resources, and support designed to accelerate your business."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {benefits.map((benefit, i) => (
            <FadeInUp key={benefit.title} delay={i * 0.06}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full hover:border-brand-sage/40 transition-all">
                <benefit.icon className="w-6 h-6 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary">
                  {benefit.title}
                </p>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Partner Tiers ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Partner Tiers"
          title="Grow with us."
          subtitle="As your Panguard practice grows, so do your benefits. Three tiers designed to reward commitment and success."
        />
        <div className="grid md:grid-cols-3 gap-5 mt-14 max-w-4xl mx-auto">
          {tiers.map((tier, i) => (
            <FadeInUp key={tier.name} delay={i * 0.08}>
              <div
                className={`relative bg-surface-1 rounded-2xl p-8 border h-full flex flex-col ${
                  tier.highlighted
                    ? "border-brand-sage"
                    : "border-border"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-sage text-surface-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <ShieldIcon className="w-4 h-4 text-brand-sage" />
                  <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                    {tier.name}
                  </p>
                </div>

                <div className="mt-3 mb-2">
                  <span className="text-2xl font-extrabold text-text-primary">
                    {tier.requirement}
                  </span>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  {tier.description}
                </p>

                <ul className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-text-secondary"
                    >
                      <CheckIcon className="w-4 h-4 text-brand-sage mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className={`mt-8 block text-center font-semibold rounded-full px-6 py-3 transition-all duration-200 active:scale-[0.98] ${
                    tier.highlighted
                      ? "bg-brand-sage text-surface-0 hover:bg-brand-sage-light"
                      : "border border-border text-text-secondary hover:border-brand-sage hover:text-text-primary"
                  }`}
                >
                  Apply Now
                </Link>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Stats ── */}
      <SectionWrapper spacing="tight">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {[
            { value: "150+", label: "Active partners" },
            { value: "40+", label: "Countries served" },
            { value: "3x", label: "Avg partner revenue growth" },
            { value: "98%", label: "Partner satisfaction" },
          ].map((stat, i) => (
            <FadeInUp key={stat.label} delay={i * 0.06}>
              <div className="text-center">
                <p className="text-[clamp(28px,3.5vw,40px)] font-extrabold text-brand-sage leading-none">
                  {stat.value}
                </p>
                <p className="text-sm text-text-secondary mt-2">
                  {stat.label}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Apply CTA ── */}
      <SectionWrapper dark>
        <div className="text-center">
          <FadeInUp>
            <EnterpriseIcon className="w-10 h-10 text-brand-sage mx-auto mb-6" />
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
              Become a Partner
            </h2>
            <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
              Join a growing ecosystem of security-focused partners delivering
              Panguard AI to businesses worldwide. Apply today and start
              protecting more customers together.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Apply to Partner Program <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Request a Demo
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
