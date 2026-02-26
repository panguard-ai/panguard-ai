"use client";
import Link from "next/link";
import { ScanIcon, ShieldIcon, TerminalIcon, NetworkIcon, AnalyticsIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const products = [
  { icon: ScanIcon, name: "Panguard Scan", badge: "Free", badgeColor: "bg-status-safe/10 text-status-safe border-status-safe/20", desc: "60-second AI security audit. PDF report.", href: "/product/scan" },
  { icon: ShieldIcon, name: "Panguard Guard", badge: "Core", badgeColor: "bg-status-safe/10 text-status-safe border-status-safe/20", desc: "24/7 AI monitoring + auto response.", href: "/product/guard" },
  { icon: TerminalIcon, name: "Panguard Chat", badge: "Core", badgeColor: "bg-status-safe/10 text-status-safe border-status-safe/20", desc: "AI copilot. Plain language notifications.", href: "/product/chat" },
  { icon: NetworkIcon, name: "Panguard Trap", badge: "Advanced", badgeColor: "bg-status-caution/10 text-status-caution border-status-caution/20", desc: "Intelligent honeypots. Attacker analysis.", href: "/product/trap" },
  { icon: AnalyticsIcon, name: "Panguard Report", badge: "Compliance", badgeColor: "bg-status-info/10 text-status-info border-status-info/20", desc: "Auto-generated ISO/SOC reports.", href: "/product/report" },
];

export default function ProductSuite() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="Product Suite"
        title="Five products. One platform."
        subtitle="Start with a free scan. Scale to full enterprise protection."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-14">
        {products.map((p, i) => (
          <FadeInUp key={p.name} delay={i * 0.06}>
            <Link href={p.href} className="block bg-surface-0 rounded-2xl p-6 border border-border hover:border-border-hover transition-all group h-full card-glow">
              <p.icon size={24} className="text-brand-sage mb-4 group-hover:scale-110 transition-transform" />
              <span className={`inline-block ${p.badgeColor} border text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3`}>
                {p.badge}
              </span>
              <p className="text-sm font-semibold text-text-primary">{p.name}</p>
              <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed">{p.desc}</p>
            </Link>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
