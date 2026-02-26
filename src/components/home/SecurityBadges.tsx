"use client";
import Link from "next/link";
import { ShieldIcon, LockIcon, GlobalIcon, CheckIcon, ScanIcon, AnalyticsIcon } from "@/components/ui/BrandIcons";
import {
  CertifiedSecureBadge,
  AIPoweredBadge,
  EnterpriseGradeBadge,
  MonitoringBadge,
  ZeroTrustBadge,
  ProtectedByBadge,
} from "@/components/ui/BrandBadges";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";

const badges = [
  { icon: ShieldIcon, badge: CertifiedSecureBadge, title: "SOC 2 Ready", desc: "Compliant architecture. Auto-generated audit reports." },
  { icon: LockIcon, badge: ZeroTrustBadge, title: "End-to-End Encryption", desc: "AES-256 at rest. TLS 1.3 in transit." },
  { icon: GlobalIcon, badge: ProtectedByBadge, title: "GDPR Compliant", desc: "Data residency options. Right to delete." },
  { icon: CheckIcon, badge: CertifiedSecureBadge, title: "ISO 27001 Ready", desc: "Auto-generated compliance reports." },
  { icon: ScanIcon, badge: AIPoweredBadge, title: "Zero Data Retention", desc: "Your data never trains our models." },
  { icon: AnalyticsIcon, badge: MonitoringBadge, title: "Transparent Processing", desc: "Every AI decision is logged and explainable." },
];

export default function SecurityBadges() {
  return (
    <SectionWrapper dark>
      <SectionTitle
        overline="Trust & Compliance"
        title="Built secure. Proven compliant."
        subtitle="We're a security company. Our own security is non-negotiable."
      />

      {/* Brand badge strip */}
      <FadeInUp delay={0.05}>
        <div className="flex flex-wrap justify-center gap-8 mt-10 mb-4">
          <CertifiedSecureBadge size={48} className="opacity-30" />
          <AIPoweredBadge size={48} className="opacity-30" />
          <EnterpriseGradeBadge size={48} className="opacity-30" />
          <MonitoringBadge size={48} className="opacity-30" />
          <ZeroTrustBadge size={48} className="opacity-30" />
          <ProtectedByBadge size={48} className="opacity-30" />
        </div>
      </FadeInUp>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {badges.map((b, i) => (
          <FadeInUp key={b.title} delay={i * 0.06}>
            <Link href="/security" className="block bg-surface-0 rounded-xl p-6 border border-border hover:border-border-hover transition-all group card-glow">
              <div className="flex items-start justify-between mb-3">
                <b.icon size={20} className="text-brand-sage group-hover:scale-110 transition-transform" />
                <b.badge size={28} className="opacity-40 group-hover:opacity-70 transition-opacity" />
              </div>
              <p className="text-sm font-semibold text-text-primary">{b.title}</p>
              <p className="text-xs text-text-tertiary mt-1">{b.desc}</p>
            </Link>
          </FadeInUp>
        ))}
      </div>
    </SectionWrapper>
  );
}
