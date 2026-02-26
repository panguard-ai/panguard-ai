"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  ShieldIcon, HistoryIcon, LockIcon, TerminalIcon, ResponseIcon,
} from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

/* ─── Animated Counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const dur = 2000;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Stats Cards ─── */
const stats = [
  {
    icon: ShieldIcon,
    value: 90,
    suffix: "%",
    prefix: "",
    label: "of threats handled automatically",
    desc: "Layer 1 rules catch known attacks instantly. No alert, no interruption -- silent protection.",
  },
  {
    icon: ResponseIcon,
    value: 50,
    suffix: "ms",
    prefix: "< ",
    label: "response time",
    desc: "From detection to action. No waiting for humans. No tickets. No SOC team to call.",
  },
  {
    icon: TerminalIcon,
    value: 0,
    suffix: "",
    prefix: "",
    label: "security knowledge required",
    desc: "Panguard speaks human. \"Someone tried your password from Germany. I blocked it.\" That's an actual Panguard notification.",
    isZero: true,
  },
];

/* ─── Feature Cards ─── */
const features = [
  {
    icon: ShieldIcon,
    title: "Detect + Respond Automatically",
    desc: "AI agents detect, analyze, and respond to threats in under 50ms. No human intervention required for 90% of incidents.",
  },
  {
    icon: HistoryIcon,
    title: "Graceful Degradation",
    desc: "Cloud down? Local AI takes over. LLM offline? Rule engine handles it. Protection degrades in capability, never in availability.",
  },
  {
    icon: LockIcon,
    title: "Zero Configuration",
    desc: "One command to install. Zero config files to edit. No YAML sprawl, no agent conflicts. Protected in under 60 seconds.",
  },
];

export default function WhyPanguard() {
  return (
    <>
      {/* ── Problem + Stats ── */}
      <SectionWrapper>
        <SectionTitle
          title="Detection happened. Now what?"
          subtitle="Your antivirus shows an alert. A port scan was detected. An unusual login attempt. You're not a security expert. You don't have an IT team."
        />
        <FadeInUp delay={0.1}>
          <p className="text-text-primary font-semibold text-lg mt-6 text-center">
            That&apos;s the gap Panguard fills.
          </p>
        </FadeInUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {stats.map((c, i) => (
            <FadeInUp key={c.label} delay={i * 0.08}>
              <div className="bg-surface-1 rounded-2xl p-9 border border-border">
                <c.icon size={24} className="text-brand-sage mb-5" />
                <div className="text-5xl font-extrabold text-text-primary">
                  {c.prefix}
                  {c.isZero ? "0" : <Counter target={c.value} suffix={c.suffix} />}
                </div>
                <p className="text-sm text-brand-sage font-medium mt-2">{c.label}</p>
                <p className="text-sm text-text-tertiary mt-4 leading-relaxed">{c.desc}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Why Panguard ── */}
      <SectionWrapper dark>
        <SectionTitle title="Why PANGUARD AI?" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
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
    </>
  );
}
