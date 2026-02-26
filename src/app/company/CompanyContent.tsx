"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ShieldIcon, TeamIcon, TerminalIcon,
  HistoryIcon, EnterpriseIcon, ResponseIcon,
} from "@/components/ui/BrandIcons";

/* ─── Values ─── */
const values = [
  {
    icon: ResponseIcon,
    title: "Users don't think",
    subtitle: "Zero friction",
    description:
      "Security should not require a PhD. If the user has to configure it, we failed. If the user has to read a manual, we failed. One command to install, zero configuration, and it just works.",
  },
  {
    icon: TerminalIcon,
    title: "Human language first",
    subtitle: "No jargon",
    description:
      "We never show alert codes when we can show plain English. 'Someone tried to access your SSH port from Russia at 3 AM' is infinitely more useful than 'CVE-2024-XXXX detected on port 22'. Security that speaks human.",
  },
  {
    icon: HistoryIcon,
    title: "Security never stops",
    subtitle: "Graceful degradation",
    description:
      "Cloud down? Local AI takes over. LLM offline? Rule engine handles it. Panguard never says 'service unavailable.' Protection degrades in capability, never in availability. The watchdog always watches.",
  },
  {
    icon: TeamIcon,
    title: "Collective defense",
    subtitle: "One protects all",
    description:
      "When one Panguard agent learns something new, every agent benefits. A solo developer in Taipei and a small business in Berlin share the same threat intelligence, anonymously. The network grows stronger with every node.",
  },
];

/* ─── Open Roles ─── */
const openRoles = [
  {
    title: "Founder & CEO",
    type: "Leadership",
    description:
      "Security practitioner and serial entrepreneur to lead the company vision. Build the team, shape the product, and bring enterprise-grade security to the other 400 million businesses.",
  },
  {
    title: "CTO",
    type: "Leadership",
    description:
      "Principal-level engineer with deep expertise in AI/ML systems, distributed architectures, and threat detection. Lead the technical vision and open-source strategy.",
  },
  {
    title: "Head of AI",
    type: "Engineering",
    description:
      "ML researcher focused on anomaly detection to lead AI research and build the next generation of autonomous threat detection agents.",
  },
  {
    title: "Head of Product",
    type: "Product",
    description:
      "Product leader obsessed with reducing friction. Make complex security systems feel simple for developers and small business owners.",
  },
];

export default function CompanyContent() {
  return (
    <>
      {/* ── Hero / Mission ── */}
      <section className="relative min-h-[60vh] flex items-center px-6 lg:px-[120px] py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-6">
              About Panguard AI
            </p>
          </FadeInUp>
          <FadeInUp delay={0.05}>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.1] tracking-tight text-text-primary max-w-4xl">
              Every funded AI security company protects{" "}
              <span className="text-brand-sage">Fortune 500</span>. We give the
              other 400 million businesses and 70 million developers the AI
              security they&apos;ve never had.
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mt-6 leading-relaxed">
              Enterprise-grade security has been locked behind enterprise-grade
              budgets for decades. We are building the product that makes that
              statement obsolete.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── Brand Story ── */}
      <SectionWrapper>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                The Name
              </p>
              <h2 className="text-[clamp(32px,3.5vw,44px)] font-bold text-text-primary leading-[1.1]">
                PANGUARD
              </h2>
              <p className="text-lg text-text-secondary mt-2">
                <span className="text-brand-sage font-semibold">Pan</span>{" "}
                (Greek god of shepherds, meaning universal) +{" "}
                <span className="text-brand-sage font-semibold">Guard</span>
              </p>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-6 leading-relaxed">
                In Greek mythology, Pan was the god of the wild, shepherds, and
                flocks. He watched over everything that lived beyond the city
                walls -- the vulnerable, the unprotected, the overlooked.
              </p>
              <p className="text-text-secondary mt-4 leading-relaxed">
                That is exactly what Panguard does. The Fortune 500 have walls,
                moats, and armies of security engineers. The solo developer, the
                five-person startup, the small business owner -- they have
                nothing. We are their shepherd. We are the guard that watches
                the wilderness.
              </p>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-1 rounded-xl border border-border p-8 lg:p-10">
              <ShieldIcon className="w-10 h-10 text-brand-sage mb-6" />
              <blockquote className="text-xl font-semibold text-text-primary leading-relaxed italic">
                &ldquo;You don&apos;t need to understand security. You just need
                to know someone is watching over you.&rdquo;
              </blockquote>
              <p className="text-sm text-text-tertiary mt-4">
                -- The founding principle of Panguard AI
              </p>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ── Values ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Values"
          title="What we believe."
          subtitle="These are not slogans on a wall. They are decision-making frameworks that shape every product choice, every design review, and every line of code."
        />
        <div className="grid sm:grid-cols-2 gap-6 mt-14">
          {values.map((v, i) => (
            <FadeInUp key={v.title} delay={i * 0.08}>
              <div className="bg-surface-2 rounded-xl border border-border p-6 h-full">
                <v.icon className="w-6 h-6 text-brand-sage mb-4" />
                <p className="text-sm font-bold text-text-primary">{v.title}</p>
                <p className="text-[11px] uppercase tracking-wider text-brand-sage font-semibold mt-0.5 mb-3">
                  {v.subtitle}
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {v.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── We're Hiring ── */}
      <SectionWrapper>
        <SectionTitle
          overline="Team"
          title="We're building the team."
          subtitle="Panguard is assembling a small, focused team of security practitioners, AI researchers, and product builders. These are the roles we are looking to fill."
        />
        <div className="grid sm:grid-cols-2 gap-6 mt-14">
          {openRoles.map((role, i) => (
            <FadeInUp key={role.title} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-xl border border-border p-6 h-full flex flex-col">
                <p className="text-[11px] uppercase tracking-wider text-brand-sage font-semibold mb-2">
                  {role.type}
                </p>
                <h3 className="text-lg font-bold text-text-primary mb-3">
                  {role.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed flex-1">
                  {role.description}
                </p>
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-sage mt-4 hover:gap-3 transition-all duration-200"
                >
                  Learn More <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Investors & Advisors ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="Investors & Advisors"
          title="Backed by people who get it."
          subtitle="We are building our investor and advisor network. Announcements coming soon."
        />
        <FadeInUp>
          <div className="max-w-xl mx-auto mt-10 bg-surface-2 rounded-xl border border-border p-8 text-center">
            <TeamIcon className="w-8 h-8 text-brand-sage mx-auto mb-4" />
            <p className="text-text-secondary text-sm leading-relaxed">
              Our advisor program is currently forming. We are in conversations
              with cybersecurity veterans, enterprise SaaS leaders, and AI/ML
              researchers. Details will be announced soon.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-sage mt-4 hover:gap-3 transition-all duration-200"
            >
              Interested in advising? <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ── Careers CTA ── */}
      <SectionWrapper>
        <div className="text-center">
          <FadeInUp>
            <EnterpriseIcon className="w-8 h-8 text-brand-sage mx-auto mb-4" />
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Join us.
            </h2>
            <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
              We are looking for people who believe security is a right, not a
              luxury. If you want to build products that protect the people
              nobody else is protecting, we want to talk to you.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                View Open Positions <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Get in Touch
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
