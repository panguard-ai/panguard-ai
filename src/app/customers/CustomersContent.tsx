"use client";

import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { caseStudies } from "@/data/case-studies";

/* ─── Stats Bar ─── */
const stats = [
  { value: "94%", label: "Reduction in incidents" },
  { value: "14 days", label: "To SOC 2 compliance" },
  { value: "$38K", label: "Avg cost savings" },
  { value: "< 30s", label: "Detection time" },
];

export default function CustomersContent() {
  const featured = caseStudies[0];
  const remaining = caseStudies.slice(1);

  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper spacing="spacious">
        <SectionTitle
          overline="Customer Stories"
          title="Trusted by Growing Teams"
          subtitle="Real companies, real results. See how startups and scaling teams use Panguard AI to secure their infrastructure, achieve compliance, and stop threats before they cause damage."
        />
      </SectionWrapper>

      {/* ── Stats Bar ── */}
      <SectionWrapper dark spacing="tight">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
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

      {/* ── Featured Case Study ── */}
      <SectionWrapper>
        <FadeInUp>
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-6">
            Featured Story
          </p>
        </FadeInUp>
        <FadeInUp delay={0.05}>
          <div className="bg-surface-1 border border-border rounded-2xl p-8 md:p-10 hover:border-brand-sage/40 transition-all card-glow">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-brand-sage/10 text-brand-sage">
                {featured.industry}
              </span>
              <span className="text-sm text-text-tertiary">
                {featured.company}
              </span>
              <span className="text-xs text-text-muted">
                {featured.companySize}
              </span>
            </div>

            <h3 className="text-[clamp(24px,3vw,32px)] font-bold text-text-primary leading-tight max-w-3xl">
              {featured.headline}
            </h3>

            <p className="text-text-secondary mt-4 leading-relaxed max-w-3xl">
              {featured.excerpt}
            </p>

            {/* Results grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {featured.results.map((r) => (
                <div
                  key={r.metric}
                  className="bg-surface-2 rounded-xl border border-border p-4"
                >
                  <p className="text-xl font-bold text-brand-sage">
                    {r.value}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">{r.metric}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href={`/customers/${featured.slug}`}
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Read Full Story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ── All Case Studies Grid ── */}
      <SectionWrapper dark>
        <SectionTitle
          overline="All Stories"
          title="More customer results."
          subtitle="Every deployment is different. Every result speaks for itself."
        />
        <div className="grid md:grid-cols-2 gap-6 mt-14">
          {remaining.map((cs, i) => (
            <FadeInUp key={cs.slug} delay={i * 0.08}>
              <Link
                href={`/customers/${cs.slug}`}
                className="group bg-surface-1 border border-border rounded-2xl p-6 hover:border-brand-sage/40 transition-all card-glow flex flex-col h-full"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-brand-sage/10 text-brand-sage">
                    {cs.industry}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {cs.company}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-text-primary leading-snug group-hover:text-brand-sage transition-colors">
                  {cs.headline}
                </h3>

                <p className="text-sm text-text-secondary mt-3 leading-relaxed flex-1">
                  {cs.excerpt}
                </p>

                {/* Products used */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {cs.productsUsed.map((product) => (
                    <span
                      key={product}
                      className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border border-border text-text-tertiary"
                    >
                      {product}
                    </span>
                  ))}
                </div>

                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-sage mt-4 group-hover:gap-2.5 transition-all">
                  Read Story{" "}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Logo Cloud ── */}
      <SectionWrapper spacing="tight">
        <FadeInUp>
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold text-center mb-8">
            Trusted by teams at
          </p>
        </FadeInUp>
        <FadeInUp delay={0.05}>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
            {caseStudies.map((cs) => (
              <span
                key={cs.company}
                className="text-lg font-bold text-text-tertiary tracking-tight"
              >
                {cs.company}
              </span>
            ))}
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper dark>
        <div className="text-center">
          <FadeInUp>
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              See How Panguard Can Help Your Team
            </h2>
            <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
              Join the growing list of companies that trust Panguard AI to
              protect their infrastructure, simplify compliance, and stop
              threats before they cause damage.
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
                href="/contact"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                Contact Sales
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
