'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Copy, Check, Star, ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';

const INSTALL_CMD = 'npx panguard setup';

const PLATFORMS = [
  'Claude Code',
  'Claude Desktop',
  'Cursor',
  'OpenClaw',
  'Codex',
  'WorkBuddy',
  'NemoClaw',
  'ArkClaw',
];

export default function GuardCTA() {
  const t = useTranslations('home.guardCta');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-3xl mx-auto text-center">
        <FadeInUp>
          <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
            {t('overline')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h2>
          <p className="text-base text-text-secondary mt-3 max-w-xl mx-auto">
            {t('subtitle', { rules: STATS.totalRulesDisplay })}
          </p>
        </FadeInUp>

        <FadeInUp delay={0.15} className="mt-8 max-w-md mx-auto">
          <div className="relative flex items-center gap-2 bg-surface-1/80 backdrop-blur-sm border border-border rounded-xl px-5 py-4 font-mono text-sm">
            <span className="text-panguard-green select-none shrink-0">$</span>
            <code className="text-text-secondary flex-1 select-all overflow-x-auto whitespace-nowrap">
              {INSTALL_CMD}
            </code>
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
        </FadeInUp>

        <FadeInUp delay={0.25} className="flex flex-wrap gap-2 justify-center mt-6">
          {PLATFORMS.map((p) => (
            <span
              key={p}
              className="text-xs text-text-tertiary bg-surface-1/50 border border-border/50 rounded-full px-3 py-1.5"
            >
              {p}
            </span>
          ))}
        </FadeInUp>

        <FadeInUp delay={0.35} className="flex flex-wrap gap-3 justify-center mt-8">
          <Link
            href="https://docs.panguard.ai/quickstart"
            className="inline-flex items-center gap-2 bg-panguard-green text-white font-semibold rounded-full px-6 py-3.5 text-sm hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98]"
          >
            {t('installGuide')} <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/panguard-ai/panguard-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary font-semibold rounded-full px-6 py-3.5 text-sm transition-all duration-200"
          >
            <Star className="w-4 h-4" /> Star on GitHub
          </a>
        </FadeInUp>
      </div>
    </section>
  );
}
