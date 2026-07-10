import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';

const REFUND_LAST_UPDATED_EN = 'July 10, 2026';
const REFUND_LAST_UPDATED_ZH = '2026年7月10日';
const REFUND_VERSION = 'v2.0';
const REFUND_PDF_URL = '/legal/03-Refund-Termination.pdf';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Refund & Termination',
    description:
      'PanGuard AI Migrator Pro refund & termination policy. Annual engagements are governed by the Master Services Agreement.',
    alternates: buildAlternates('/legal/refund', locale),
  };
}

export default async function RefundPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  const lastUpdatedLabel = isZh ? '最後更新:' : 'Last updated:';
  const lastUpdatedValue = isZh ? REFUND_LAST_UPDATED_ZH : REFUND_LAST_UPDATED_EN;

  return (
    <article className="prose-legal">
      <header className="mb-10">
        <p className="text-sm text-text-muted">
          {lastUpdatedLabel} {lastUpdatedValue} · {REFUND_VERSION}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">
          {isZh ? 'Migrator Pro 退費與終止' : 'Refund & Termination — Migrator Pro Engagements'}
        </h1>
      </header>

      <div className="my-6 p-6 bg-surface-1 border border-brand-emerald/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-emerald uppercase tracking-wider mb-2">
          {isZh ? '簡而言之' : 'In one line'}
        </p>
        <p className="text-text-primary">
          {isZh
            ? 'Migrator Pro 為年約制 B2B 合約——費用、退費與終止一律依主服務協議 (MSA) 辦理,不適用消費型 7 天退費窗。'
            : 'Migrator Pro is an annual B2B engagement — fees, refunds, and termination are governed by the Master Services Agreement (MSA); it is not subject to a consumer-style refund window.'}
        </p>
      </div>

      <h2>{isZh ? '終止與退費' : 'Termination & refunds'}</h2>
      <p>
        {isZh
          ? '年約制 Migrator Pro 合約的終止與退費一律依 MSA 辦理。任一方得於書面通知後 30 天內未補救之 material breach 時終止合約 (MSA Section 3.3)。年約 B2B 合約不適用消費型無條件退費窗。'
          : 'Termination and refunds for annual Migrator Pro engagements are governed by the MSA. Either party may terminate for a material breach left uncured within thirty (30) days of written notice (MSA Section 3.3). Annual B2B engagements are not subject to a consumer-style no-questions refund window.'}
      </p>

      <h2>{isZh ? '服務 credit' : 'Service credits'}</h2>
      <p>
        {isZh
          ? '若 PanGuard 因自身過失未交付合約約定的 deliverable,Customer 可依適用 SOW 所載之補救條款請求服務 credit。具體 credit 由各 SOW 明定。'
          : 'If PanGuard fails to deliver a contracted deliverable due to PanGuard fault, Customer may claim service credits under the remedy terms of the applicable SOW. Specific credits are defined per SOW.'}
      </p>

      <h2>{isZh ? '資料退出' : 'Data export on exit'}</h2>
      <p>
        {isZh
          ? '合約終止時,所有交付物 Customer 保有,並提供 30 天資料匯出視窗。'
          : "On termination, all delivered artifacts remain the Customer's, with a 30-day data export window."}
      </p>

      <h2>{isZh ? '帳務問題' : 'Billing questions'}</h2>
      <p>
        {isZh ? '請從合約聯絡 email 寄信到 ' : 'Email '}
        <a href="mailto:billing@panguard.ai">billing@panguard.ai</a>
        {isZh
          ? '。我們會於 1 個工作天內回覆。'
          : ' from your contract contact address. We respond within 1 business day.'}
      </p>

      <div className="my-6 p-6 bg-surface-1 border border-brand-sage/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-sage uppercase tracking-wider mb-3">
          {isZh ? '完整退費政策 PDF' : 'Full Refund Policy PDF'}
        </p>
        <a
          href={REFUND_PDF_URL}
          download
          className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-brand-sage-light transition-colors"
        >
          {isZh ? '下載退費與終止 PDF (80 KB)' : 'Download Refund & Termination PDF (80 KB)'}
        </a>
      </div>

      <h2>{isZh ? '相關文件' : 'Related documents'}</h2>
      <ul>
        <li>
          <a href="/legal/msa">{isZh ? '主服務協議 (MSA)' : 'Master Services Agreement'}</a>
        </li>
        <li>
          <a href="/legal/sow">{isZh ? 'Migrator Pro SOW 範本' : 'Migrator Pro SOW template'}</a>
        </li>
      </ul>
    </article>
  );
}
