"use client";
import { AnalyticsIcon, HistoryIcon, NetworkIcon, ShieldIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const layers = [
  { badge: "Layer 1", badgeColor: "bg-brand-sage/10 text-brand-sage", name: "Rule Engine", tech: "Sigma + YARA", pct: "~90%", cost: "$0", width: "100%" },
  { badge: "Layer 2", badgeColor: "bg-status-info/10 text-status-info", name: "Edge AI", tech: "Local LLM (Ollama)", pct: "~7%", cost: "\u2248 $0", width: "60%" },
  { badge: "Layer 3", badgeColor: "bg-status-caution/10 text-status-caution", name: "Cloud AI", tech: "Claude / GPT", pct: "~3%", cost: "~$0.02", width: "30%" },
];

const features = [
  { icon: AnalyticsIcon, title: "Dynamic Reasoning", desc: "AI plans investigation steps in real-time" },
  { icon: HistoryIcon, title: "Context Memory", desc: "7-day learning period, gets smarter daily" },
  { icon: NetworkIcon, title: "Collective Intelligence", desc: "Anonymous threat data shared across all clients" },
  { icon: ShieldIcon, title: "Graceful Degradation", desc: "Token depleted \u2192 local AI \u2192 rule engine. Never stops." },
];

export default function TechOverview() {
  return (
    <SectionWrapper>
      <SectionTitle
        overline="Architecture"
        title="Three-layer AI defense funnel"
        subtitle="90% of events cost nothing. Only the most complex 3% reach cloud AI. Security never stops \u2014 even if tokens run out."
      />

      <div className="max-w-3xl mx-auto mt-14 space-y-4">
        {layers.map((l, i) => (
          <FadeInUp key={l.badge} delay={i * 0.1}>
            <div
              className="bg-surface-1 rounded-xl p-6 border border-border mx-auto"
              style={{ maxWidth: l.width }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`${l.badgeColor} text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full`}>
                    {l.badge}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{l.name}</p>
                    <p className="text-xs text-text-tertiary">{l.tech}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-text-secondary font-medium">{l.pct}</span>
                  <span className="text-text-tertiary">{l.cost}/event</span>
                </div>
              </div>
            </div>
          </FadeInUp>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">
        {features.map((f, i) => (
          <FadeInUp key={f.title} delay={i * 0.08}>
            <div className="bg-surface-1 rounded-xl p-5 border border-border text-center card-glow">
              <f.icon size={20} className="text-brand-sage mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-primary">{f.title}</p>
              <p className="text-xs text-text-tertiary mt-1">{f.desc}</p>
            </div>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
