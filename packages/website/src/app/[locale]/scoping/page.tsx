import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScopingForm from './ScopingForm';

export const metadata: Metadata = {
  title: 'Pilot Scoping · PanGuard AI',
  description:
    'Founding Customer Pilot ($25K / 90d). Five questions, terms acceptance, magic-link signup. Slots: first three customers only.',
  robots: { index: false, follow: true },
};

export default async function ScopingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isZh = locale === 'zh-TW';

  return (
    <>
      <NavBar />
      <main id="main-content" className="pt-24 pb-16 bg-surface-0 text-text-primary min-h-screen">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-3">
            {isZh ? 'Founding Pilot · 簽章合規證據' : 'Founding Pilot · Signed compliance evidence'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            {isZh
              ? '5 個問題 + 接受條款 + 寄送驗證信'
              : '5 questions + accept the terms + email magic-link'}
          </h1>
          <p className="mt-4 text-sm text-text-secondary leading-relaxed">
            {isZh
              ? 'Founding Customer Pilot 限前 3 個客戶，$25,000 USD 一次性收費，90 天交付，$25K 全額抵入 Y1 Enterprise（簽約後 12 個月內升級有效）。送出表單後，我們會寄 magic link 到你的工作信箱，點開後進入 Stripe 結帳。這套 Pilot 專為需要在企業或銀行資安審查中證明 agent 安全性的 AI 廠商與受監管團隊設計。你在 Day 3 就會拿到初步掃描與發現報告——遠早於 7 天退費窗關閉，先看到價值再決定。'
              : 'Founding Customer Pilot is limited to the first three customers. $25,000 USD one-time, 90-day delivery, $25K credits 100% to a Y1 Enterprise contract signed within 12 months. After submission we email a magic-link to your work address; clicking it takes you to Stripe checkout. Built for AI vendors and regulated teams that must prove agent security inside an enterprise or bank security review. You get an initial scan and findings report on Day 3 — well before the 7-day refund window closes, so you see value before you commit.'}
          </p>

          <ScopingForm locale={locale} />

          <p className="mt-6 text-xs text-text-muted">
            {isZh
              ? '正在掃描 IP + 接受率限制 — 重複提交會被擋。如有問題寄 adam@panguard.ai。'
              : 'Rate-limited per IP — repeated submissions are blocked. Questions: adam@panguard.ai.'}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
