import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';

const SOW_LAST_UPDATED_EN = 'July 10, 2026';
const SOW_LAST_UPDATED_ZH = '2026年7月10日';
const SOW_VERSION = 'v2.0';
const SOW_PDF_URL = '/legal/02-Migrator-Pro-SOW.pdf';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Migrator Pro Statement of Work — Template',
    description:
      'PanGuard AI Migrator Pro SOW template. Annual engagement, sales-led pricing, core onboarding deliverables.',
    alternates: buildAlternates('/legal/sow', locale),
  };
}

export default async function SOWPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  const lastUpdatedLabel = isZh ? '最後更新：' : 'Last updated:';
  const lastUpdatedValue = isZh ? SOW_LAST_UPDATED_ZH : SOW_LAST_UPDATED_EN;

  return (
    <article className="prose-legal">
      <header className="mb-10">
        <p className="text-sm text-text-muted">
          {lastUpdatedLabel} {lastUpdatedValue} · {SOW_VERSION}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">
          {isZh
            ? 'Migrator Pro 服務說明書 (SOW) 範本'
            : 'Migrator Pro Statement of Work — Template'}
        </h1>
      </header>

      <p>
        {isZh
          ? '這是 PanGuard AI Migrator Pro 標準 SOW 範本。每個 Customer 的 SOW 都依此產生，並附上指定 SOW 編號、Customer 名稱、Effective Date 與框架選擇。'
          : 'This is the PanGuard AI Migrator Pro Standard SOW template. Every Customer receives a SOW generated from this template with their assigned SOW number, Customer name, Effective Date, and framework selection.'}
      </p>

      {/* $25K 一次性 Founding Pilot SOW — 自助購買（panguard.ai/scoping） */}
      <div className="my-6 p-6 bg-surface-1 border border-brand-emerald/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-emerald uppercase tracking-wider mb-2">
          {isZh
            ? '$25K 一次性 Founding Pilot SOW（90 天）'
            : '$25K one-time Founding Pilot SOW (90 days)'}
        </p>
        <p className="text-text-primary">
          {isZh
            ? '前 3 家客戶可經 panguard.ai/scoping 自助購買 $25,000 USD 一次性、90 天的 Founding Pilot。交付項目即下方導入交付清單（初步掃描 Day3、ATR 引擎部署、客製 ATR 規則包、SIEM webhook、合規證據包、6 小時/週創辦人工程時間、Day-90 退出包），並享結帳後 7 天無條件退費（見退費政策）。$25K 於 12 個月內簽 Y1 Enterprise 全額抵扣。'
            : 'The first 3 customers can buy a $25,000 USD one-time, 90-day Founding Pilot self-serve at panguard.ai/scoping. Deliverables are the onboarding list below (initial scan on Day 3, ATR engine deployment, custom ATR rule pack, SIEM webhook, compliance evidence pack, 6 hrs/wk founder engineering time, Day-90 exit packet), plus a 7-day no-questions refund after checkout (see Refund Policy). The $25K credits 100% toward a Y1 Enterprise contract signed within 12 months.'}
        </p>
      </div>

      <div className="my-6 p-6 bg-surface-1 border border-brand-sage/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-sage uppercase tracking-wider mb-3">
          {isZh ? '完整 SOW 範本' : 'Full SOW template'}
        </p>
        <a
          href={SOW_PDF_URL}
          download
          className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-brand-sage-light transition-colors"
        >
          {isZh ? '下載 Migrator Pro SOW PDF (166 KB)' : 'Download Migrator Pro SOW PDF (166 KB)'}
        </a>
      </div>

      <h2>{isZh ? '導入交付項目' : 'Onboarding deliverables'}</h2>
      <ol>
        <li>
          <strong>
            {isZh
              ? '初步 ATR 掃描 + 初步發現報告'
              : 'Initial ATR scan + preliminary findings report'}
          </strong>{' '}
          {isZh ? '（Day 3,退費窗內即交付）' : '(Day 3, delivered within the refund window)'}
        </li>
        <li>
          <strong>{isZh ? 'ATR 引擎部署' : 'ATR engine deployment'}</strong>{' '}
          {isZh
            ? '在 Customer VPC / on-prem / airgap (Day 14)'
            : 'in Customer VPC / on-prem / airgap (Day 14)'}
        </li>
        <li>
          <strong>{isZh ? '客製 ATR 規則包' : 'Custom ATR rule pack'}</strong>{' '}
          {isZh
            ? '50-100 條規則，目標部署環境量身製作 (Day 21)'
            : '50-100 rules tagged for the target deployment (Day 21)'}
        </li>
        <li>
          <strong>{isZh ? '範例合規證據包' : 'Sample compliance evidence pack'}</strong>{' '}
          {isZh
            ? 'EU AI Act / NIST AI RMF / ISO 42001 / OWASP Agentic / OWASP LLM 擇一 （Day 35 草稿 → Day 75 最終）'
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
          {isZh ? '6 小時 / 週 （導入期）' : '6 hrs / wk (onboarding phase)'}
        </li>
        <li>
          <strong>{isZh ? '續約包' : 'Renewal packet'}</strong>{' '}
          {isZh
            ? '最終發現報告 + 擴充範圍方案 + 續約選項'
            : 'final findings report + expansion scoping + renewal options'}
        </li>
      </ol>

      <h2>{isZh ? 'Migrator Pro 定價' : 'Migrator Pro pricing'}</h2>
      <p>
        {isZh
          ? 'Migrator Pro 為年約制，$500K–2M / 年（業務洽談定價）。也已內建於 PanGuard Enterprise 方案中。'
          : 'Migrator Pro is an annual engagement, $500K–2M / year (sales-led pricing). It is also bundled inside PanGuard Enterprise.'}
      </p>

      <h2>{isZh ? '付款路徑' : 'Payment paths'}</h2>
      <ul>
        <li>
          <strong>
            {isZh ? '路徑 A — 信用卡 (Stripe)' : 'Path A — Credit/debit card (Stripe)'}
          </strong>
          : {isZh ? '100% 預付，服務從付款日起算' : '100% upfront, service starts on charge'}
        </li>
        <li>
          <strong>
            {isZh ? '路徑 B — 電匯發票 (Net-30)' : 'Path B — Wire / invoice (Net-30)'}
          </strong>
          :{' '}
          {isZh
            ? 'Stripe 開立發票，30 天內電匯 （適合 F500 採購流程，P-card 上限不足以支付六位數費用）'
            : 'Stripe-generated invoice, wire within 30 days (suits F500 procurement where P-card limits exclude six-figure fees)'}
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
