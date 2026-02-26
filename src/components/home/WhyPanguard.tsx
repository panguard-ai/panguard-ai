"use client";
import { ShieldIcon, HistoryIcon, LockIcon, TerminalIcon, SupportIcon, EnterpriseIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const features = [
  {
    icon: ShieldIcon,
    title: "AI Detection",
    desc: "Leverage advanced AI to identify and neutralize threats before they impact.",
  },
  {
    icon: HistoryIcon,
    title: "Real-Time",
    desc: "Instant threat monitoring and response for continuous protection.",
  },
  {
    icon: LockIcon,
    title: "Zero Trust",
    desc: "Never trust, always verify with strict access controls.",
  },
  {
    icon: TerminalIcon,
    title: "One-Command",
    desc: "Simplified deployment and management with a single powerful command.",
  },
  {
    icon: SupportIcon,
    title: "24/7 Support",
    desc: "Round-the-clock expert assistance whenever you need it.",
  },
  {
    icon: EnterpriseIcon,
    title: "Enterprise",
    desc: "Scalable security solutions tailored for large-scale businesses.",
  },
];

export default function WhyPanguard() {
  return (
    <SectionWrapper dark>
      <SectionTitle title="Why PANGUARD AI?" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
        {features.map((f, i) => (
          <FadeInUp key={f.title} delay={i * 0.06}>
            <div className="bg-surface-0 rounded-2xl p-7 border border-border card-glow transition-all duration-300 h-full">
              <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-5">
                <f.icon size={24} className="text-brand-sage" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-text-tertiary leading-relaxed">{f.desc}</p>
            </div>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
