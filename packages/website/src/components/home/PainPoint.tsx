"use client";

import { useTranslations } from "next-intl";
import FadeInUp from "../FadeInUp";
import SectionWrapper from "../ui/SectionWrapper";
import { BRAND_LOGO_PATHS, BRAND_LOGO_VIEWBOX } from "../ui/BrandLogo";

function MetallicLogo() {
  return (
    <FadeInUp delay={0.3}>
      <div className="metallic-logo-wrapper">
        <div className="metallic-logo-inner metallic-shine">
          <svg
            width="100%"
            height="100%"
            viewBox={BRAND_LOGO_VIEWBOX}
            fill="none"
            className="w-[220px] h-[220px] lg:w-[300px] lg:h-[300px]"
          >
            <defs>
              {/* Primary metallic gradient — brushed steel */}
              <linearGradient id="metallic-main" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6B7B6E" />
                <stop offset="15%" stopColor="#B8C4BA" />
                <stop offset="30%" stopColor="#8B9A8E" />
                <stop offset="45%" stopColor="#D4DDD6" />
                <stop offset="55%" stopColor="#9BA99E" />
                <stop offset="70%" stopColor="#C8D2CA" />
                <stop offset="85%" stopColor="#7A8A7D" />
                <stop offset="100%" stopColor="#A8B5AA" />
              </linearGradient>

              {/* Darker metallic for depth */}
              <linearGradient id="metallic-dark" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3A4A3D" />
                <stop offset="25%" stopColor="#5A6A5D" />
                <stop offset="50%" stopColor="#4A5A4D" />
                <stop offset="75%" stopColor="#6A7A6D" />
                <stop offset="100%" stopColor="#3A4A3D" />
              </linearGradient>

              {/* Edge highlight for bevel effect */}
              <linearGradient id="metallic-highlight" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#E8EDE9" />
                <stop offset="40%" stopColor="#B8C4BA" />
                <stop offset="100%" stopColor="#6B7B6E" />
              </linearGradient>

              {/* Ambient glow filter */}
              <filter id="metal-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="0 0 0 0 0.545  0 0 0 0 0.604  0 0 0 0 0.557  0 0 0 0.3 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background glow ring */}
            <circle
              cx="1024"
              cy="1024"
              r="700"
              fill="none"
              stroke="url(#metallic-main)"
              strokeWidth="1"
              opacity="0.15"
            />

            {/* Main logo with metallic fill */}
            <g filter="url(#metal-glow)">
              {BRAND_LOGO_PATHS.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill={
                    p.role === "bg"
                      ? "#1A1614"
                      : i === 0
                        ? "url(#metallic-highlight)"
                        : i === 4
                          ? "url(#metallic-dark)"
                          : "url(#metallic-main)"
                  }
                />
              ))}
            </g>

            {/* Specular highlight overlay on front face */}
            <path
              d={BRAND_LOGO_PATHS[0].d}
              fill="url(#metallic-highlight)"
              opacity="0.12"
            />
          </svg>
        </div>

        {/* Floor reflection */}
        <div className="metallic-reflection w-[220px] h-[80px] lg:w-[300px] lg:h-[100px] mx-auto -mt-2">
          <svg
            width="100%"
            height="100%"
            viewBox={BRAND_LOGO_VIEWBOX}
            fill="none"
          >
            {BRAND_LOGO_PATHS.map((p, i) =>
              p.role === "fg" ? (
                <path key={i} d={p.d} fill="#8B9A8E" opacity="0.3" />
              ) : null
            )}
          </svg>
        </div>
      </div>
    </FadeInUp>
  );
}

export default function PainPoint() {
  const t = useTranslations("home.painPoint");

  return (
    <SectionWrapper>
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        {/* Left: story text */}
        <div className="max-w-2xl flex-1">
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

        {/* Right: metallic logo */}
        <div className="flex-shrink-0 hidden md:flex items-center justify-center">
          <MetallicLogo />
        </div>
      </div>
    </SectionWrapper>
  );
}
