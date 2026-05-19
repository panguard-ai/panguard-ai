import type { Metadata } from 'next';

const MSA_LAST_UPDATED_EN = 'May 20, 2026';
const MSA_LAST_UPDATED_ZH = '2026年5月20日';
const MSA_VERSION = 'v1.0';
const MSA_PDF_URL = '/legal/01-MSA.pdf';

export const metadata: Metadata = {
  title: 'Master Services Agreement',
  description:
    'PanGuard AI Master Services Agreement. Governs all paid engagements with PanGuard. Delaware C-Corp governing law.',
};

export default async function MSAPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  const lastUpdatedLabel = isZh ? '最後更新:' : 'Last updated:';
  const lastUpdatedValue = isZh ? MSA_LAST_UPDATED_ZH : MSA_LAST_UPDATED_EN;

  return (
    <article className="prose-legal">
      <header className="mb-10">
        <p className="text-sm text-text-muted">
          {lastUpdatedLabel} {lastUpdatedValue} · {MSA_VERSION}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">
          {isZh ? '主服務協議' : 'Master Services Agreement'}
        </h1>
      </header>

      <p>
        {isZh
          ? '此頁面為 PanGuard AI 主服務協議的網頁摘要。完整文件為下方 PDF。Pilot 結帳流程要求 Customer 接受此 MSA。'
          : 'This page summarises the PanGuard AI Master Services Agreement. The authoritative document is the PDF linked below. Pilot checkout requires Customer to accept this MSA.'}
      </p>

      <div className="my-6 p-6 bg-surface-1 border border-brand-sage/40 rounded-xl">
        <p className="text-sm font-semibold text-brand-sage uppercase tracking-wider mb-3">
          {isZh ? '正式 MSA 文件' : 'Authoritative MSA document'}
        </p>
        <a
          href={MSA_PDF_URL}
          download
          className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-brand-sage-light transition-colors"
        >
          {isZh ? '下載 MSA PDF (220 KB)' : 'Download MSA PDF (220 KB)'}
        </a>
        <p className="mt-3 text-xs text-text-muted">
          {isZh
            ? 'SHA-256 與版本歷史維護於 panguard.ai/legal/msa。F500 採購可要求 DocuSign 簽署版本（聯繫 legal@panguard.ai）。'
            : 'SHA-256 hashes and version history maintained at panguard.ai/legal/msa. F500 procurement may request a DocuSign countersigned version (contact legal@panguard.ai).'}
        </p>
      </div>

      <h2>{isZh ? '關鍵條款摘要' : 'Key terms at a glance'}</h2>
      <ul>
        <li>
          <strong>{isZh ? '管轄法' : 'Governing law'}</strong>:{' '}
          {isZh ? 'Delaware (USA)' : 'Delaware, USA'}
        </li>
        <li>
          <strong>{isZh ? '糾紛解決' : 'Dispute resolution'}</strong>:{' '}
          {isZh
            ? '美國仲裁協會 (AAA) 商業仲裁、Wilmington Delaware 進行'
            : 'AAA Commercial Arbitration, Wilmington Delaware'}
        </li>
        <li>
          <strong>{isZh ? '責任上限' : 'Liability cap'}</strong>:{' '}
          {isZh ? '前 12 個月支付的費用' : 'fees paid in the prior 12 months'}
        </li>
        <li>
          <strong>{isZh ? 'IP 歸屬' : 'IP ownership'}</strong>:{' '}
          {isZh
            ? 'PanGuard 保留 PanGuard 素材 · Customer 保留 Customer Data · ATR 維持 MIT'
            : 'PanGuard retains PanGuard Materials · Customer retains Customer Data · ATR remains MIT'}
        </li>
        <li>
          <strong>{isZh ? '保密' : 'Confidentiality'}</strong>:{' '}
          {isZh ? '相互、合理謹慎' : 'mutual, reasonable care'}
        </li>
        <li>
          <strong>{isZh ? '資料處理' : 'Data protection'}</strong>:{' '}
          {isZh ? '依 DPA' : 'governed by the DPA'} (
          <a href="/legal/dpa" className="text-brand-sage">
            /legal/dpa
          </a>
          )
        </li>
        <li>
          <strong>{isZh ? '退費' : 'Refunds'}</strong>:{' '}
          {isZh ? '依退費政策' : 'per the Refund Policy'} (
          <a href="/legal/refund" className="text-brand-sage">
            /legal/refund
          </a>
          )
        </li>
        <li>
          <strong>{isZh ? '次處理者' : 'Sub-processors'}</strong>:{' '}
          {isZh ? '清單 + 30 天變更通知' : 'list + 30-day change notice'} (
          <a href="/sub-processors" className="text-brand-sage">
            /sub-processors
          </a>
          )
        </li>
        <li>
          <strong>{isZh ? '安全' : 'Security'}</strong>:{' '}
          {isZh ? 'SOC 2 Type 1 目標 2026-10-01' : 'SOC 2 Type 1 target 2026-10-01'} (
          <a href="/legal/security" className="text-brand-sage">
            /legal/security
          </a>
          )
        </li>
      </ul>

      <h2>{isZh ? '電子接受' : 'Electronic acceptance'}</h2>
      <p>
        {isZh
          ? 'Customer 在 panguard.ai/pilot 完成結帳並完成付款即構成有約束力的接受。文件 Section 13.9 涵蓋此條款。'
          : 'Customer\'s click of "I accept" at checkout, together with completion of payment, constitutes binding acceptance per MSA Section 13.9.'}
      </p>

      <h2>{isZh ? '相關文件' : 'Related documents'}</h2>
      <ul>
        <li>
          <a href="/legal/dpa">{isZh ? '資料處理協議 (DPA)' : 'Data Processing Addendum (DPA)'}</a>
        </li>
        <li>
          <a href="/sub-processors">{isZh ? '次處理者清單' : 'Sub-processors list'}</a>
        </li>
        <li>
          <a href="/legal/security">{isZh ? '安全白皮書' : 'Security whitepaper'}</a>
        </li>
        <li>
          <a href="/legal/refund">{isZh ? '退費政策' : 'Refund Policy'}</a>
        </li>
        <li>
          <a href="/legal/sow">{isZh ? 'Pilot SOW 範本' : 'Pilot SOW template'}</a>
        </li>
        <li>
          <a href="/legal/responsible-disclosure">
            {isZh ? '弱點揭露政策' : 'Responsible Disclosure'}
          </a>
        </li>
      </ul>

      <h2>{isZh ? '聯絡' : 'Contact'}</h2>
      <p>
        {isZh ? '法律問題' : 'Legal questions'}:{' '}
        <a href="mailto:legal@panguard.ai">legal@panguard.ai</a>
      </p>
    </article>
  );
}
