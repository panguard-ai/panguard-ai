'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

const inputStyles =
  'w-full bg-surface-1 border border-border rounded-full px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage transition-colors';

const TIER_TO_INQUIRY_INDEX: Record<string, number> = {
  pilot: 1,
  enterprise: 2,
  'founding-f500': 3,
  sovereign: 4,
  oem: 5,
  'atr-member': 6,
};

export default function ContactForm() {
  const t = useTranslations('contactForm');
  const searchParams = useSearchParams();

  const inquiryTypes = t.raw('inquiryTypes') as string[];

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    type: '',
    message: '',
  });

  useEffect(() => {
    const tier = searchParams?.get('tier');
    if (!tier) return;
    const idx = TIER_TO_INQUIRY_INDEX[tier];
    const prefilledType =
      idx !== undefined && inquiryTypes[idx] !== undefined ? inquiryTypes[idx] : '';
    const tierLabel: Record<string, string> = {
      pilot: 'Pilot ($25K, 90 days)',
      enterprise: 'Enterprise ($150K-$500K)',
      'founding-f500': 'Founding F500 program ($100K/year × 2)',
      sovereign: 'Sovereign AI ($5-20M)',
      oem: 'Vendor OEM License ($2-10M/year)',
      'atr-member': 'ATR Foundation Member ($10K/year)',
    };
    const label = tierLabel[tier];
    const sovereignPath = tier === 'sovereign' ? searchParams?.get('path') : null;
    const pathLine = sovereignPath ? `Sovereign Path: ${sovereignPath}\n` : '';
    setForm((prev) => ({
      ...prev,
      type: prefilledType || prev.type,
      message: prev.message || (label ? `Tier: ${label}\n${pathLine}\n` : ''),
    }));
  }, [searchParams, inquiryTypes]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Submit failed');
      setSubmitted(true);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="py-12 text-center form-state-enter">
        <div className="w-12 h-12 rounded-full bg-status-safe/10 border border-status-safe/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-6 h-6 text-status-safe" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">{t('successTitle')}</h3>
        <p className="text-text-secondary mt-2 leading-relaxed text-sm max-w-sm mx-auto">
          {t('successDesc')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-xs text-text-tertiary mb-1.5">
            {t('labels.name')}
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('placeholders.name')}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs text-text-tertiary mb-1.5">
            {t('labels.email')}
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder={t('placeholders.email')}
            className={inputStyles}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-company" className="block text-xs text-text-tertiary mb-1.5">
            {t('labels.company')}
          </label>
          <input
            id="contact-company"
            type="text"
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            placeholder={t('placeholders.company')}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="contact-inquiry-type" className="block text-xs text-text-tertiary mb-1.5">
            {t('labels.inquiryType')}
          </label>
          <select
            id="contact-inquiry-type"
            required
            value={form.type}
            onChange={(e) => update('type', e.target.value)}
            className={`${inputStyles} appearance-none`}
          >
            <option value="">{t('placeholders.inquiryType')}</option>
            {inquiryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-xs text-text-tertiary mb-1.5">
          {t('labels.message')}
        </label>
        <textarea
          id="contact-message"
          required
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          placeholder={t('placeholders.message')}
          rows={5}
          className={`${inputStyles} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-status-alert">{error}</p>}

      <button
        type="submit"
        className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
      >
        {loading ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
