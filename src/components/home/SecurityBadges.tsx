"use client";
import Link from "next/link";
import { ShieldIcon, LockIcon, GlobalIcon, CheckIcon, ScanIcon, AnalyticsIcon } from "@/components/ui/BrandIcons";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const badges = [
  { icon: ShieldIcon, title: "SOC 2 Ready", desc: "Compliant architecture. Auto-generated audit reports." },
  { icon: LockIcon, title: "End-to-End Encryption", desc: "AES-256 at rest. TLS 1.3 in transit." },
  { icon: GlobalIcon, title: "GDPR Compliant", desc: "Data residency options. Right to delete." },
  { icon: CheckIcon, title: "ISO 27001 Ready", desc: "Auto-generated compliance reports." },
  { icon: ScanIcon, title: "Zero Data Retention", desc: "Your data never trains our models." },
  { icon: AnalyticsIcon, title: "Transparent Processing", desc: "Every AI decision is logged and explainable." },
];

export default function SecurityBadges() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="Trust & Compliance"
        title="Built secure. Proven compliant."
        subtitle="We're a security company. Our own security is non-negotiable."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-14">
        {badges.map((b, i) => (
          <FadeInUp key={b.title} delay={i * 0.06}>
            <Link href="/security" className="block bg-surface-0 rounded-xl p-6 border border-border hover:border-border-hover transition-all group card-glow">
              <b.icon size={20} className="text-brand-sage mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-text-primary">{b.title}</p>
              <p className="text-xs text-text-tertiary mt-1">{b.desc}</p>
            </Link>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
