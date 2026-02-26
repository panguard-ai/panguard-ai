"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { BRAND_LOGO_PATHS, BRAND_LOGO_VIEWBOX } from "../ui/BrandLogo";

/* ─── Install Command (never translated) ─── */
const installCmd = "curl -fsSL https://get.panguard.ai | sh";

function InstallBar() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-3 bg-surface-1/80 backdrop-blur-sm border border-border rounded-xl px-5 py-3.5 font-mono text-sm max-w-md mx-auto">
      <span className="text-brand-sage select-none">$</span>
      <code className="text-text-secondary flex-1 select-all truncate">{installCmd}</code>
      <button
        onClick={handleCopy}
        className="text-text-muted hover:text-text-secondary transition-colors p-1 shrink-0"
        aria-label="Copy install command"
      >
        {copied ? (
          <Check className="w-4 h-4 text-status-safe" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════  Hero Component  ═══════════════════════ */

export default function Hero() {
  const t = useTranslations("home.hero");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ── Background: pure CSS, no JS animation overhead ── */}

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,154,142,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,154,142,1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Central glow orb -- CSS animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none hero-orb" />

      {/* Scan line -- CSS animation */}
      <div className="absolute left-0 right-0 pointer-events-none hero-scanline" />

      {/* ── Content ── */}
      <div className="relative z-10 text-center px-6 py-24 max-w-4xl mx-auto">
        {/* Shield logo -- single entry animation, then static */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative">
            {/* Glow ring -- CSS pulse */}
            <div className="absolute inset-[-50%] rounded-full hero-glow-ring" />
            <svg
              width={120}
              height={120}
              viewBox={BRAND_LOGO_VIEWBOX}
              fill="none"
              className="relative"
            >
              {BRAND_LOGO_PATHS.map((p, i) => (
                <path
                  key={i}
                  fill={p.role === "fg" ? "#8B9A8E" : "#1A1614"}
                  d={p.d}
                />
              ))}
            </svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1 className="text-[clamp(36px,6vw,72px)] font-bold leading-[1.1] tracking-tight text-text-primary">
            {t("title")}
          </h1>
        </motion.div>

        {/* Manifesto */}
        <motion.div
          className="mt-8 max-w-2xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <p className="text-base lg:text-lg text-text-secondary leading-relaxed whitespace-pre-line">
            {t("manifesto1")}
          </p>
          <p className="text-base lg:text-lg text-text-primary font-medium leading-relaxed whitespace-pre-line">
            {t("manifesto2")}
          </p>
          <p className="text-base lg:text-lg text-brand-sage font-semibold leading-relaxed whitespace-pre-line">
            {t("manifesto3")}
          </p>
        </motion.div>

        {/* Install command */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <InstallBar />
        </motion.div>

        {/* Badges */}
        <motion.div
          className="flex flex-wrap gap-4 justify-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.65 }}
        >
          {(["badge1", "badge2", "badge3"] as const).map((key) => (
            <span
              key={key}
              className="text-sm font-medium text-brand-sage bg-brand-sage/10 px-4 py-1.5 rounded-full"
            >
              {t(key)}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-0 to-transparent pointer-events-none" />
    </section>
  );
}
