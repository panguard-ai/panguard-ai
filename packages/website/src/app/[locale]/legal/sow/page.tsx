import type { Metadata } from 'next';

const SOW_LAST_UPDATED_EN = 'May 20, 2026';
const SOW_LAST_UPDATED_ZH = '2026年5月20日';
const SOW_VERSION = 'v1.0';
const SOW_PDF_URL = '/legal/02-Pilot-SOW.pdf';

export const metadata: Metadata = {
  title: 'Pilot Statement of Work — Template',
  description:
    'PanGuard AI Pilot SOW template. 90-day scope, $25,000 fee, 6 deliverables. Founding Customer pricing (first 3 only).',
};

export default async function SOWPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  const lastUpdatedLabel = isZh ? '最後更新:' : 'Last updated:';
  const lastUpdatedValue = isZh ? SOW_LAST_UPDATED_ZH : SOW_LAST_UPDATED_EN;

  return (
    <article className="prose-legal">
      <header className="mb-10">
        <p className="text-sm text-text-muted">
          {lastUpdatedLabel} {lastUpdatedValue} · {SOW_VERSION}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">
          {isZh ? 'Pilot 服務說明書 (SOW) 範本' : 'Pilot Statement of Work — Template'}
        </h1>
      </header>

      <p>
        {isZh
          ? '這是 PanGuard AI 90 天 Pilot 標準 SOW 範本。每個結帳的 Customer 收到的 SOW 都依此產生，並附上指定 SOW 編號、Customer 名稱、Effective Date 與框架選擇。'
          : 'This is the PanGuard AI 90-day Pilot Standard SOW template. Every Customer who checks out receives a SOW generated from this template with their assigned SOW number, Customer name, Effective Date, and framework selection.'}
      </p>

      <div className="my-6 p-6 bg-surface-1 border border-brand-sage/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-sage uppercase tracking-wider mb-3">
          {isZh ? '完整 SOW 範本' : 'Full SOW template'}
        </p>
        <a
          href={SOW_PDF_URL}
          download
          className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-brand-sage-light transition-colors"
        >
          {isZh ? '下載 Pilot SOW PDF (332 KB)' : 'Download Pilot SOW PDF (332 KB)'}
        </a>
      </div>

      <h2>{isZh ? '6 個 deliverables (90 天)' : 'The 6 deliverables (90 days)'}</h2>
      <ol>
        <li>
          <strong>{isZh ? 'ATR 引擎部署' : 'ATR engine deployment'}</strong>{' '}
          {isZh ? '在 Customer VPC / on-prem / airgap (Day 14)' : 'in Customer VPC / on-prem / airgap (Day 14)'}
        </li>
        <li>
          <strong>{isZh ? '客製 ATR 規則包' : 'Custom ATR rule pack'}</strong>{' '}
          {isZh ? '50-100 條規則,目標部署環境量身製作 (Day 21)' : '50-100 rules tagged for the target deployment (Day 21)'}
        </li>
        <li>
          <strong>{isZh ? '範例合規證據包' : 'Sample compliance evidence pack'}</strong>{' '}
          {isZh
            ? 'EU AI Act / NIST AI RMF / ISO 42001 / OWASP Agentic / OWASP LLM 擇一 (Day 35 草稿 → Day 75 最終)'
            : 'one of EU AI Act / NIST AI RMF / ISO 42001 / OWASP Agentic / OWASP LLM (Day 35 draft → Day 75 final)'}
        </li>
        <li>
          <strong>{isZh ? 'SIEM webhook 整合' : 'SIEM webhook integration'}</strong>{' '}
          {isZh
            ? 'Splunk / Elastic / Datadog / Sentinel / Sumo / Chronicle (Day 30)'
            : 'Splunk / Elastic / Datadog / Sentinel / Sumo / Chronicle (Day 30)'}
        </li>
        <li>
          <strong>{isZh ? '資深工程辦公時間' : 'Senior engineering office hours'}</strong>{' '}
          {isZh ? '6 小時 / 週 (90 天合計 78 小時)' : '6 hrs / wk (78 hrs total over 90 days)'}
        </li>
        <li>
          <strong>{isZh ? 'Day 90 結束包' : 'Day-90 exit packet'}</strong>{' '}
          {isZh
            ? '最終發現報告 + Enterprise 範圍方案 + 乾淨退出選項 (Day 86-90)'
            : 'final findings report + Enterprise scoping + clean-exit options (Day 86-90)'}
        </li>
      </ol>

      <h2>{isZh ? 'Founding Customer 定價' : 'Founding Customer pricing'}</h2>
      <p>
        {isZh
          ? '$25,000 USD 僅適用前 3 個 Customer。第 4 個起轉至 Enterprise $250K base ($150K floor、$250-350K target、$500K+ upside)。'
          : '$25,000 USD applies only to the first three Customers. The 4th onwards transitions to Enterprise $250K base ($150K floor, $250-350K target, $500K+ upside).'}
      </p>

      <h2>{isZh ? '付款路徑' : 'Payment paths'}</h2>
      <ul>
        <li>
          <strong>{isZh ? '路徑 A — 信用卡 (Stripe)' : 'Path A — Credit/debit card (Stripe)'}</strong>:{' '}
          {isZh ? '100% 預付,服務從付款日起算' : '100% upfront, service starts on charge'}
        </li>
        <li>
          <strong>{isZh ? '路徑 B — 電匯發票 (Net-30)' : 'Path B — Wire / invoice (Net-30)'}</strong>:{' '}
          {isZh
            ? 'Stripe 開立發票,30 天內電匯 (適合 F500 P-card 上限 > $5K 的採購流程)'
            : 'Stripe-generated invoice, wire within 30 days (suits F500 procurement where P-card limits exclude $25K)'}
        </li>
        <li>
          <strong>{isZh ? '路徑 C — 主權 / 政府' : 'Path C — Sovereign / Government'}</strong>:{' '}
          {isZh ? '依國家採購規則另行範圍劃定' : 'separately scoped per country procurement rules'}
        </li>
      </ul>

      <h2>{isZh ? '相關文件' : 'Related documents'}</h2>
      <ul>
        <li>
          <a href="/legal/msa">{isZh ? '主服務協議 (MSA)' : 'Master Services Agreement'}</a>
        </li>
        <li>
          <a href="/legal/refund">{isZh ? '退費政策' : 'Refund Policy'}</a>
        </li>
        <li>
          <a href="/legal/dpa">{isZh ? '資料處理協議 (DPA)' : 'Data Processing Addendum'}</a>
        </li>
        <li>
          <a href="/evidence-pack">{isZh ? '範例證據包' : 'Sample evidence pack'}</a>
        </li>
        <li>
          <a href="/pricing">{isZh ? '定價' : 'Pricing'}</a>
        </li>
      </ul>
    </article>
  );
}
