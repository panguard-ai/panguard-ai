"use client";
import { TerminalIcon, ShieldIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const steps = [
  {
    num: "01",
    icon: TerminalIcon,
    title: "Install",
    desc: "One command. curl or package manager. AI auto-detects your OS, services, open ports, and network topology. Zero questions asked.",
  },
  {
    num: "02",
    icon: ShieldIcon,
    title: "Protect",
    desc: "Three-layer AI defense runs 24/7. Local rules handle 90%. Edge AI catches behavioral patterns. Cloud AI handles the unknown. All automatic.",
  },
  {
    num: "03",
    icon: TerminalIcon,
    title: "Understand",
    desc: "When something happens, Panguard tells you \u2014 on LINE, Slack, or Telegram. What happened, what it did, and what you should know. Not an alert code.",
  },
];

export default function HowItWorks() {
  return (
    <SectionWrapper>
      <SectionTitle overline="How It Works" title="Three steps. That&apos;s it." />

      <div className="grid md:grid-cols-3 gap-10 mt-16">
        {steps.map((s, i) => (
          <FadeInUp key={s.title} delay={i * 0.12} className="relative text-center">
            <span className="text-8xl font-extrabold text-surface-2 select-none leading-none">
              {s.num}
            </span>
            <div className="w-12 h-12 rounded-xl bg-brand-sage/10 flex items-center justify-center mx-auto mt-4 mb-4">
              <s.icon size={24} className="text-brand-sage" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">
              {s.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
              {s.desc}
            </p>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
