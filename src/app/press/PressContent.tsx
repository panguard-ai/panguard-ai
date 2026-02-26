"use client";

import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Download,
  Mail,
  FileText,
  Palette,
  Monitor,
} from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import { CertifiedSecureBadge, AIPoweredBadge } from "@/components/ui/BrandBadges";
import FadeInUp from "@/components/FadeInUp";
import SectionWrapper from "@/components/ui/SectionWrapper";
import SectionTitle from "@/components/ui/SectionTitle";
import { pressItems, type PressItem } from "@/data/press-items";

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ─── Filter Tabs ─── */

type FilterTab = "All" | "Press Releases" | "Coverage";

const filterTabs: FilterTab[] = ["All", "Press Releases", "Coverage"];

function filterItems(items: PressItem[], tab: FilterTab): PressItem[] {
  if (tab === "All") return items;
  if (tab === "Press Releases") return items.filter((i) => i.type === "press-release");
  return items.filter((i) => i.type === "coverage");
}

/* ─── Type Badge ─── */

function TypeBadge({ type }: { type: PressItem["type"] }) {
  const label = type === "press-release" ? "Press Release" : "Coverage";
  return (
    <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-brand-sage/10 text-brand-sage">
      {label}
    </span>
  );
}

/* ─── Press Release Card ─── */

function PressReleaseCard({ item, index }: { item: PressItem; index: number }) {
  return (
    <FadeInUp delay={index * 0.06}>
      <div className="bg-surface-1 border border-border rounded-2xl p-6 hover:border-brand-sage/40 transition-all duration-200 card-glow h-full flex flex-col group">
        <div className="flex items-center gap-3 mb-3">
          <TypeBadge type={item.type} />
          <span className="text-xs text-text-muted">{formatDate(item.date)}</span>
        </div>

        <h3 className="text-lg font-semibold text-text-primary leading-snug group-hover:text-brand-sage transition-colors duration-200">
          {item.title}
        </h3>

        <p className="text-sm text-text-secondary mt-3 leading-relaxed flex-1">
          {item.excerpt}
        </p>

        <div className="flex items-center mt-5 pt-4 border-t border-border/50">
          <span className="flex items-center gap-1.5 text-brand-sage text-sm font-semibold group-hover:gap-2.5 transition-all duration-200 cursor-pointer">
            Read More
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </FadeInUp>
  );
}

/* ─── Coverage Card ─── */

function CoverageCard({ item, index }: { item: PressItem; index: number }) {
  return (
    <FadeInUp delay={index * 0.06}>
      <div className="bg-surface-1 border border-border rounded-2xl p-6 hover:border-brand-sage/40 transition-all duration-200 card-glow h-full flex flex-col group">
        <div className="flex items-center gap-3 mb-3">
          <TypeBadge type={item.type} />
          <span className="text-xs text-text-muted">{formatDate(item.date)}</span>
        </div>

        {item.source && (
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-2">
            {item.source}
          </p>
        )}

        <h3 className="text-lg font-semibold text-text-primary leading-snug group-hover:text-brand-sage transition-colors duration-200">
          {item.title}
        </h3>

        <p className="text-sm text-text-secondary mt-3 leading-relaxed flex-1">
          {item.excerpt}
        </p>

        <div className="flex items-center mt-5 pt-4 border-t border-border/50">
          <span className="flex items-center gap-1.5 text-brand-sage text-sm font-semibold group-hover:gap-2.5 transition-all duration-200 cursor-pointer">
            Read Article
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </FadeInUp>
  );
}

/* ─── Brand Asset Card ─── */

interface BrandAsset {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  formats: string;
}

const brandAssets: BrandAsset[] = [
  {
    title: "Logo Package",
    description:
      "Primary logo, wordmark, and icon in multiple formats. Includes light and dark variants.",
    icon: FileText,
    formats: "SVG, PNG, EPS",
  },
  {
    title: "Brand Guidelines",
    description:
      "Colors, typography, spacing rules, and usage guidelines for consistent brand representation.",
    icon: Palette,
    formats: "PDF",
  },
  {
    title: "Product Screenshots",
    description:
      "High-resolution screenshots of the Panguard dashboard, CLI interface, and notification UI.",
    icon: Monitor,
    formats: "PNG, JPG",
  },
];

