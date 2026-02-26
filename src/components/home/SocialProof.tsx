"use client";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";
import {
  ShieldIcon, NetworkIcon, TerminalIcon, ScanIcon, LockIcon, AnalyticsIcon,
} from "@/components/ui/BrandIcons";

const stats = [
  { value: "847", label: "Sigma Detection Rules", icon: ShieldIcon },
  { value: "1,203", label: "YARA Malware Rules", icon: ScanIcon },
  { value: "8", label: "Honeypot Protocols", icon: NetworkIcon },
  { value: "5", label: "AI Agent Pipeline", icon: TerminalIcon },
  { value: "3", label: "Compliance Frameworks", icon: AnalyticsIcon },
  { value: "MIT", label: "Open Source License", icon: LockIcon },
];

export default function SocialProof() {
  return (
    <SectionWrapper>
      <SectionTitle
        overline="By the Numbers"
        title="Built in the open. Verified by code."
        subtitle="Every number below is verifiable in the codebase. No vanity metrics -- just engineering facts."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-14 max-w-3xl mx-auto">
        {stats.map((s, i) => (
          <FadeInUp key={s.label} delay={i * 0.06}>
            <div className="bg-surface-1 rounded-xl border border-border p-6 text-center card-glow">
              <s.icon size={20} className="text-brand-sage mx-auto mb-3" />
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                {s.value}
              </p>
              <p className="text-xs text-text-tertiary mt-2">{s.label}</p>
            </div>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.4}>
        <p className="text-xs text-text-muted text-center mt-8 max-w-xl mx-auto leading-relaxed">
          Fully auditable &middot; Open source &middot; Community-driven rule updates &middot; No data lock-in
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
