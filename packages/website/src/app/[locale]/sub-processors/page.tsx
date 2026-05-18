import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { LEGAL_LAST_UPDATED, LEGAL_LAST_UPDATED_ZH } from '@/lib/constants';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: 'Sub-processors — Panguard AI',
    description:
      'List of third-party sub-processors that may process Customer Personal Data on behalf of Panguard AI under the Data Processing Agreement.',
    alternates: buildAlternates('/sub-processors', params.locale),
  };
}

interface LocalizedText {
  readonly en: string;
  readonly 'zh-TW': string;
}

interface SubProcessor {
  readonly name: string;
  readonly purpose: LocalizedText;
  readonly location: LocalizedText;
  readonly url: string;
  readonly dpaUrl?: string;
  readonly socUrl?: string;
}

const LOCATION_US: LocalizedText = { en: 'United States', 'zh-TW': '美國' };

const SUB_PROCESSORS: ReadonlyArray<SubProcessor> = [
  {
    name: 'Supabase Inc.',
    purpose: {
      en: 'Workspace database, user authentication, audit logs',
      'zh-TW': '工作區資料庫、使用者身分驗證、稽核日誌',
    },
    location: LOCATION_US,
    url: 'https://supabase.com',
    dpaUrl: 'https://supabase.com/legal/dpa',
    socUrl: 'https://supabase.com/security',
  },
  {
    name: 'Stripe, Inc.',
    purpose: {
      en: 'Billing, payment processing, invoicing',
      'zh-TW': '計費、付款處理、發票開立',
    },
    location: LOCATION_US,
    url: 'https://stripe.com',
    dpaUrl: 'https://stripe.com/legal/dpa',
    socUrl: 'https://stripe.com/docs/security',
  },
  {
    name: 'Vercel Inc.',
    purpose: {
      en: 'Marketing site + customer dashboard hosting (panguard.ai, app.panguard.ai)',
      'zh-TW': '行銷網站與客戶儀表板託管（panguard.ai、app.panguard.ai）',
    },
    location: LOCATION_US,
    url: 'https://vercel.com',
    dpaUrl: 'https://vercel.com/legal/dpa',
    socUrl: 'https://vercel.com/security',
  },
  {
    name: 'Cloudflare, Inc.',
    purpose: {
      en: 'DNS, CDN, DDoS protection, Web Application Firewall',
      'zh-TW': 'DNS、CDN、DDoS 防護、Web 應用程式防火牆',
    },
    location: LOCATION_US,
    url: 'https://cloudflare.com',
    dpaUrl: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    socUrl: 'https://www.cloudflare.com/trust-hub/',
  },
  {
    name: 'Functional Software, Inc. (Sentry)',
    purpose: {
      en: 'Application error monitoring, performance tracing',
      'zh-TW': '應用程式錯誤監控、效能追蹤',
    },
    location: LOCATION_US,
    url: 'https://sentry.io',
    dpaUrl: 'https://sentry.io/legal/dpa/',
    socUrl: 'https://sentry.io/trust/',
  },
  {
    name: 'Anthropic, PBC',
    purpose: {
      en: 'Migrator LLM enrichment at build time only. Customer Data is NOT transmitted at runtime by default; only Sigma / YARA rule text submitted via the Migrator CLI flows through.',
      'zh-TW':
        '僅編譯期使用 LLM 為遷移器（Migrator）規則註解豐富化。預設情況下執行階段不會傳送客戶資料；僅透過 Migrator CLI 提交的 Sigma / YARA 規則文字會經由此服務。',
    },
    location: LOCATION_US,
    url: 'https://anthropic.com',
    dpaUrl: 'https://www.anthropic.com/legal/commercial-terms',
    socUrl: 'https://trust.anthropic.com',
  },
  {
    name: 'Fly.io, Inc.',
    purpose: {
      en: 'Threat Cloud hosting (tc.panguard.ai) where Enterprise customer elects hosted TC',
      'zh-TW': 'Threat Cloud 託管（tc.panguard.ai），供企業客戶選擇使用託管版 TC 時使用',
    },
    location: LOCATION_US,
    url: 'https://fly.io',
    dpaUrl: 'https://fly.io/legal/dpa',
    socUrl: 'https://fly.io/docs/security/',
  },
  {
    name: 'GitHub, Inc.',
    purpose: {
      en: 'Source code hosting, CI/CD workflows, security advisory coordination',
      'zh-TW': '原始碼託管、CI/CD 工作流程、安全公告協調',
    },
    location: LOCATION_US,
    url: 'https://github.com',
    dpaUrl: 'https://docs.github.com/en/site-policy/privacy-policies/github-data-protection-agreement',
    socUrl: 'https://github.com/security',
  },
  {
    name: 'Google LLC (Google Workspace)',
    purpose: {
      en: 'Vendor email (adam@agentthreatrule.org, support@panguard.ai), calendar, documents',
      'zh-TW': '廠商 Email（adam@agentthreatrule.org、support@panguard.ai）、行事曆、文件',
    },
    location: LOCATION_US,
    url: 'https://workspace.google.com',
    dpaUrl: 'https://workspace.google.com/terms/dpa_terms.html',
    socUrl: 'https://workspace.google.com/security/',
  },
];

