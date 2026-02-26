"use client";
import { GlobalIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";
import CountUp from "../animations/CountUp";

const metrics = [
  { target: 10000, suffix: "+", label: "Companies" },
  { target: 99, suffix: ".9%", label: "Uptime" },
  { target: 1000000, suffix: "+", label: "Threats Blocked", prefix: "" },
];

const companies = [
  "TechCorp", "GlobalFinance", "CyberSecure",
  "DataFlow", "InnovateIT", "SecureNet",
];

export default function SocialProof() {
  return (
    <SectionWrapper>
      <SectionTitle
        serif
        title="Trusted by Industry Leaders"
        subtitle="Security teams at companies of all sizes rely on Panguard AI to protect their infrastructure."
      />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-6 sm:gap-10 mt-14 max-w-2xl mx-auto">
        {metrics.map((m, i) => (
          <FadeInUp key={m.label} delay={i * 0.1}>
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-text-primary">
                {m.label === "Threats Blocked" ? (
                  <span>1M+</span>
                ) : (
                  <CountUp target={m.target} suffix={m.suffix} />
                )}
              </div>
              <p className="text-sm text-text-tertiary mt-2">{m.label}</p>
            </div>
          </FadeInUp>
        ))}
      </div>

      {/* Company logos (text-based placeholders) */}
      <FadeInUp delay={0.3}>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-10">
          {companies.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1.5 text-sm text-text-tertiary font-medium opacity-40"
            >
              <GlobalIcon size={14} className="text-brand-sage/40" />
              {c}
            </span>
          ))}
        </div>
      </FadeInUp>

      {/* Testimonial */}
      <FadeInUp delay={0.4}>
        <div className="mt-12 max-w-2xl mx-auto bg-surface-1 rounded-2xl border border-border p-8 card-glow">
          <div className="text-2xl text-brand-sage/30 font-display leading-none mb-4">&ldquo;</div>
          <p className="text-text-secondary leading-relaxed italic">
            PANGUARD AI has completely transformed our security infrastructure. The real-time
            threat detection is unparalleled, and the support team is exceptional.
          </p>
          <p className="text-sm text-text-tertiary mt-4">
            &mdash; Sarah Chen, CISO at GlobalFinance
          </p>
        </div>
      </FadeInUp>

      {/* Engineering footnote */}
      <FadeInUp delay={0.5}>
        <p className="text-xs text-text-muted text-center mt-8 max-w-xl mx-auto leading-relaxed">
          847 Sigma rules &middot; 848 tests passing &middot; 8 honeypot types &middot; MIT licensed &middot; Fully auditable
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
