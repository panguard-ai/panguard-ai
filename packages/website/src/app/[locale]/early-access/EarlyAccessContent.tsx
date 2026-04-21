'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';

export default function EarlyAccessContent() {
  const t = useTranslations('earlyAccess');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', company: '', endpoints: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSubmitted(true);
        setFormData({ email: '', company: '', endpoints: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="relative min-h-[60vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-28 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1000px] mx-auto relative w-full">
          <FadeInUp>
            <h1 className="text-[clamp(24px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl">
              {t('title')}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mt-6 leading-relaxed">
              {t('subtitle')}
            </p>
          </FadeInUp>

          {submitted ? (
            <FadeInUp delay={0.2}>
              <div className="mt-12 bg-brand-sage/10 border border-brand-sage/30 rounded-xl p-8 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <Check className="w-6 h-6 text-brand-sage" />
                  <h3 className="text-lg font-bold text-brand-sage">
                    {t('successTitle')}
                  </h3>
                </div>
                <p className="text-text-secondary text-sm">
                  {t('successMessage')}
                </p>
                <p className="text-xs text-text-muted mt-4">
                  {t('successHint')}
                </p>
              </div>
            </FadeInUp>
          ) : (
            <FadeInUp delay={0.2}>
              <form
                onSubmit={handleSubmit}
                className="mt-12 bg-surface-2 border border-border rounded-xl p-8 max-w-md"
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      {t('emailLabel')}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 bg-surface-3 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-sage/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      {t('companyLabel')} {t('optional')}
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      placeholder="Your company"
                      className="w-full px-4 py-2.5 bg-surface-3 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-sage/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      {t('endpointsLabel')} {t('optional')}
                    </label>
                    <select
                      value={formData.endpoints}
                      onChange={(e) =>
                        setFormData({ ...formData, endpoints: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-surface-3 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-sage/50"
                    >
                      <option value="">{t('selectOption')}</option>
                      <option value="1-10">1-10 agents</option>
                      <option value="11-50">11-50 agents</option>
                      <option value="51-100">51-100 agents</option>
                      <option value="100+">100+ agents</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? t('submitting') : t('joinWaitlist')}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-xs text-text-muted mt-4 text-center">
                  {t('privacyNote')}
                </p>
              </form>
            </FadeInUp>
          )}
        </div>
      </section>

      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {t('ctaTitle')}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-4">
              {t('ctaSubtitle')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <Link
              href="https://github.com/panguard-ai/panguard-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 mt-8 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
            >
              {t('getCommunity')} <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
