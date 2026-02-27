"use client";

import { useTranslations } from "next-intl";
import FadeInUp from "../FadeInUp";
import SectionWrapper from "../ui/SectionWrapper";

export default function PainPoint() {
  const t = useTranslations("home.painPoint");

  return (
    <SectionWrapper>
      <div className="max-w-2xl">
        <FadeInUp>
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed">
            {t("line1")}
          </p>
        </FadeInUp>
        <FadeInUp delay={0.1}>
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed mt-6">
            {t("line2")}
          </p>
        </FadeInUp>
        <FadeInUp delay={0.2}>
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed mt-6">
            {t("line3")}
          </p>
        </FadeInUp>
        <FadeInUp delay={0.3}>
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed mt-6">
            {t("line4")}
          </p>
        </FadeInUp>
        <FadeInUp delay={0.4}>
          <p className="text-lg lg:text-xl text-status-alert font-semibold leading-relaxed mt-6">
            {t("line5")}
          </p>
        </FadeInUp>
      </div>
    </SectionWrapper>
  );
}
