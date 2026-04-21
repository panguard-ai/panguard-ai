'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';

type Lang = 'en' | 'zh';

const COPY = {
  en: {
    overline: 'TEAM TIER · Q2 2026',
    title: 'Hosted Threat Cloud for teams that ship agents in production.',
    subtitle:
      '$500/month, launching Q2 2026. While you wait, the Community edition is already live on npm — same detection engine, just self-hosted. Waitlist gets first access + founding-team pricing lock.',
    ctaInstallCommunity: 'Install Community now (free)',
    whatYouGet: 'What Team tier adds on top of Community',
    features: [
      'Hosted Threat Cloud dashboard — no self-host, no DevOps',
      'Up to 5 team seats + SSO-lite',
      'Centralized fleet view across every agent install in your org',
      'Priority rule updates from TC crystallization (<1h vs 24h)',
      'Email support with 48h response',
      'Founding Team pricing locked: $500/mo for 12 months regardless of list price',
    ],
    formTitle: 'Join the waitlist',
    emailLabel: 'Work email',
    companyLabel: 'Company',
    endpointsLabel: 'How many agents are you protecting?',
    optional: '(optional)',
    selectOption: 'Select range',
    submitting: 'Submitting...',
    submit: 'Get early access',
    privacyNote:
      'We only use your email to reach out about Team tier. No marketing drip. Unsubscribe anytime.',
    successTitle: "You're on the list",
    successMessage:
      "We'll email you when Team tier opens (Q2 2026). Meanwhile, install Community and you're already a Threat Cloud sensor.",
    successHint: 'Questions? Reply to our email or contact enterprise@panguard.ai',
    alreadyShipping: 'Already shipping today · Community tier',
    todayList: [
      { en: '311 ATR detection rules (MIT licensed)', zh: '' },
      { en: 'pga CLI + Guard daemon (11 response actions)', zh: '' },
      { en: 'Honeypot integrated in Guard (trap-bridge.ts)', zh: '' },
      { en: 'Threat Cloud sensor registration on pga up', zh: '' },
      { en: '17 platforms detected (Claude Code, Cursor, Windsurf, ...)', zh: '' },
    ],
  },
  zh: {
    overline: 'TEAM 團隊版 · 2026 Q2',
    title: '給在 production 出 agent 的團隊的託管 Threat Cloud。',
    subtitle:
      '$500/月,2026 Q2 上線。在那之前 Community 版 npm 上已可安裝 — 同一套偵測引擎,自架版。Waitlist 前期可享創始團隊鎖定價。',
    ctaInstallCommunity: '立即安裝 Community(免費)',
    whatYouGet: 'Team 版在 Community 之上多的東西',
    features: [
      '託管 Threat Cloud 儀表板 — 免自架、免 DevOps',
      '最多 5 個團隊席次 + 輕量 SSO',
      '全組織 agent 安裝的集中式艦隊視圖',
      '優先 TC 結晶規則更新(<1 小時 vs 24 小時)',
      'Email 支援,48 小時內回',
      '創始團隊鎖定價:$500/月 連續 12 個月,不受未來調價影響',
    ],
    formTitle: '加入 waitlist',
    emailLabel: '公司 Email',
    companyLabel: '公司',
    endpointsLabel: '你保護多少 agent?',
    optional: '(選填)',
    selectOption: '選擇範圍',
    submitting: '送出中…',
    submit: '取得早期存取',
    privacyNote: '我們只用你的 email 通知 Team 版上線。無行銷廣告。隨時可退訂。',
    successTitle: '你在名單上了',
    successMessage:
      'Team 版 2026 Q2 開放時會 email 通知你。在此之前安裝 Community — 你已經是 Threat Cloud 感測器。',
    successHint: '有問題?回覆我們的 email,或寫 enterprise@panguard.ai',
    alreadyShipping: '今天已可用 · Community 版',
    todayList: [
      { en: '', zh: '311 條 ATR 偵測規則(MIT 授權)' },
      { en: '', zh: 'pga CLI + Guard daemon(11 種反應動作)' },
      { en: '', zh: '整合在 Guard 內的蜜罐(trap-bridge.ts)' },
      { en: '', zh: 'pga up 時自動註冊為 Threat Cloud 感測器' },
      { en: '', zh: '偵測 17 個平台(Claude Code、Cursor、Windsurf…)' },
    ],
  },
};

