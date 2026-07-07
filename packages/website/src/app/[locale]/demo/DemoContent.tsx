'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MonitorIcon, HistoryIcon } from '@/components/ui/BrandIcons';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import DemoRequestForm from './DemoRequestForm';

const stepKeys = ['step1', 'step2', 'step3'] as const;
const stepNumbers = ['01', '02', '03'] as const;

/* ════════════════════════  Component  ═══════════════════════ */

export default function DemoContent() {
  const t = useTranslations('demo');

  return (
    <>
      <NavBar />
      <main id="main-content">
        {/* ───────────── Hero ───────────── */}
        <section className="pt-24 pb-4 px-6 text-center">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              {t('overline')}
            </p>
            <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-3xl mx-auto">
              {t('title')}
            </h1>
            <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </FadeInUp>
        </section>

        {/* ───────────── Two Options ───────────── */}
        <SectionWrapper>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Self-Guided Demo */}
            <FadeInUp>
              <div className="bg-surface-1 rounded-2xl border border-border p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-5">
                  <MonitorIcon className="w-5 h-5 text-brand-sage" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">{t('selfGuided.title')}</h2>
                <p className="text-text-secondary text-sm mt-2 leading-relaxed flex-1">
                  {t('selfGuided.desc')}
                </p>
                <div className="mt-6 p-4 rounded-xl bg-surface-2 border border-border">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-2">
                    {t('selfGuided.quickstartLabel')}
                  </p>
                  <code className="block text-xs sm:text-sm text-text-primary font-mono break-all leading-relaxed">
                    {t('selfGuided.quickstartCmd')}
                  </code>
                </div>
                <Link
                  href="https://docs.panguard.ai/quickstart"
                  className="mt-6 block w-full text-center font-semibold rounded-full px-6 py-3 border border-border text-text-secondary hover:border-brand-sage hover:text-text-primary transition-all duration-200"
                >
                  {t('selfGuided.tryFreeScan')}
                </Link>
              </div>
            </FadeInUp>

            {/* Request a Demo */}
            <FadeInUp delay={0.08}>
              <div className="bg-surface-1 rounded-2xl border border-brand-sage p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-5">
                  <HistoryIcon className="w-5 h-5 text-brand-sage" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">{t('requestDemo.title')}</h2>
                <p className="text-text-secondary text-sm mt-2 mb-6 leading-relaxed">
                  {t('requestDemo.desc')}
                </p>
                <DemoRequestForm />
              </div>
            </FadeInUp>
          </div>
        </SectionWrapper>

        {/* ───────────── What to Expect ───────────── */}
        <SectionWrapper dark>
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-[clamp(24px,3vw,32px)] font-bold text-text-primary leading-[1.1]">
                {t('steps.title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 text-left">
                {stepKeys.map((key, i) => (
                  <div key={key} className="bg-surface-0 rounded-2xl border border-border p-6">
                    <p className="text-xs font-mono text-brand-sage mb-3">{stepNumbers[i]}</p>
                    <h3 className="text-text-primary font-semibold mb-2">
                      {t(`steps.${key}.title`)}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {t(`steps.${key}.desc`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </SectionWrapper>

        {/* ───────────── Preview artifacts (no signup) ───────────── */}
        <SectionWrapper>
          <FadeInUp>
            <div className="max-w-4xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-3 text-center">
                See it before you book
              </p>
              <h2 className="text-[clamp(24px,3vw,32px)] font-bold text-text-primary leading-[1.1] text-center">
                Real artifacts a Pilot customer receives
              </h2>
              <p className="text-text-secondary mt-3 text-base max-w-2xl mx-auto text-center leading-relaxed">
                No form required. Open these on your phone.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
                <Link
                  href="/evidence-pack"
                  className="group bg-surface-1 rounded-2xl border border-border hover:border-brand-sage p-6 transition-colors"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-brand-sage mb-2">
                    Quarterly deliverable
                  </p>
                  <h3 className="text-text-primary font-semibold text-lg">
                    Sample Compliance Evidence Pack
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    3 framework PDFs (EU AI Act / NIST AI RMF / ISO/IEC 42001) + JSON + HTML +
                    manifest with SHA-256 + HMAC. Same pipeline that runs against a real customer
                    workspace.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-brand-sage group-hover:text-brand-sage-light">
                    Open the pack →
                  </p>
                </Link>

                <a
                  href="/samples/soc2-roadmap/PanGuard-SOC2-Roadmap-2026.pdf"
                  className="group bg-surface-1 rounded-2xl border border-border hover:border-brand-sage p-6 transition-colors"
                  download
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-brand-sage mb-2">
                    For your compliance officer
                  </p>
                  <h3 className="text-text-primary font-semibold text-lg">
                    SOC 2 Type 1 Roadmap (PDF)
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    SOC 2 Type 1 readiness in progress; Vanta/Drata vendor evaluation underway;
                    auditor engagement and attestation targeted Q4 2026 / Q1 2027 (subject to
                    fieldwork scheduling). Full timeline, 6 control families, NDA-shareable
                    artifacts list.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-brand-sage group-hover:text-brand-sage-light">
                    Download (57 KB) →
                  </p>
                </a>

                <Link
                  href="/atr/adopters"
                  className="group bg-surface-1 rounded-2xl border border-border hover:border-brand-sage p-6 transition-colors"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-brand-sage mb-2">
                    Ecosystem proof
                  </p>
                  <h3 className="text-text-primary font-semibold text-lg">ATR Adopters</h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    7 production PR merges across 6 ecosystems (Microsoft AGT · Cisco AI Defense ·
                    MISP · OWASP A-S-R-H · Gen Digital Sage). Each adoption links to the merged PR.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-brand-sage group-hover:text-brand-sage-light">
                    See adopters →
                  </p>
                </Link>

                <Link
                  href="/legal/security"
                  className="group bg-surface-1 rounded-2xl border border-border hover:border-brand-sage p-6 transition-colors"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-brand-sage mb-2">
                    Honest security posture
                  </p>
                  <h3 className="text-text-primary font-semibold text-lg">Security Whitepaper</h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    What we have today, what we plan, what we do not pretend to have. Architecture,
                    hosting, encryption, GDPR / PDPA, third-party audit timeline.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-brand-sage group-hover:text-brand-sage-light">
                    Read the whitepaper →
                  </p>
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
