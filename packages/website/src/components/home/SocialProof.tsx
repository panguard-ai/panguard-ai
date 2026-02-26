"use client";
import { useTranslations } from "next-intl";
import SectionWrapper from "../ui/SectionWrapper";
import SectionTitle from "../ui/SectionTitle";
import FadeInUp from "../FadeInUp";
import {
  ShieldIcon, NetworkIcon, TerminalIcon, ScanIcon, LockIcon, AnalyticsIcon,
} from "@/components/ui/BrandIcons";

export default function SocialProof() {
  const t = useTranslations("home.socialProof");

  const stats = [
    { value: t("stat1"), label: t("stat1Label"), icon: ShieldIcon },
    { value: t("stat2"), label: t("stat2Label"), icon: ScanIcon },
    { value: t("stat3"), label: t("stat3Label"), icon: NetworkIcon },
    { value: t("stat4"), label: t("stat4Label"), icon: TerminalIcon },
    { value: t("stat5"), label: t("stat5Label"), icon: AnalyticsIcon },
    { value: t("stat6"), label: t("stat6Label"), icon: LockIcon },
  ];

  return (
    <SectionWrapper>
      <SectionTitle
        overline={t("overline")}
        title={t("title")}
        subtitle={t("subtitle")}
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
          {t("footnote")}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