function BrandAssetCard({ asset, index }: { asset: BrandAsset; index: number }) {
  const IconComponent = asset.icon;
  return (
    <FadeInUp delay={index * 0.08}>
      <div className="bg-surface-1 border border-border rounded-2xl p-6 hover:border-brand-sage/40 transition-all duration-200 card-glow h-full flex flex-col">
        <div className="w-10 h-10 rounded-lg bg-brand-sage/10 flex items-center justify-center mb-4">
          <IconComponent className="w-5 h-5 text-brand-sage" />
        </div>

        {/* Brand asset preview */}
        <div className="flex items-center justify-center gap-4 py-4 mb-4 bg-surface-0 rounded-xl border border-border/50">
          {index === 0 && (
            <>
              <BrandLogo size={32} className="text-brand-sage" />
              <BrandLogo size={24} className="text-text-tertiary" />
              <BrandLogo size={16} className="text-text-muted" />
            </>
          )}
          {index === 1 && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded bg-brand-sage" />
              <div className="w-6 h-6 rounded bg-[#1A1614]" />
              <div className="w-6 h-6 rounded bg-[#F5F1E8]" />
              <div className="w-6 h-6 rounded bg-[#2ED573]" />
              <div className="w-6 h-6 rounded bg-[#FBBF24]" />
              <div className="w-6 h-6 rounded bg-[#EF4444]" />
            </div>
          )}
          {index === 2 && (
            <div className="flex gap-3">
              <CertifiedSecureBadge size={36} className="opacity-50" />
              <AIPoweredBadge size={36} className="opacity-50" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-text-primary">{asset.title}</h3>

        <p className="text-sm text-text-secondary mt-2 leading-relaxed flex-1">
          {asset.description}
        </p>

        <p className="text-xs text-text-muted mt-3 mb-4">
          Formats: {asset.formats}
        </p>

        <a
          href="/contact"
          className="inline-flex items-center justify-center gap-2 bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage/40 font-semibold rounded-full px-5 py-2.5 text-sm transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Request Access
        </a>
      </div>
    </FadeInUp>
  );
}

/* ════════════════════════  Press Content  ═══════════════════════ */

export default function PressContent() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const filtered = filterItems(pressItems, activeTab);

  const pressReleases = filtered.filter((i) => i.type === "press-release");
  const coverage = filtered.filter((i) => i.type === "coverage");

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <SectionWrapper spacing="spacious">
        <SectionTitle
          overline="NEWSROOM"
          title="Press & Media"
          subtitle="Press releases, media coverage, and brand resources."
        />
      </SectionWrapper>

      {/* ───────────── Filter Tabs ───────────── */}
      <SectionWrapper spacing="tight">
        <FadeInUp>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-semibold rounded-full px-5 py-2 transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-brand-sage text-surface-0"
                    : "bg-surface-1 text-text-secondary border border-border hover:border-brand-sage/40 hover:text-text-primary"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ───────────── Press Releases ───────────── */}
      {pressReleases.length > 0 && (
        <SectionWrapper>
          <FadeInUp>
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-8">
              Press Releases
            </h3>
          </FadeInUp>
          <div className="grid md:grid-cols-2 gap-6">
            {pressReleases.map((item, i) => (
              <PressReleaseCard key={item.slug} item={item} index={i} />
            ))}
          </div>
        </SectionWrapper>
      )}

      {/* ───────────── Media Coverage ───────────── */}
      {coverage.length > 0 && (
        <SectionWrapper dark>
          <FadeInUp>
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-8">
              Media Coverage
            </h3>
          </FadeInUp>
          <div className="grid md:grid-cols-2 gap-6">
            {coverage.map((item, i) => (
              <CoverageCard key={item.slug} item={item} index={i} />
            ))}
          </div>
        </SectionWrapper>
      )}

      {/* ───────────── No Results ───────────── */}
      {filtered.length === 0 && (
        <SectionWrapper>
          <FadeInUp>
            <div className="text-center py-16">
              <p className="text-text-tertiary text-lg">
                No items in this category yet. Check back soon.
              </p>
            </div>
          </FadeInUp>
        </SectionWrapper>
      )}

      {/* ───────────── Brand Assets ───────────── */}
      <SectionWrapper dark={coverage.length === 0}>
        <SectionTitle
          overline="BRAND ASSETS"
          title="Media Resources"
          subtitle="Download official Panguard AI brand assets for editorial and media use."
        />
        <div className="grid sm:grid-cols-3 gap-6 mt-14">
          {brandAssets.map((asset, i) => (
            <BrandAssetCard key={asset.title} asset={asset} index={i} />
          ))}
        </div>
      </SectionWrapper>

      {/* ───────────── Media Contact ───────────── */}
      <SectionWrapper dark={coverage.length > 0}>
        <FadeInUp>
          <div className="text-center max-w-2xl mx-auto">
            <Mail className="w-8 h-8 text-brand-sage mx-auto mb-4" />
            <h2 className="text-[clamp(28px,3vw,40px)] font-bold text-text-primary">
              Media Inquiries
            </h2>
            <p className="text-text-secondary mt-4 leading-relaxed">
              For media inquiries, interview requests, or brand asset access,
              please contact our communications team.
            </p>
            <p className="text-brand-sage font-semibold mt-4">
              press@panguard.ai
            </p>
          </div>
        </FadeInUp>
        <FadeInUp delay={0.1}>
          <div className="flex justify-center mt-8">
            <a
              href="mailto:press@panguard.ai"
              className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
            >
              <Mail className="w-4 h-4" />
              Contact Press Team
            </a>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
