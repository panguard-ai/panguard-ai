'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
      {label && (
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs text-text-muted">{label}</span>
          <button
            onClick={handleCopy}
            className="text-text-muted hover:text-text-secondary transition-colors p-1"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-status-safe" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
      <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function AdvancedSetupContent() {
  const t = useTranslations('docs.advancedSetup');

  return (
    <>
      <SectionWrapper spacing="spacious">
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <Link
              href="https://docs.panguard.ai"
              className="text-sm text-text-muted hover:text-brand-sage transition-colors"
            >
              {t('backToDocs')}
            </Link>
            <h1 className="text-[clamp(32px,4vw,48px)] font-bold text-text-primary mt-4 leading-[1.1]">
              {t('title')}
            </h1>
            <p className="text-text-secondary mt-4 text-lg leading-relaxed">{t('subtitle')}</p>
            <p className="text-sm text-text-muted mt-3">
              Free and open source under the MIT license. No account required.
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      <SectionWrapper spacing="tight">
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('degradeNote')}</h2>
            <div className="bg-surface-1 border border-border rounded-xl px-5 py-4">
              <p className="text-text-secondary text-sm leading-relaxed">{t('degradeDesc')}</p>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Custom rules & Threat Cloud */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('customRulesTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('customRulesDesc')}</p>
            <CodeBlock
              code={`# Point the engine at your own ATR rules directory\nexport PANGUARD_ATR_RULES_DIR=/etc/panguard/rules\n\n# Auto-reload rules when files change (no restart)\nexport PANGUARD_WATCH_RULES=true\n\n# Run fully air-gapped (skip Threat Cloud sync)\nexport TC_ENDPOINT=`}
              label="Terminal"
            />
            <p className="text-xs text-text-muted mt-3">{t('customRulesNote')}</p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Environment Variables */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('envTitle')}</h2>
            <p className="text-text-secondary mb-6">{t('envDesc')}</p>
            <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-text-muted font-medium">
                      {t('envVar')}
                    </th>
                    <th className="text-left py-3 px-4 text-text-muted font-medium">
                      {t('envPurpose')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(['env1', 'env2', 'env3', 'env4'] as const).map((key) => (
                    <tr key={key} className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-xs text-brand-sage">
                        {t(`${key}.var`)}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-xs">
                        {t(`${key}.purpose`)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Back to docs */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="https://docs.panguard.ai/quickstart"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                {t('backToGettingStarted')}
              </Link>
              <Link
                href="https://docs.panguard.ai/guides/docker-deployment"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                {t('goToDeployment')}
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
