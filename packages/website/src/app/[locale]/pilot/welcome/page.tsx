/**
 * /pilot/welcome?session_id=cs_XXX
 *
 * Stripe Checkout success landing. Stripe redirects here after a card
 * payment completes. The webhook is the source of truth — this page is
 * just the human-friendly UI. By the time the visitor arrives here, the
 * webhook may or may not have fired yet (there's a few-second lag).
 *
 * We DO NOT verify payment server-side here (that's the webhook's job).
 * We just say "thanks, look for the email" and link to the dashboard.
 *
 * Wire-path customers do NOT land here — they land on the Stripe hosted
 * invoice page. That flow has its own welcome experience (Email 0 of the
 * Welcome Sequence is sent on invoice creation).
 */

import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Check, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Welcome to PanGuard Pilot · Day 1 of 90',
  description: 'Pilot checkout complete. Workspace provisioning + welcome email on the way.',
  robots: { index: false, follow: false },
};

interface SearchParams {
  session_id?: string;
  locale?: string;
}

const APP_ORIGIN =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || 'https://app.panguard.ai';

export default async function PilotWelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const isZh = locale === 'zh-TW';

  return (
    <>
      <NavBar />
      <main id="main-content" className="pt-24 pb-16 bg-surface-0 text-text-primary min-h-screen">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand-emerald/15 flex items-center justify-center">
              <Check className="w-7 h-7 text-brand-emerald" />
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold">
              {isZh ? 'Pilot 確認 · Day 1 of 90' : 'Pilot confirmed · Day 1 of 90'}
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-text-primary">
              {isZh ? '歡迎來到 PanGuard Pilot' : 'Welcome to the PanGuard Pilot'}
            </h1>
            <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-xl mx-auto">
              {isZh
                ? '付款收到。90 天 Pilot 計時器啟動。我會在 24 小時內寄一封親簽歡迎信跟 Slack Connect 邀請給你。'
                : 'Payment received. Your 90-day Pilot clock has started. A personally-signed welcome email and Slack Connect invite will arrive within 24 hours.'}
            </p>
          </div>

          {/* Next steps */}
          <section className="mt-12 grid gap-4">
            <Step
              num="01"
              title={isZh ? '檢查你的信箱' : 'Check your inbox'}
              body={
                isZh
                  ? '歡迎信會從 adam@panguard.ai 寄出。如果 5 分鐘內沒收到請看垃圾信。'
                  : "Welcome email sent from adam@panguard.ai. Check spam if it doesn't arrive within 5 minutes."
              }
            />
            <Step
              num="02"
              title={isZh ? '進入 dashboard' : 'Open your dashboard'}
              body={
                isZh
                  ? 'app.panguard.ai 的 magic-link 登入你已經完成。Pilot 進度頁面在 /w/[你的-workspace]/pilot。'
                  : 'Your magic-link login is already done. The Pilot tracker lives at /w/[your-workspace]/pilot.'
              }
              cta={{
                label: isZh ? '前往 dashboard' : 'Go to dashboard',
                href: `${APP_ORIGIN}/w`,
              }}
            />
            <Step
              num="03"
              title={
                isZh
                  ? '回覆我:框架選擇 + 技術 lead + 部署環境'
                  : 'Reply to me: framework, tech lead, environment'
              }
              body={
                isZh
                  ? '我會在 24 小時內主動聯絡。Day 10 前需要鎖定:合規框架(已選)、tech lead 名字、目標部署環境 access。'
                  : "I'll reach out within 24 hours. By Day 10 we need to lock: chosen framework, tech-lead name, target deployment access."
              }
            />
            <Step
              num="04"
              title={isZh ? '7 天無條件退費窗' : '7-day no-questions refund window'}
              body={
                isZh
                  ? '從今天算起 7 天內,任何理由都能 100% 退費。寄信給 billing@panguard.ai 就好。'
                  : 'Through Day 7, full refund for any reason. Email billing@panguard.ai — no explanation needed.'
              }
            />
          </section>

          {/* What you've signed up for */}
          <section className="mt-12 rounded-2xl border border-border bg-surface-1 p-6">
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-3">
              {isZh ? '你買的 6 個 deliverables' : 'The 6 deliverables you signed up for'}
            </p>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <Bullet>{isZh ? 'ATR 引擎部署 (Day 14)' : 'ATR engine deployment (Day 14)'}</Bullet>
              <Bullet>
                {isZh
                  ? '客製 50-100 條 ATR 規則包 (Day 21)'
                  : 'Custom 50-100 rule ATR pack (Day 21)'}
              </Bullet>
              <Bullet>
                {isZh ? 'SIEM webhook 整合 (Day 30)' : 'SIEM webhook integration (Day 30)'}
              </Bullet>
              <Bullet>
                {isZh ? '合規證據包 (Day 75 final)' : 'Compliance evidence pack (Day 75 final)'}
              </Bullet>
              <Bullet>
                {isZh
                  ? '6 hr/週 founder 工程時間 (78 hr 總額)'
                  : '6 hr/wk founder engineering time (78 hr total)'}
              </Bullet>
              <Bullet>
                {isZh
                  ? 'Day 90 結束 packet + 升級/退出決策'
                  : 'Day-90 exit packet + upgrade/exit decision'}
              </Bullet>
            </ul>
            <p className="mt-4 text-xs text-text-muted">
              {isZh ? '完整 SOW: ' : 'Full SOW: '}
              <a href="/legal/sow" className="text-brand-sage hover:underline">
                panguard.ai/legal/sow
              </a>{' '}
              {' · '}
              {isZh ? '退費政策: ' : 'Refund Policy: '}
              <a href="/legal/refund" className="text-brand-sage hover:underline">
                panguard.ai/legal/refund
              </a>
            </p>
          </section>

          {session_id ? (
            <p className="mt-8 text-xs text-text-muted text-center">
              {isZh ? '結帳 session ID: ' : 'Checkout session ID: '}
              <code className="bg-surface-2 px-1.5 py-0.5 rounded text-text-secondary">
                {session_id}
              </code>
            </p>
          ) : null}

          <div className="mt-8 text-center">
            <a
              href="mailto:adam@panguard.ai"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-sage hover:text-brand-sage-light"
            >
              {isZh ? '直接回信給 Adam' : 'Reply directly to Adam'}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Step({
  num,
  title,
  body,
  cta,
}: {
  num: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <p className="text-xs font-mono text-brand-sage shrink-0">{num}</p>
        <div className="flex-1">
          <h3 className="text-text-primary font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary leading-relaxed">{body}</p>
          {cta ? (
            <a
              href={cta.href}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-sage hover:text-brand-sage-light"
            >
              {cta.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
