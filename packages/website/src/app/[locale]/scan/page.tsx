import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import { Link } from '@/navigation';
import { ArrowRight, ShieldAlert, Wrench, KeyRound, EyeOff } from 'lucide-react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SkillScanner from '@/components/home/SkillScanner';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('skillScan.title'),
    description: t('skillScan.description'),
    alternates: buildAlternates('/scan', params.locale),
  };
}

const CHECK_ITEMS = [
  { key: 'promptInjection', Icon: ShieldAlert },
  { key: 'toolPoisoning', Icon: Wrench },
  { key: 'secretExfiltration', Icon: KeyRound },
  { key: 'obfuscation', Icon: EyeOff },
] as const;

export default async function ScanPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'metadata.skillScan' });

  return (
    <>
      <NavBar />
      <main id="main-content" className="pt-20">
        {/* Headline — real semantic h1 above the scanner */}
        <section className="px-5 sm:px-6 pt-14 sm:pt-20 pb-2 text-center">
          <FadeInUp>
            <h1 className="text-[clamp(28px,4.5vw,48px)] font-extrabold leading-[1.1] tracking-tight text-text-primary max-w-3xl mx-auto">
              {t('h1')}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
              {t('helper')}
            </p>
          </FadeInUp>
        </section>

        <SkillScanner />

        {/* What we check */}
        <SectionWrapper dark spacing="default">
          <FadeInUp>
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-8 h-[2px] bg-brand-sage rounded-full mb-3" />
              <p className="text-[11px] uppercase tracking-micro text-brand-sage font-semibold font-mono">
                {t('checksOverline')}
              </p>
            </div>
          </FadeInUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {CHECK_ITEMS.map(({ key, Icon }, i) => (
              <FadeInUp key={key} delay={i * 0.06}>
                <div className="bg-surface-1 border border-border rounded-2xl p-6 h-full">
                  <div className="w-10 h-10 rounded-lg bg-brand-sage/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-brand-sage" />
                  </div>
                  <p className="text-sm font-bold text-text-primary mb-2">
                    {t(`checks.${key}.name`)}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {t(`checks.${key}.desc`)}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </SectionWrapper>

        {/* Next step — secondary CTA to Install / Docs */}
        <SectionWrapper spacing="default">
          <FadeInUp>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-[11px] uppercase tracking-micro text-brand-sage font-semibold font-mono mb-4">
                {t('nextOverline')}
              </p>
              <h2 className="text-[clamp(20px,3vw,32px)] font-bold text-text-primary leading-tight">
                {t('nextTitle')}
              </h2>
              <p className="text-sm sm:text-base text-text-secondary mt-4 leading-relaxed">
                {t('nextDesc')}
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <Link
                  href="https://docs.panguard.ai/quickstart"
                  className="sheen lift rounded-xl bg-panguard-green px-6 py-3 font-semibold text-surface-hero hover:bg-panguard-green-light transition-colors duration-300 ease-out-quint"
                >
                  {t('installCta')}
                </Link>
                <Link
                  href="https://docs.panguard.ai"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-6 py-3 font-semibold text-text-primary hover:border-border-hover hover:bg-surface-1 transition-colors duration-300 ease-out-quint"
                >
                  {t('docsCta')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </FadeInUp>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  );
}
