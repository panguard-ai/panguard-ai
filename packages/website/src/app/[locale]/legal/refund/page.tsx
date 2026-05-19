import type { Metadata } from 'next';

const REFUND_LAST_UPDATED_EN = 'May 20, 2026';
const REFUND_LAST_UPDATED_ZH = '2026年5月20日';
const REFUND_VERSION = 'v1.0';
const REFUND_PDF_URL = '/legal/03-Refund-Policy.pdf';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'PanGuard AI Pilot refund policy. 7-day no-questions refund, then service-credit options. Founding Customer protections.',
};

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
          {isZh ? 'Pilot 退費政策' : 'Refund Policy — Pilot Engagements'}
        </h1>
      </header>

      <div className="my-6 p-6 bg-surface-1 border border-brand-emerald/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-emerald uppercase tracking-wider mb-2">
          {isZh ? '簡而言之' : 'In one line'}
        </p>
        <p className="text-text-primary">
          {isZh
            ? '結帳後 7 天無條件退費。Day 8 起不退費,除非 PanGuard material breach。'
            : 'Full refund within 7 days of checkout, no questions. After Day 7 no refund except for PanGuard material breach.'}
        </p>
      </div>

      <h2>{isZh ? '7 天無條件退費' : '7-day no-questions refund'}</h2>
      <p>
        {isZh
          ? 'Customer 可在 Effective Date 起 7 個日曆天內取消 Pilot SOW,獲全額 $25,000 USD 退費。'
          : 'Customer may cancel within seven (7) calendar days of the Effective Date and receive a full $25,000 USD refund.'}
      </p>
      <ul>
        <li>
          {isZh
            ? '寄信到 billing@panguard.ai (使用結帳時的 email 地址)'
            : 'Email billing@panguard.ai from the email used at checkout'}
        </li>
        <li>
          {isZh ? '附上 Pilot SOW 編號 (歡迎信內)' : 'Include the Pilot SOW number (provided in welcome email)'}
        </li>
        <li>{isZh ? '不必說明原因' : 'No reason required'}</li>
        <li>
          {isZh
            ? '5 個工作天內以原付款方式退費'
            : 'Refund processed within 5 business days via original payment method'}
        </li>
      </ul>
      <p>
        {isZh
          ? '即使 PanGuard 已開始 service delivery,7 天權利仍然適用。'
          : 'This 7-day right applies even if PanGuard has begun service delivery.'}
      </p>

      <h2>{isZh ? 'Day 7 之後' : 'After Day 7'}</h2>
      <p>
        {isZh
          ? '7 天視窗關閉後,退費 NOT 提供,除非 PanGuard material breach (依 MSA Section 3.3 — 30 天通知未補救)。'
          : 'After the 7-day window closes, refunds are NOT available except for PanGuard material breach (per MSA Section 3.3 — uncured breach within 30 days of written notice).'}
      </p>
      <p>
        {isZh
          ? '這是刻意政策設計:'
          : 'This is a deliberate policy choice:'}
      </p>
      <ul>
        <li>
          {isZh
            ? '$25,000 反映 90 天最多 78 小時資深工程時間 ($300+/小時等價)'
            : '$25,000 reflects up to 78 hours of senior engineering time over 90 days ($300+/hr equivalent)'}
        </li>
        <li>
          {isZh
            ? '7 天視窗存在的目的就是讓 Customer 在 commitment 之前審視 onboarding 品質、安全揭露、與 SOC 2 timeline'
            : 'The 7-day window exists specifically to let Customer audit onboarding quality, security disclosures, and SOC 2 timeline before commitment'}
        </li>
      </ul>

      <h2>{isZh ? '服務 credit 取代退費' : 'Service credits in lieu of refund'}</h2>
      <p>
        {isZh
          ? '若 PanGuard 因 PanGuard 過失而於 Day 90 未交付某項 deliverable,Customer 可選擇下列任一項:'
          : 'If PanGuard fails to deliver a Section 2 deliverable by Day 90 due to PanGuard fault (excluding Customer-caused delays), Customer may elect:'}
      </p>
      <ul>
        <li>
          {isZh ? 'Pilot 延期最多 30 天' : 'Pilot extension up to 30 additional days'}
        </li>
        <li>
          {isZh
            ? 'Enterprise contract 10% 折扣 (與 $25K Founding Customer credit 累加)'
            : 'Enterprise contract 10% discount (additive to $25K Founding Customer credit)'}
        </li>
        <li>
          {isZh
            ? 'Founder 工程時數加 10 小時 (Pilot 期間使用)'
            : 'Additional 10 hours of founder engineering time within the Pilot window'}
        </li>
      </ul>

      <h2>{isZh ? '路徑 B (電匯) 特殊情況' : 'Path B (Wire / Invoice) specifics'}</h2>
      <p>
        {isZh
          ? '電匯路徑下,7 天視窗從 Effective Date (SOW 簽署日) 起算,非從電匯收到日。'
          : 'For Path B Pilots, the 7-day window starts from the Effective Date (SOW signature), not from the wire receipt date.'}
      </p>
      <ul>
        <li>
          {isZh
            ? '7 天內取消但尚未電匯 → PanGuard 撤銷發票,無費用產生'
            : 'Cancel within 7 days BEFORE wiring → PanGuard voids the invoice, no fees owed'}
        </li>
        <li>
          {isZh
            ? '電匯已收到後 7 天內取消 → 透過電匯路徑 10 個工作天內退費'
            : 'Cancel within 7 days AFTER wire receipt → refund via wire within 10 business days'}
        </li>
      </ul>

      <h2>{isZh ? 'Day 90 乾淨退出' : 'Day-90 clean exit'}</h2>
      <p>
        {isZh
          ? '這不是退費機制。Day 90 Customer 可選擇乾淨退出 (SOW Section 11.1)。所有交付物 Customer 保有,30 天資料匯出視窗。'
          : 'This is not a refund mechanism. At Day 90 Customer may elect a clean exit (SOW Section 11.1). All delivered artifacts remain Customer\'s, with a 30-day data export window after exit.'}
      </p>

      <h2>{isZh ? '退費要求' : 'How to request a refund'}</h2>
      <p>
        {isZh
          ? '從結帳時使用的 email 寄信到 ' : 'Email '}
        <a href="mailto:billing@panguard.ai">billing@panguard.ai</a>
        {isZh
          ? '。附上 Pilot SOW 編號。我們會於 1 個工作天內回覆,5 個工作天內處理退費。'
          : ' from the email address used at checkout, including the Pilot SOW number. We respond within 1 business day and process refunds within 5 business days.'}
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
          {isZh ? '下載退費政策 PDF (192 KB)' : 'Download Refund Policy PDF (192 KB)'}
        </a>
      </div>

      <h2>{isZh ? '相關文件' : 'Related documents'}</h2>
      <ul>
        <li>
          <a href="/legal/msa">{isZh ? '主服務協議 (MSA)' : 'Master Services Agreement'}</a>
        </li>
        <li>
          <a href="/legal/sow">{isZh ? 'Pilot SOW 範本' : 'Pilot SOW template'}</a>
        </li>
      </ul>
    </article>
  );
}