export default function EarlyAccessContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const lang: Lang = isZh ? 'zh' : 'en';
  const copy = COPY[lang];

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
      <section className="relative px-5 sm:px-6 lg:px-[120px] py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto relative w-full grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: copy + features */}
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
                {copy.overline}
              </p>
              <h1 className="text-[clamp(24px,4vw,48px)] font-extrabold leading-[1.1] tracking-tight text-text-primary">
                {copy.title}
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-lg text-text-secondary mt-6 leading-relaxed">{copy.subtitle}</p>
            </FadeInUp>
            <FadeInUp delay={0.15}>
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 text-brand-sage font-semibold text-sm hover:text-brand-sage-light"
              >
                {copy.ctaInstallCommunity} <ArrowRight className="w-4 h-4" />
              </a>
            </FadeInUp>

            <FadeInUp delay={0.2}>
              <div className="mt-10 pt-8 border-t border-border">
                <p className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  {copy.whatYouGet}
                </p>
                <ul className="space-y-3">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                      <span className="text-sm text-text-secondary leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          </div>

          {/* Right: form or success */}
          <div>
            {submitted ? (
              <FadeInUp delay={0.2}>
                <div className="bg-brand-sage/10 border border-brand-sage/30 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Check className="w-6 h-6 text-brand-sage" />
                    <h3 className="text-lg font-bold text-brand-sage">{copy.successTitle}</h3>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {copy.successMessage}
                  </p>
                  <p className="text-xs text-text-muted mt-4">{copy.successHint}</p>
                </div>
              </FadeInUp>
            ) : (
              <FadeInUp delay={0.2}>
                <form
                  onSubmit={handleSubmit}
                  className="bg-surface-2 border border-border rounded-xl p-7"
                >
                  <h3 className="text-base font-bold text-text-primary mb-6">{copy.formTitle}</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        {copy.emailLabel}
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@company.com"
                        className="w-full px-4 py-2.5 bg-surface-3 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-sage/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        {copy.companyLabel} {copy.optional}
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder={isZh ? '你的公司' : 'Your company'}
                        className="w-full px-4 py-2.5 bg-surface-3 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-sage/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        {copy.endpointsLabel} {copy.optional}
                      </label>
                      <select
                        value={formData.endpoints}
                        onChange={(e) => setFormData({ ...formData, endpoints: e.target.value })}
                        className="w-full px-4 py-2.5 bg-surface-3 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-sage/50"
                      >
                        <option value="">{copy.selectOption}</option>
                        <option value="1-10">1–10 {isZh ? '個' : 'agents'}</option>
                        <option value="11-50">11–50 {isZh ? '個' : 'agents'}</option>
                        <option value="51-100">51–100 {isZh ? '個' : 'agents'}</option>
                        <option value="100+">100+ {isZh ? '個' : 'agents'}</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-6 bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? copy.submitting : copy.submit}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
                    {copy.privacyNote}
                  </p>
                </form>
              </FadeInUp>
            )}
          </div>
        </div>
      </section>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4 text-center">
              {copy.alreadyShipping}
            </p>
            <h2 className="text-[clamp(20px,3vw,36px)] font-bold text-text-primary leading-[1.15] text-center">
              {isZh
                ? '不必等 Team 版才能開始。Community 版今天就在跑。'
                : 'You do not have to wait for Team. Community is live today.'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="mt-10 bg-surface-2 border border-border rounded-xl p-6">
              <code className="block text-sm text-brand-sage font-mono mb-6">
                npm install -g @panguard-ai/panguard && pga up
              </code>
              <ul className="space-y-2.5">
                {copy.todayList.map((item) => {
                  const text = isZh ? item.zh : item.en;
                  return (
                    <li key={text} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                      <span className="text-sm text-text-secondary leading-relaxed">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.3}>
            <div className="mt-8 text-center">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 text-brand-sage font-semibold hover:text-brand-sage-light"
              >
                {isZh ? '完整安裝指南' : 'Full install guide'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