export default async function SubProcessorsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const isZh = locale === 'zh-TW';

  return (
    <>
      <NavBar />
      <main id="main-content" className="min-h-screen bg-surface-0">
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-sage mb-3">
              {isZh ? '信任 / 法律' : 'Trust / Legal'}
            </p>
            <h1 className="text-3xl font-bold text-text-primary mb-3">
              {isZh ? '次處理者清單' : 'Sub-processors'}
            </h1>
            <p className="text-sm text-text-tertiary">
              {isZh ? '最後更新：' : 'Last updated: '}
              {isZh ? LEGAL_LAST_UPDATED_ZH : LEGAL_LAST_UPDATED}
            </p>
          </header>

          <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
            <section>
              <p>
                {isZh ? (
                  <>
                    本頁列出可能代表 Panguard AI 處理客戶個人資料的第三方次處理者，作為{' '}
                    <Link
                      href="/legal/dpa"
                      className="text-brand-sage hover:text-brand-sage-light underline"
                    >
                      資料處理協議 (DPA)
                    </Link>{' '}
                    第 7 節（次處理者）的附件。
                  </>
                ) : (
                  <>
                    This page lists third-party sub-processors that may process Customer Personal Data
                    on behalf of Panguard AI, as an annex to{' '}
                    <Link
                      href="/legal/dpa"
                      className="text-brand-sage hover:text-brand-sage-light underline"
                    >
                      Section 7 of the Data Processing Agreement
                    </Link>
                    .
                  </>
                )}
              </p>
              <p className="mt-3">
                {isZh
                  ? '我們在新增或更換次處理者前，會至少提前 30 天以書面通知客戶。客戶可基於合理的資料保護理由提出反對；如未於反對日起 30 天內解決，客戶可依 DPA 第 11 節終止主協議而無懲罰。'
                  : 'We provide at least 30 days written notice before adding or replacing a sub-processor. Customers may object on reasonable data-protection grounds; if unresolved within 30 days of objection, the Customer may terminate the master agreement without penalty per DPA Section 11.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                {isZh ? '目前的次處理者' : 'Current Sub-processors'}
              </h2>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left">
                  <thead className="bg-surface-1">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {isZh ? '次處理者' : 'Sub-processor'}
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {isZh ? '用途' : 'Purpose'}
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {isZh ? '地點' : 'Location'}
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {isZh ? '證明' : 'Evidence'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {SUB_PROCESSORS.map((sp) => (
                      <tr key={sp.name} className="hover:bg-surface-1/50 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <a
                            href={sp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-primary font-medium hover:text-brand-sage transition-colors"
                          >
                            {sp.name}
                          </a>
                        </td>
                        <td className="px-4 py-3 align-top text-text-secondary text-xs">
                          {isZh ? sp.purpose['zh-TW'] : sp.purpose.en}
                        </td>
                        <td className="px-4 py-3 align-top text-text-muted text-xs whitespace-nowrap">
                          {isZh ? sp.location['zh-TW'] : sp.location.en}
                        </td>
                        <td className="px-4 py-3 align-top text-xs">
                          <div className="flex flex-col gap-1">
                            {sp.dpaUrl && (
                              <a
                                href={sp.dpaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-sage hover:text-brand-sage-light underline"
                              >
                                DPA
                              </a>
                            )}
                            {sp.socUrl && (
                              <a
                                href={sp.socUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-sage hover:text-brand-sage-light underline"
                              >
                                {isZh ? '安全/SOC 2' : 'Security / SOC 2'}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                {isZh ? '資料處理範圍' : 'Scope of Processing'}
              </h2>
              <p>
                {isZh
                  ? '預設情況下，客戶資料完全在客戶環境內處理（透過 panguard-cli 在本機端執行，或客戶自託管的 Docker 部署）。除非客戶明確選擇加入 Panguard 託管的 Threat Cloud 遙測，否則沒有客戶資料離開客戶基礎設施。遙測（如選擇加入）僅傳輸去識別化的偵測中繼資料（規則 ID、時間戳、雜湊 agent 識別碼），不含內容裝載。'
                  : 'By default, Customer Data is processed entirely within Customer\'s environment (panguard-cli running locally, or Customer-hosted Docker deployment of Threat Cloud). No Customer Data leaves Customer infrastructure unless the Customer explicitly opts into Panguard\'s hosted Threat Cloud telemetry. Telemetry, when opted in, transmits only anonymized detection metadata (rule ID, timestamp, hashed agent identifier) — never payload contents.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                {isZh ? '通知設定' : 'Notification Preferences'}
              </h2>
              <p>
                {isZh ? (
                  <>
                    如要訂閱次處理者異動通知，請寄信至{' '}
                    <a
                      href="mailto:privacy@panguard.ai"
                      className="text-brand-sage hover:text-brand-sage-light underline"
                    >
                      privacy@panguard.ai
                    </a>{' '}
                    並附上你的客戶 workspace 名稱與通知人員清單。
                  </>
                ) : (
                  <>
                    To subscribe to sub-processor change notifications, email{' '}
                    <a
                      href="mailto:privacy@panguard.ai"
                      className="text-brand-sage hover:text-brand-sage-light underline"
                    >
                      privacy@panguard.ai
                    </a>{' '}
                    with your Customer workspace name and notification recipient list.
                  </>
                )}
              </p>
            </section>

            <section className="pt-6 mt-12 border-t border-border">
              <p className="text-xs text-text-muted">
                {isZh ? (
                  <>
                    此清單由 Panguard AI, Inc. 維護。如有疑問，請聯絡{' '}
                    <a
                      href="mailto:privacy@panguard.ai"
                      className="text-brand-sage hover:text-brand-sage-light"
                    >
                      privacy@panguard.ai
                    </a>
                    。完整資料處理條款請參閱{' '}
                    <Link href="/legal/dpa" className="text-brand-sage hover:text-brand-sage-light">
                      資料處理協議
                    </Link>
                    與{' '}
                    <Link
                      href="/legal/privacy"
                      className="text-brand-sage hover:text-brand-sage-light"
                    >
                      隱私權政策
                    </Link>
                    。
                  </>
                ) : (
                  <>
                    This list is maintained by Panguard AI, Inc. Questions to{' '}
                    <a
                      href="mailto:privacy@panguard.ai"
                      className="text-brand-sage hover:text-brand-sage-light"
                    >
                      privacy@panguard.ai
                    </a>
                    . Full data processing terms in the{' '}
                    <Link href="/legal/dpa" className="text-brand-sage hover:text-brand-sage-light">
                      Data Processing Agreement
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/legal/privacy"
                      className="text-brand-sage hover:text-brand-sage-light"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </>
                )}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
