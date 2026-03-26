'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Terminal, Copy, Check, ArrowUp, Star, ExternalLink } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';

const INSTALL_COMMAND = 'npm install -g @panguard-ai/panguard && panguard setup';

interface RoadmapItem {
  readonly version: string;
  readonly title: string;
  readonly details: string;
  readonly completed: boolean;
}

function buildRoadmapItems(atrRules: number, skillsScanned: number): readonly RoadmapItem[] {
  const formattedSkills = skillsScanned >= 1000
    ? `${Math.floor(skillsScanned / 1000).toLocaleString()},000+`
    : `${skillsScanned.toLocaleString()}+`;

  return [
    {
      version: 'v1',
      title: 'Detection + scanning + Threat Cloud',
      details: `${formattedSkills} skills scanned / ${atrRules} ATR rules / OWASP 10/10`,
      completed: true,
    },
    {
      version: 'v2',
      title: 'Real-time blocking + policy engine',
      details: 'NemoClaw-inspired sandbox / 3 deployment modes',
      completed: false,
    },
    {
      version: 'v3',
      title: 'Distributed scan network',
      details: 'Users become scanners / community crystallization',
      completed: false,
    },
    {
      version: 'v4',
      title: 'Enterprise compliance',
      details: 'Audit reports / local LLM / airgap mode',
      completed: false,
    },
  ] as const;
}

export default function CTARoadmap() {
  const t = useTranslations('home.ctaRoadmap');
  const ecosystemStats = useEcosystemStats();
  const [copied, setCopied] = useState(false);

  const roadmapItems = buildRoadmapItems(ecosystemStats.atrRules, ecosystemStats.skillsScanned);

  function handleCopy() {
    navigator.clipboard.writeText(INSTALL_COMMAND).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable
    });
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="bg-gradient-to-b from-[#0a0a0a] to-[#0d2614] px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto">

        {/* Install CTA */}
        <FadeInUp>
          <div className="bg-surface-1 border border-border rounded-xl p-4 font-mono">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Terminal className="w-4 h-4 text-text-muted flex-shrink-0" />
                <code className="text-sm text-brand-sage select-all truncate">
                  {INSTALL_COMMAND}
                </code>
              </div>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-surface-2 transition-colors duration-200"
                aria-label="Copy install command"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-panguard-green" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted" />
                )}
              </button>
            </div>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <p className="text-center text-sm text-text-muted mt-4">
            60 seconds. 16 platforms. {STATS.atrRules} rules. Free forever.
          </p>
        </FadeInUp>

        {/* Divider */}
        <div className="border-t border-border/30 my-12" />

        {/* Mission */}
        <FadeInUp delay={0.15}>
          <h2 className="text-lg sm:text-xl font-semibold text-text-secondary text-center mb-6">
            {t('missionTitle')}
          </h2>
        </FadeInUp>

        <FadeInUp delay={0.2}>
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-xl sm:text-2xl font-bold text-text-primary leading-relaxed">
              {t('mission1')}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-text-primary leading-relaxed">
              {t('mission2')}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-text-primary leading-relaxed">
              {t('mission3')}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-text-primary leading-relaxed">
              {t('mission4')}
            </p>
          </div>
        </FadeInUp>

        {/* Divider */}
        <div className="border-t border-border/30 my-12" />

        {/* Roadmap */}
        <FadeInUp delay={0.25}>
          <h3 className="text-lg sm:text-xl font-semibold text-text-secondary text-center mb-8">
            {t('roadmapTitle')}
          </h3>
        </FadeInUp>

        <div className="relative pl-8 sm:pl-10 space-y-8">
          {/* Vertical timeline line */}
          <div className="absolute left-3 sm:left-4 top-1 bottom-1 w-px bg-border/50" />

          {roadmapItems.map((item, index) => (
            <FadeInUp key={item.version} delay={0.3 + index * 0.08}>
              <div className="relative">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-5 sm:-left-6 top-1.5 w-3 h-3 rounded-full border-2 ${
                    item.completed
                      ? 'bg-panguard-green border-panguard-green'
                      : 'bg-surface-2 border-border'
                  }`}
                />

                <div className={item.completed ? '' : 'opacity-60'}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        item.completed ? 'text-panguard-green' : 'text-text-muted'
                      }`}
                    >
                      {item.version}
                    </span>
                    {item.completed && (
                      <Check className="w-3.5 h-3.5 text-panguard-green" />
                    )}
                  </div>
                  <p
                    className={`text-base font-semibold mt-0.5 ${
                      item.completed ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p
                    className={`text-sm mt-0.5 ${
                      item.completed ? 'text-text-secondary' : 'text-text-muted'
                    }`}
                  >
                    {item.details}
                  </p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border/30 my-12" />

        {/* Bottom CTA Buttons */}
        <FadeInUp delay={0.5}>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
            <a
              href="https://www.npmjs.com/package/@panguard-ai/panguard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-panguard-green text-white font-semibold rounded-full px-8 py-3.5 text-sm hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
            >
              <Terminal className="w-4 h-4" />
              {t('installNow')}
            </a>

            <button
              onClick={handleScrollToTop}
              className="inline-flex items-center justify-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary font-semibold rounded-full px-6 py-3.5 text-sm transition-all duration-200 bg-transparent"
            >
              <ArrowUp className="w-4 h-4" />
              {t('scanSkill')}
            </button>

            <a
              href="https://github.com/panguard-ai/panguard-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary font-semibold rounded-full px-6 py-3.5 text-sm transition-all duration-200"
            >
              <Star className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </FadeInUp>

        {/* Bottom metadata */}
        <FadeInUp delay={0.55}>
          <div className="text-center mt-8 space-y-1">
            <p className="text-xs text-text-muted">
              MIT Licensed{' '}
              <span className="mx-1">{'/'}</span>{' '}
              <a
                href="https://doi.org/10.5281/zenodo.19178002"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-text-secondary transition-colors duration-200"
              >
                Paper published (Zenodo DOI)
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p className="text-xs text-text-muted">
              YC Summer 2026 Applicant
            </p>
          </div>
        </FadeInUp>

      </div>
    </section>
  );
}
