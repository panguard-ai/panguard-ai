'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { STATS } from '@/lib/stats';

/**
 * Resolve the app origin once, in a way that survives a static export and a
 * Vercel preview deployment. Prefers `NEXT_PUBLIC_APP_URL` (set by the env)
 * and falls back to `https://app.panguard.ai` (production) so the link
 * still works for a user who somehow lands on the marketing site with no
 * env injected (e.g. a stale CDN cache).
 */
const APP_ORIGIN: string =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || 'https://app.panguard.ai';

interface MeResponse {
  workspace?: { id?: string };
}

/**
 * Founding-customer slot badge. Polls /api/pilot/intent?slots=1 (cached
 * 60s) on mount to render "X / 3 slots remaining" next to the Pilot
 * tier title. When exhausted, swaps to a "Slots claimed" warning style.
 */
function FoundingSlotBadge({ isZh }: { isZh: boolean }) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ready'; remaining: number; total: number; exhausted: boolean }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${APP_ORIGIN}/api/pilot/intent?slots=1`, {
          headers: { accept: 'application/json' },
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          slots_remaining: number;
          total_slots: number;
          exhausted: boolean;
        };
        if (!cancelled) {
          setState({
            kind: 'ready',
            remaining: body.slots_remaining,
            total: body.total_slots,
            exhausted: body.exhausted,
          });
        }
      } catch {
        /* leave badge as loading — graceful */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5">
        {isZh ? 'F500 試水' : 'F500 bridge'}
      </span>
    );
  }

  if (state.exhausted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-red-400 bg-red-400/10 border border-red-400/40 rounded-full px-2.5 py-0.5">
        {isZh ? '名額已滿' : 'Slots claimed'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      {state.remaining} / {state.total} {isZh ? '剩餘' : 'left'}
    </span>
  );
}

/**
 * Light-weight auth probe. Asks the app's `/api/me` endpoint (cookie-based
 * session) whether the visitor is signed in and which workspace to bill.
 *
 * Returns `null` while loading so the button can render in a neutral state
 * (no flicker between "Sign in" and "Pay"). On 401 or fetch failure we
 * resolve to `{ authed: false }` and the click handler routes to /login.
 *
 * The app domain is cross-origin from the marketing site, so the fetch
 * must include `credentials: 'include'` to send Supabase's session cookie.
 */
function useAppAuth() {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'guest' } | { status: 'authed'; workspaceId: string | null }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // `/api/me/session` is the cookie-based companion to `/api/me`
        // (which is api_key-only and serves the CLI). The session endpoint
        // returns the user's primary workspace_id from RLS-scoped reads.
        const res = await fetch(`${APP_ORIGIN}/api/me/session`, {
          credentials: 'include',
          headers: { accept: 'application/json' },
        });
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: 'guest' });
          return;
        }
        const body = (await res.json()) as MeResponse;
        const workspaceId = body.workspace?.id ?? null;
        setState({ status: 'authed', workspaceId });
      } catch {
        if (!cancelled) setState({ status: 'guest' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Pricing page — 2-tier + Standards governance (no middle tier).
 *
 * Strategic choice: solo-founder + AI agent security + ATR moat means
 * classic Team/Business tiers are a trap. We ship:
 *   - Community $0 unlimited (sensor network)
 *   - Pilot $25K / 90d (F500 bridge)
 *   - Enterprise $150K-500K/yr (real revenue)
 *   - ATR Standards Organization (independent governance)
 * Middle tier is intentionally absent — explained in the "Why no middle tier" section.
 */

export default function PricingContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const auth = useAppAuth();

  // Pilot CTA — sends ALL visitors (signed-in or not) to the scoping form
  // at /scoping. F500 procurement is conservative: every Pilot buyer must
  // submit scoping answers + accept MSA/DPA/Refund first, then sign up via
  // magic link, THEN reach Stripe Checkout. Founding Customer cap (3) is
  // enforced at both the scoping POST and the checkout-session creation.
  const [pilotBusy, setPilotBusy] = useState(false);
  const [pilotError, setPilotError] = useState<string | null>(null);

  const onPilotClick = useCallback(() => {
    setPilotError(null);
    setPilotBusy(true);
    // Marketing site is the host — relative path keeps us on the same
    // origin, no CORS, no auth round-trip. The scoping page handles
    // founding-3 cap display + form + magic-link signup before any
    // Stripe interaction.
    window.location.href = '/scoping';
  }, []);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative min-h-[48vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '定價' : 'PRICING'}
            </p>
            <h1 className="text-[clamp(28px,5vw,56px)] font-extrabold leading-[1.06] tracking-tight text-text-primary max-w-3xl mx-auto">
              {isZh ? (
                <>
                  <span className="text-brand-sage">免費</span>給社群,
                  <br className="sm:hidden" />
                  <span className="text-brand-sage">認真</span>給 F500
                </>
              ) : (
                <>
                  <span className="text-brand-sage">Free</span> for the community,{' '}
                  <br className="sm:hidden" />
                  <span className="text-brand-sage">serious</span> for F500
                </>
              )}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="text-base sm:text-lg text-text-secondary max-w-3xl mx-auto mt-6 leading-[1.85] space-y-3">
              {isZh ? (
                <>
                  <p>三條商業軌道,對應三種不同的客戶與付費理由。</p>
                  <ul className="space-y-2 text-left max-w-2xl mx-auto">
                    <li>
                      <span className="text-text-primary font-semibold">Community(永久免費)</span>
                      ——全球 sensor 網路與標準擴散管道,不是收入來源。今天可用。
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Pilot ($25K / 90 天)</span>
                      ——Design partner engagement。ATR 規則作者本人陪您部署。今天可用。
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Enterprise</span>
                      ——目前 <span className="text-amber-400 font-semibold">暫停</span>,等 3 項工程
                      ship 完 (Q3 2026) 重開。
                    </li>
                  </ul>
                  <p className="text-sm text-text-muted pt-2">
                    Sovereign tier 已從 /pricing 移除——尚未 ship 對應基礎建設。Brief 仍在{' '}
                    <a
                      href="https://sovereign-ai-defense.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-sage underline decoration-brand-sage/40 hover:decoration-brand-sage"
                    >
                      sovereign-ai-defense
                    </a>
                    。Vendor OEM 軌道規劃中。完整理由見{' '}
                    <a
                      href="https://github.com/panguard-ai/panguard-ai/blob/main/docs/HONESTY.md"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-sage underline decoration-brand-sage/40 hover:decoration-brand-sage"
                    >
                      HONESTY.md
                    </a>
                    。
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Three commercial tracks today, mapped to three distinct customer types and
                    reasons to pay.
                  </p>
                  <ul className="space-y-2 text-left max-w-2xl mx-auto">
                    <li>
                      <span className="text-text-primary font-semibold">
                        Community (free forever)
                      </span>{' '}
                      — global sensor network and standards adoption pipeline, not a revenue stream.
                      Ships today.
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">
                        Pilot ($25K / 90 days)
                      </span>{' '}
                      — design partner engagement. The maintainer of ATR personally deploys. Ships
                      today.
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Enterprise</span> —
                      currently <span className="text-amber-400 font-semibold">paused</span>,
                      reopens after 3 engineering items ship (Q3 2026).
                    </li>
                  </ul>
                  <p className="text-sm text-text-muted pt-2">
                    Sovereign tier removed from /pricing — the underlying infrastructure (airgap
                    installer, multi-tenant Threat Cloud) is not yet built. Positioning brief
                    remains live at{' '}
                    <a
                      href="https://sovereign-ai-defense.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-sage underline decoration-brand-sage/40 hover:decoration-brand-sage"
                    >
                      sovereign-ai-defense
                    </a>
                    . Vendor OEM track in design. Full rationale in{' '}
                    <a
                      href="https://github.com/panguard-ai/panguard-ai/blob/main/docs/HONESTY.md"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-sage underline decoration-brand-sage/40 hover:decoration-brand-sage"
                    >
                      HONESTY.md
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 bg-brand-sage/10 border border-brand-sage/30 rounded-full px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
                <span className="text-xs font-semibold text-brand-sage">
                  {isZh ? 'Community + Pilot 今天可用' : 'Community + Pilot ship today'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-400">
                  {isZh ? 'Enterprise 暫停 · Q3 2026 重開' : 'Enterprise paused · reopens Q3 2026'}
                </span>
              </span>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ─── 3 tiers (Community / Pilot / Enterprise-paused). Sovereign removed — see docs/HONESTY.md §7. ─── */}
      <SectionWrapper>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Community */}
          <FadeInUp>
            <div className="bg-surface-2 rounded-xl border border-brand-sage/30 p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Community 社群版' : 'Community'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
                  {isZh ? '今天可用' : 'Available today'}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-text-primary">$0</span>
                <span className="text-xs text-text-muted">
                  {isZh ? '永久免費 · MIT' : 'forever · MIT'}
                </span>
              </div>

              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mt-4 mb-1">
                {isZh ? '給誰' : 'Who it’s for'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? '個人開發者、小團隊，以及任何想自架完整 7 層 PanGuard 堆疊的組織。功能與 Enterprise 完全相同——差別在自架部署與社群支援。'
                  : 'Individual developers, small teams, and any organisation that wants to self-host the full 7-layer PanGuard stack. Feature parity with Enterprise — only difference is self-hosted deployment and community support.'}
              </p>

              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        `${STATS.atrRules} 條 ATR 偵測規則(MIT 授權)`,
                        '無 agent / endpoint / tenant 數量上限',
                        '5 層今天已上線:L2 稽核 · L3 防護 · L4 偵測 · L5 誘捕 · L6 反應',
                        '2 層 2026 Q2/Q3 補:L1 探索 · L7 治理',
                        'Threat Cloud 感測器自動註冊 · 匿名遙測(可隨時停用)',
                        'Threat Cloud 規則更新(< 24 小時)',
                        'GitHub Issues + Discord 社群支援',
                        'pga CLI:scan · audit · up · guard · status · sensor',
                      ]
                    : [
                        `${STATS.atrRules} ATR detection rules (MIT licensed)`,
                        'Unlimited agents / endpoints / tenants',
                        '5 layers shipped today: L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond',
                        '2 layers coming Q2/Q3 2026: L1 Discover · L7 Govern',
                        'Auto-registers as Threat Cloud sensor · anonymous telemetry (opt-out anytime)',
                        'Threat Cloud rule updates (< 24h)',
                        'Community support via GitHub Issues + Discord',
                        'pga CLI: scan · audit · up · guard · status · sensor',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '立即安裝' : 'Install now'} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </FadeInUp>

          {/* Pilot */}
          <FadeInUp delay={0.08}>
            <div className="bg-surface-2 rounded-xl border border-amber-400/30 p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Pilot 試點' : 'Pilot'}
                </h3>
                <FoundingSlotBadge isZh={isZh} />
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-text-primary">$25K</span>
                <span className="text-xs text-text-muted">{isZh ? '/ 90 天' : '/ 90 days'}</span>
              </div>

              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 mt-4 mb-1">
                {isZh
                  ? '給誰 · Design Partner · 限前 3 名'
                  : "Who it's for · Design Partner · first 3 only"}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? '90 天 design-partner engagement。由 ATR 標準維護者本人陪您團隊把規則部署進環境、寫合規 evidence、調 SOC 告警。不是 SaaS 訂閱、不是 white-glove enterprise 交付——是「規則作者親手導入」。$25K 全額抵入 Y1 Enterprise (12 個月內升級有效),前 3 名適用;第 4 名起改 Enterprise sales-led tier ($250K 起)。簽約前請先讀 '
                  : "A 90-day design-partner engagement. The maintainer of ATR personally deploys the rules into your environment, writes the compliance evidence, and tunes SOC alerts with your team. Not a SaaS subscription, not white-glove enterprise delivery — it is the rules' author doing the deployment by hand. $25K credits 100% toward a Y1 Enterprise contract (within 12 months), first 3 only; customer 4 onwards moves to the sales-led Enterprise tier ($250K base). Before signing, read "}
                <a
                  href="https://github.com/panguard-ai/panguard-ai/blob/main/docs/HONESTY.md#4-what-the-25k-pilot-actually-buys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 underline decoration-amber-400/40 hover:decoration-amber-400 underline-offset-2"
                >
                  HONESTY.md §4
                </a>
                {isZh
                  ? '——清楚列出這 $25K 真的買到什麼、買不到什麼。'
                  : ' — it spells out exactly what $25K buys and what it does not.'}
              </p>

              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        '由 ATR 規則作者本人到您環境部署 (不是 CS 代理、不是外包)',
                        '每週約 6 小時 founder/senior engineer 時間,跟您團隊排程',
                        '1-3 條為您環境客製的 ATR 規則 (可選擇回流 upstream,被 Cisco / Microsoft 採用)',
                        '一份真實合規 evidence pack (ISO 27001 / SOC 2 / NIST AI RMF / EU AI Act / 台灣 TCSA,擇一)',
                        'On-prem / VPC / airgap 部署協助',
                        'SIEM webhook 整合樣板 (Splunk / Wazuh / MISP 等)',
                        'LLM token 全包 (~$200/月,我們吃成本);偵測本身 0% 依賴 LLM',
                        '$25K 全額 credit 到 Y1 Enterprise (12 個月內升級有效;不升級不 clawback)',
                        '7 天無條件退款 (見 /legal/refund)',
                      ]
                    : [
                        'The author of ATR deploys into your environment (not a CS rep, not a contractor)',
                        '~6 hours/week of founder/senior engineering time, scheduled with your team',
                        '1–3 custom ATR rules tailored to your environment (optionally flow upstream and ship via Cisco / Microsoft)',
                        'One real compliance evidence pack — pick one framework (ISO 27001 / SOC 2 / NIST AI RMF / EU AI Act / Taiwan TCSA)',
                        'On-prem / VPC / airgap deployment help',
                        'SIEM webhook integration sample (Splunk / Wazuh / MISP, etc.)',
                        'LLM tokens fully included (~$200/mo, we eat the cost); detection itself runs 0% on LLM',
                        '$25K credits 100% toward Y1 Enterprise (within 12 months; no clawback if you do not upgrade)',
                        '7-day no-questions refund (see /legal/refund)',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={onPilotClick}
                disabled={pilotBusy || auth.status === 'loading'}
                className="inline-flex items-center justify-center gap-2 w-full bg-amber-400/10 border border-amber-400/40 text-amber-400 hover:bg-amber-400/20 font-semibold rounded-lg py-3 transition-all duration-200 active:scale-[0.98] text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pilotBusy
                  ? isZh
                    ? '前往 Stripe...'
                    : 'Redirecting to Stripe...'
                  : isZh
                    ? 'Start Pilot ($25K / 90 天)'
                    : 'Start Pilot ($25K / 90d)'}{' '}
                <ArrowRight className="w-4 h-4" />
              </button>
              {pilotError ? (
                <p className="mt-2 text-[11px] text-red-400 text-center">
                  {isZh ? '結帳失敗:' : 'Checkout failed:'} {pilotError}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] text-text-muted text-center">
                {isZh ? '需要客製合約？' : 'Need a custom contract instead?'}{' '}
                <Link href="/contact?tier=pilot" className="text-amber-400 hover:underline">
                  {isZh ? '改寄信洽詢' : 'Email sales'}
                </Link>
              </p>
            </div>
          </FadeInUp>

          {/* Enterprise — paused, waitlist only. Reopens after 3 engineering items ship (Q3 2026):
              (1) Guard live rule reload, (2) panguard-manager JSON->SQLite, (3) 1-framework auto-gen.
              Until then, selling at $150-500K when delivery scope = Pilot is dishonest. See docs/HONESTY.md §5. */}
          <FadeInUp delay={0.16}>
            <div className="bg-surface-2 rounded-xl border border-amber-400/40 p-7 flex flex-col h-full ring-1 ring-amber-400/10">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Enterprise 企業版' : 'Enterprise'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/40 rounded-full px-2.5 py-0.5">
                  {isZh ? '暫停 · Waitlist' : 'Paused · Waitlist'}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-text-muted line-through decoration-2 decoration-text-muted/60">
                  $150K+
                </span>
                <span className="text-xs text-amber-400 font-semibold">
                  {isZh ? '重開時間 Q3 2026' : 'Reopens Q3 2026'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                {isZh ? '等 3 個工程項目 ship 完才重開' : 'Reopens after 3 engineering items ship'}
              </p>

              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 mt-4 mb-1">
                {isZh ? '為什麼暫停' : 'Why this is paused'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? '對程式碼做了完整稽核後,Enterprise tier 的差異化能力 (live rule reload、multi-endpoint fleet、auto-generated compliance evidence) 尚未 ship。在這 3 件未到位前用 $150-500K 賣等同於把 Pilot 加價 6-20 倍,我們不做這個。Pilot ($25K) 是目前唯一誠實的商業入口。'
                  : 'After a full code audit, the differentiation that justifies Enterprise tier pricing (live rule reload, multi-endpoint fleet management, auto-generated signed compliance evidence) is not yet shipping. Selling at $150-500K before these are in place would be a 6-20× markup on the Pilot scope. The Pilot ($25K) is the only honest commercial entry today.'}
              </p>

              <div className="my-7 flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh
                    ? '重開前要 ship 的 3 件'
                    : 'Three items shipping before Enterprise reopens'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'Guard live rule reload (SIGHUP + fsnotify,消除 5-30s 偵測空窗) — 3-5 天',
                        'panguard-manager 由 JSON 升 SQLite + multi-endpoint fleet auth — 1-2 週',
                        '單一 framework 合規 evidence auto-generator (SOC 2 優先) — 2-3 週',
                      ]
                    : [
                        'Guard live rule reload (SIGHUP + fsnotify, removes 5-30s zero-detection window) — 3-5 days',
                        'panguard-manager JSON → SQLite + multi-endpoint fleet auth — 1-2 weeks',
                        'Single-framework compliance evidence auto-generator (SOC 2 first) — 2-3 weeks',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                      <span className="text-[13px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-[12px] text-text-muted leading-[1.85] mt-5">
                  {isZh ? '完整理由與工程細節見 ' : 'Full rationale and engineering details: '}
                  <a
                    href="https://github.com/panguard-ai/panguard-ai/blob/main/docs/HONESTY.md#5-the-enterprise-tier-is-currently-paused-waitlist-only"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 underline decoration-amber-400/40 hover:decoration-amber-400 underline-offset-2"
                  >
                    HONESTY.md §5
                  </a>
                  {isZh ? '。' : '.'}
                </p>
              </div>

              <Link
                href="/contact?tier=enterprise-waitlist"
                className="inline-flex items-center justify-center gap-2 w-full bg-amber-400/10 border border-amber-400/40 text-amber-400 hover:bg-amber-400/20 font-semibold rounded-lg py-3 transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '加入 Waitlist' : 'Join Waitlist'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>

          {/* Sovereign card removed from /pricing — moved to /research as forward-looking brief.
              Rationale: no closed sovereign deal, no airgap installer, no multi-tenant Threat Cloud.
              Pricing a $5-20M tier in the same grid as a $25K Pilot when the infrastructure does
              not exist creates the wrong signal. See docs/HONESTY.md §7. */}
        </div>

        {/* Founding-5 F500 callout removed — program retired with zero contracts signed.
            Will return when Enterprise tier reopens (Q3 2026). See docs/HONESTY.md §6. */}

        {/* Honesty pointer — single source of truth for what is real vs aspirational */}
        <FadeInUp delay={0.35}>
          <div className="mt-6 max-w-4xl mx-auto border border-amber-400/30 bg-amber-400/5 rounded-xl p-6">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              {isZh ? '簽約前請先讀這份' : 'Read this before signing'}
            </p>
            <p className="text-sm text-text-secondary leading-[1.85]">
              {isZh
                ? '我們是早期、小團隊、開源資安公司。本頁三個 tier 各自有「今天交付得到」與「在做、還沒到」的東西。Enterprise 目前暫停、Sovereign 已從 pricing 拿掉,原因都在 HONESTY.md 裡寫清楚。'
                : 'We are an early-stage, small, open-source security company. The three tiers on this page each include things shipping today and things still in flight. Enterprise is paused; Sovereign has been removed from /pricing entirely — full rationale in HONESTY.md.'}{' '}
              <a
                href="https://github.com/panguard-ai/panguard-ai/blob/main/docs/HONESTY.md"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 underline decoration-amber-400/40 hover:decoration-amber-400 underline-offset-2 font-medium"
              >
                {isZh
                  ? 'HONESTY.md 把兩者逐項列清楚'
                  : 'HONESTY.md lists exactly what is shipping today vs in flight vs intentionally not yet built'}
              </a>
              {isZh
                ? '。若 pricing 頁任何文字跟 HONESTY.md 衝突,以 HONESTY.md 為準。'
                : '. If anything on this page contradicts HONESTY.md, the doc wins.'}
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ─── ENTERPRISE — 完整規格 ─── */}
      <SectionWrapper id="enterprise-spec" className="border-t border-border">
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? 'Enterprise 完整規格' : 'ENTERPRISE — FULL SPECIFICATION'}
            title={
              isZh
                ? 'Enterprise 方案的三大模組與平台基礎設施'
                : 'Three core modules plus included platform infrastructure'
            }
            subtitle={
              isZh
                ? '以下是 Enterprise 方案下提供的完整內容。三大核心模組各自獨立可用，平台基礎設施隨方案一併提供。'
                : 'The full content covered by the Enterprise plan. Each core module stands on its own; platform infrastructure is bundled with the contract.'
            }
          />

          {/* Module 1 */}
          <FadeInUp delay={0.05}>
            <div className="mt-12 bg-surface-2 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-2">
                {isZh ? '模組一 · Migrator Pro' : 'Module 1 · Migrator Pro'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-tight">
                {isZh
                  ? '把過去 20 年累積的 SOC 偵測知識，自動銜接成 AI Agent 防護規則。'
                  : 'Bridge two decades of accumulated SOC detection IP into AI agent defense rules — automatically.'}
              </h3>
              <div className="space-y-4 text-[14px] text-text-secondary leading-[1.85]">
                <p>
                  {isZh
                    ? '銀行、醫院、半導體廠的 SOC 累積了大量 Sigma、YARA、Snort、Splunk 查詢，以及 CVE 對應規則。這些規則本身抓不到 prompt injection 或 tool poisoning，但底層的攻擊知識依然有效——SQL injection 沒消失，只是搬進了 tool call；命令注入沒消失，只是換了載體。'
                    : "Banks, hospitals, and semiconductor SOCs have built up large libraries of Sigma, YARA, Snort, Splunk queries, and CVE mappings. These rules don't directly catch prompt injection or tool poisoning, but the attack knowledge underneath still applies — SQL injection didn't vanish, it moved into tool calls; command injection didn't vanish, it changed substrate."}
                </p>
                <p>
                  {isZh
                    ? 'Migrator Pro 把 15 種來源格式自動轉換為 ATR 行為層規則，並補上一份可直接送進稽核流程的合規證據包。'
                    : 'Migrator Pro converts 15 source formats into ATR behavioral rules automatically, with a compliance evidence pack ready for auditors.'}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '支援的來源格式（共 15 種）' : 'Supported source formats (15 total)'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[13px] text-text-secondary font-mono">
                  {[
                    'Sigma',
                    'Splunk SPL',
                    'Elastic EQL',
                    'YARA',
                    'Snort',
                    'Falco',
                    'Semgrep',
                    'CodeQL',
                    'CVE-NVD',
                    'GHSA',
                    'OSV',
                    'CISA KEV',
                    'NVIDIA garak',
                    'Microsoft PyRIT',
                    'promptfoo',
                  ].map((f) => (
                    <span key={f} className="bg-surface-1 rounded px-2 py-1 text-center">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '附帶能力' : 'Capabilities included'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'LLM 與人工聯合精修，品質達到 Cisco 已合併 PR 的水準',
                        '五大合規框架自動對照：EU AI Act、NIST AI RMF、ISO/IEC 42001、OWASP Agentic、OWASP LLM Top 10',
                        '稽核證據包附 SHA-256 與 Merkle tree 簽章',
                        '6 分頁 Web Dashboard、地端部署',
                        '客戶貢獻的規則可回流到 ATR 上游，被 Cisco、Microsoft 等下游廠商採用',
                      ]
                    : [
                        'Joint LLM and human refinement at the quality level of Cisco-merged PRs',
                        'Auto-mapping to five compliance frameworks: EU AI Act, NIST AI RMF, ISO/IEC 42001, OWASP Agentic, OWASP LLM Top 10',
                        'Audit evidence packs signed with SHA-256 and Merkle tree',
                        '6-tab Web Dashboard with on-prem deployment',
                        'Customer-contributed rules can flow back upstream into ATR and be adopted by Cisco, Microsoft, and other downstream vendors',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <span className="text-[14px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeInUp>

          {/* Module 2 */}
          <FadeInUp delay={0.1}>
            <div className="mt-6 bg-surface-2 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-2">
                {isZh
                  ? '模組二 · AI Compliance Audit Evidence Module'
                  : 'Module 2 · AI Compliance Audit Evidence Module'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-tight">
                {isZh
                  ? '產出可被稽核員直接採用的合規證據——這是 Vanta、Drata 在架構上做不到的能力。'
                  : 'Produce compliance evidence auditors can use directly — a capability Vanta and Drata cannot architecturally deliver.'}
              </h3>
              <div className="space-y-4 text-[14px] text-text-secondary leading-[1.85]">
                <p>
                  {isZh
                    ? '每筆偵測事件都對應到具體的 ATR 規則 ID，並串連六大框架的條文：EU AI Act、Colorado AI Act、NIST AI RMF、ISO/IEC 42001、OWASP Agentic Top 10、OWASP LLM Top 10。報告為 PDF 與 JSON 雙格式輸出，附 SHA-256 與 Merkle tree 簽章。'
                    : 'Each detection event is mapped to a specific ATR rule ID and threaded across articles in six frameworks: EU AI Act, Colorado AI Act, NIST AI RMF, ISO/IEC 42001, OWASP Agentic Top 10, and OWASP LLM Top 10. Reports are delivered in PDF and JSON, signed with SHA-256 and Merkle tree.'}
                </p>
                <p>
                  {isZh
                    ? '為什麼 Vanta、Drata 做不到：他們沒有自家 detection engine，也沒有 ATR 標準作為偵測層。Lakera、Apono 則缺乏完整堆疊。PanGuard 是目前唯一能把「偵測事件 → ATR 規則 → 合規條文」一條線串起來的方案。'
                    : 'Why Vanta and Drata cannot do this: they have no in-house detection engine, and they do not own ATR as the detection layer underneath. Lakera and Apono lack the full stack. PanGuard is the only product today that threads detection event → ATR rule → compliance article as a single audit-ready artefact.'}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '已上線能力' : 'Shipped capabilities'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'NIST AI RMF 100% 規則覆蓋（1,566 個 mapping，於 ATR v2.1.0 上線）',
                        'EU AI Act Article 9、12、14、15、50 自動對照',
                        '季度合規報告：每筆偵測 → ATR 規則 ID → 六大框架條文',
                        'PDF 與 JSON 雙格式，SHA-256 與 Merkle tree 不可竄改簽章',
                      ]
                    : [
                        'NIST AI RMF 100% rule coverage (1,566 mappings, shipped in ATR v2.1.0)',
                        'EU AI Act Articles 9, 12, 14, 15, and 50 auto-mapped',
                        'Quarterly compliance reports threading detection event → ATR rule ID → 6-framework articles',
                        'Tamper-evident PDF + JSON outputs signed with SHA-256 and Merkle tree',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <span className="text-[14px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeInUp>

          {/* Module 3 */}
          <FadeInUp delay={0.15}>
            <div className="mt-6 bg-surface-2 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-2">
                {isZh
                  ? '模組三 · ATR 標準維護方直線關係'
                  : 'Module 3 · Direct line to the ATR standards maintainer'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-tight">
                {isZh
                  ? '客戶不是被動採用標準，而是直接參與 ATR 的演進。'
                  : "Customers don't passively adopt the standard — they participate in shaping ATR's roadmap."}
              </h3>
              <div className="space-y-4 text-[14px] text-text-secondary leading-[1.85]">
                <p>
                  {isZh
                    ? '客戶可在 draft 規則公開前 30 天即取得，便於在攻擊曝光前完成內部部署測試。客戶在 Migrator 中精修出來的規則，也可以選擇回流到 ATR 上游——一旦 merge，這些規則會被 Cisco AI Defense、Microsoft AGT 等下游廠商共同採用，等於把貴公司的偵測知識資產推廣到整個生態系。'
                    : 'Customers receive draft rules 30 days before public release, allowing internal deployment testing before attacks become public. Rules refined inside Migrator can also be sent back upstream — once merged into ATR, those rules ship across the ecosystem to Cisco AI Defense, Microsoft AGT, and others, effectively distributing your detection IP across the industry.'}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '直線關係內容' : 'What the relationship includes'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'Draft 規則公開前 30 天即可取得',
                        '客戶貢獻規則的回流機制：可被 Cisco、Microsoft 等下游廠商採用',
                        '優先規則更新 SLA：4 小時內（Community 為 24 小時內）',
                        'Roadmap 投票權與季度高階主管 review',
                      ]
                    : [
                        'Early access to draft rules 30 days before public release',
                        'Upstream contribution path: customer rules can be adopted by Cisco, Microsoft, and other downstream vendors',
                        'Priority rule update SLA within 4 hours (Community SLA is within 24 hours)',
                        'Roadmap vote and quarterly executive review',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <span className="text-[14px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeInUp>

          {/* Platform infrastructure */}
          <FadeInUp delay={0.2}>
            <div className="mt-6 bg-surface-1 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                {isZh ? '一併提供的平台基礎設施' : 'Platform infrastructure (included)'}
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {(isZh
                  ? [
                      'Agents、tenants、seats、sites 完全無上限',
                      'On-prem、VPC、airgap 部署',
                      'SAML SSO、SCIM、SIEM webhook、稽核日誌匯出',
                      'AIAM（agent identity、scope、delegation）—— 預計 2026 Q3 上線',
                      'F500 Logo 計畫，與 Cisco、Microsoft、NVIDIA 生態系 co-sell',
                      '專屬 Customer Success Manager',
                      'PanGuard Inc. SOC 2 Type 1 認證進行中（目標 2026 Q3）',
                      'SOC 2 Type II 目標 2027 H2',
                    ]
                  : [
                      'Truly unlimited agents, tenants, seats, and sites',
                      'On-prem, VPC, and airgap deployment',
                      'SAML SSO, SCIM, SIEM webhook, audit log export',
                      'AIAM — agent identity, scope, and delegation (target Q3 2026)',
                      'F500 Logo program; co-sell with Cisco, Microsoft, and NVIDIA ecosystem',
                      'Dedicated Customer Success Manager',
                      'PanGuard Inc. SOC 2 Type 1 in flight (target Q3 2026)',
                      'SOC 2 Type II target H2 2027',
                    ]
                ).map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                    <span className="text-[13px] text-text-secondary leading-[1.85]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── Sovereign National Reference Track section removed from /pricing ───
          Per docs/HONESTY.md §7: no closed sovereign deal, no airgap installer,
          no multi-tenant Threat Cloud. Path 1 (free standards citation) and Path 2
          (free 90-day technical co-eval) remain real and live — but live as forward
          positioning at sovereign-ai-defense.vercel.app, not as /pricing line items.
          Path 3 commercial flows via vendor partner channel when ATR-integrated
          products (Cisco AI Defense, Microsoft AGT) reach nation-scale deployment.

          Short forward pointer for visitors who land here looking for sovereign
          context: */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-brand-sage uppercase tracking-wider mb-3">
            {isZh ? '尋找 Sovereign AI 資訊?' : 'Looking for Sovereign AI information?'}
          </p>
          <p className="text-sm text-text-secondary leading-[1.85]">
            {isZh
              ? '主權級部署所需的基礎建設 (airgap installer、multi-tenant Threat Cloud) 尚未 ship,因此 Sovereign tier 已從 /pricing 移除。我們的主權 AI 立場與 Path 1 標準引用、Path 2 技術聯合驗證的開放管道,完整放在 sovereign-ai-defense brief。商業合約 (Path 3) 走 vendor partner 通道 (Cisco / Microsoft) 落地。'
              : 'The infrastructure for sovereign deployment (airgap installer, multi-tenant Threat Cloud) is not yet shipping, so the Sovereign tier has been removed from /pricing. Our sovereign-AI positioning, along with the open-channel Path 1 (standards citation) and Path 2 (technical co-eval), lives in the sovereign-ai-defense brief. Commercial (Path 3) flows via vendor partner channel (Cisco / Microsoft).'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="https://sovereign-ai-defense.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sage border border-brand-sage/40 hover:bg-brand-sage/10 rounded-full px-4 py-2 transition-colors"
            >
              {isZh ? '完整 Sovereign AI Defense brief' : 'Full Sovereign AI Defense brief'}{' '}
              <ArrowRight className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/panguard-ai/panguard-ai/blob/main/docs/HONESTY.md#7-the-sovereign-520m-tier--removed-from-pricing-kept-as-forward-brief"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted border border-border hover:border-text-secondary rounded-full px-4 py-2 transition-colors"
            >
              {isZh
                ? '為什麼從 pricing 拿掉 (HONESTY.md §7)'
                : 'Why removed from pricing (HONESTY.md §7)'}
            </a>
          </div>
        </div>
      </SectionWrapper>

      {/* ─── Vendor OEM License Track ─── */}
      <SectionWrapper dark>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? '平台廠商 OEM 授權' : 'VENDOR OEM LICENSE'}
            title={
              isZh
                ? '在自家 AI 安全產品中內建 ATR Pro Rule Pack'
                : 'Ship ATR Pro Rule Pack inside your AI security product'
            }
            subtitle={
              isZh
                ? 'Cisco AI Defense 已採用全部 419 條 ATR 規則；Microsoft AGT 採用 287 條並啟用每週自動同步；NVIDIA garak、Gen Digital Sage、IBM mcp-context-forge 的整合正在進行中。若貴公司的產品需要精修到 Cisco 已合併 PR 品質的版本——包含 draft 規則的早期存取、五大框架合規 metadata，以及白標部署——OEM tier 是為這個情境設計的方案。'
                : 'Cisco AI Defense ships all 330 ATR rules. Microsoft AGT ships 287 rules with weekly auto-sync. NVIDIA garak, Gen Digital Sage, and IBM mcp-context-forge integrations are in flight. For vendors who need the Cisco-merge-PR-quality enriched version — early access to draft rules, five-framework compliance metadata, white-label deployment — the OEM tier is purpose-built for that scenario.'
            }
          />

          <FadeInUp delay={0.1}>
            <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary mb-2">
                  {isZh ? 'OEM Use License' : 'OEM Use License'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold text-text-primary">$2–10M</span>
                  <span className="text-xs text-text-muted">/ {isZh ? '年' : 'year'}</span>
                </div>
                <p className="text-[13px] text-text-secondary leading-[1.85] mb-4">
                  {isZh
                    ? '提供給 Cisco、Microsoft、NVIDIA、Gen Digital 等級的廠商，把已精修的 Pro Rule Pack 內建於自家產品。'
                    : 'For vendors at the scale of Cisco, Microsoft, NVIDIA, or Gen Digital, embedding the enriched Pro Rule Pack inside their own product.'}
                </p>
                <p className="text-[13px] text-text-secondary leading-[1.85]">
                  {isZh
                    ? '包含 draft 規則早期存取、五大框架合規 metadata、白標部署、客製攻擊類別，以及 ATR roadmap 投票權。'
                    : 'Includes early access to draft rules, five-framework compliance metadata, white-label deployment, custom attack classes, and ATR roadmap voting rights.'}
                </p>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary mb-2">
                  {isZh ? '策略夥伴條款' : 'Strategic Partnership Terms'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-bold text-text-primary">
                    {isZh ? '客製合約' : 'Custom'}
                  </span>
                </div>
                <p className="text-[13px] text-text-secondary leading-[1.85] mb-4">
                  {isZh
                    ? '專為與 ATR 進行長期 ecosystem 深度整合的廠商保留。'
                    : 'Reserved for vendors pursuing long-term ecosystem integration with ATR.'}
                </p>
                <p className="text-[13px] text-text-secondary leading-[1.85]">
                  {isZh
                    ? '可協商項目包含併購優先承購權、共同 GTM、工程協作、ATR Foundation 治理席位等。'
                    : 'Negotiable terms include M&A right of first refusal, joint GTM, engineering collaboration, and an ATR Foundation governance seat.'}
                </p>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact?tier=oem"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-panguard-green text-white font-semibold text-sm hover:bg-panguard-green-light transition-colors"
              >
                {isZh ? '洽談 OEM 授權' : 'Discuss OEM license'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:adam@agentthreatrule.org?subject=PanGuard%20OEM%20License%20Inquiry"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border text-text-secondary text-sm hover:border-brand-sage hover:text-text-primary transition-colors"
              >
                {isZh ? '直接寄信' : 'Email directly'}
              </a>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── Sample compliance evidence report ─── */}
      <SectionWrapper dark>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? '範例稽核報告' : 'SAMPLE AUDIT REPORT'}
            title={
              isZh
                ? 'Compliance Evidence 報告長什麼樣子'
                : 'What a Compliance Evidence report looks like'
            }
            subtitle={
              isZh
                ? '以下是 Enterprise 客戶每季收到的合規證據報告節錄。每筆偵測事件對應到 ATR 規則 ID，並串連到 EU AI Act、NIST AI RMF、ISO/IEC 42001 等框架的具體條文，可直接送進稽核流程。'
                : 'Below is an excerpt from the quarterly compliance evidence report Enterprise customers receive. Each detection is mapped to an ATR rule ID and threaded through specific articles in EU AI Act, NIST AI RMF, ISO/IEC 42001, and other frameworks — ready to submit directly to auditors.'
            }
          />
          <FadeInUp delay={0.2}>
            <div className="mt-12 bg-surface-2 rounded-xl border border-border p-6 sm:p-8">
              <p className="text-xs font-mono text-brand-sage/80 uppercase tracking-wider mb-5">
                {isZh ? '季度報告節錄' : 'Quarterly report excerpt'}
              </p>
              <pre className="text-xs sm:text-sm text-text-secondary font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {`Q2 2026 Detection Evidence Report · Acme Corp
──────────────────────────────────────────────

Total events intercepted by PanGuard Guard: 1,847

Mapping by compliance framework
──────────────────────────────────────────────
EU AI Act Article 12 (logging requirement):    612 events
  └─ Primary rules:  ATR-2026-00001, ATR-2026-00121, ATR-2026-00149
  └─ Retention:      7-year audit log archive (Enterprise)

NIST AI RMF Govern.1.1 (risk management):      488 events
  └─ Primary rules:  ATR-2026-00080..00096
  └─ Confidence:     ≥0.90 across all flagged events

ISO/IEC 42001 clause 6.2 (risk treatment):     347 events
  └─ Primary rules:  ATR-2026-00040, ATR-2026-00099

Colorado AI Act SB24-205 (disclosure):          44 events
OWASP Agentic Top 10 (ASI-01..10):             356 events (consolidated)
OWASP LLM Top 10:2025 (LLM01..10):             289 events (consolidated)

Auditor-ready artefacts
──────────────────────────────────────────────
  ✓ PDF report (signed, hash-verified)
  ✓ JSON export for SIEM ingestion
  ✓ Per-article evidence bundle
  ✓ ATR rule provenance chain`}
              </pre>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── ATR Standards Organization ─── */}
      <SectionWrapper>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? 'ATR 標準組織' : 'ATR STANDARDS ORGANIZATION'}
            title={
              isZh
                ? '開源標準 + 獨立治理 + 認證計畫'
                : 'Open standard, independent governance, certification program'
            }
            subtitle={
              isZh
                ? 'ATR 是 MIT 授權的開源偵測協定,治理獨立於 PanGuard。任何人、任何產品免費使用。Skill 認證由社群志願者免費審核(類 MITRE ATT&CK 模式)。唯一付費層是 Enterprise Member(類 Apache Software Foundation Platinum Sponsor)。'
                : 'ATR is an MIT-licensed open detection protocol with governance independent of PanGuard. Anyone, any product, can use it freely. Skill certification is run by community reviewers at no cost (MITRE ATT&CK model). The only paid surface is Enterprise Membership — modeled on the Apache Software Foundation Platinum Sponsor pattern.'
            }
          />

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <FadeInUp delay={0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary">
                  {isZh ? 'ATR Certified Skill' : 'ATR Certified Skill'}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {isZh ? '社群志願者審核' : 'community-run review'}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-brand-sage">
                    {isZh ? '免費' : 'Free'}
                  </span>
                  <span className="text-xs text-text-muted">{isZh ? '永久' : 'forever'}</span>
                </div>
                <p className="text-[13px] text-text-secondary mt-4 leading-relaxed">
                  {isZh
                    ? "Skill 作者免費 submit PR 到 ATR repo · 社群志願 reviewer 透明審核(類 MITRE ATT&CK / Let's Encrypt 模式)· 通過後獲得徽章 + 自動上架 ATR registry + PanGuard Community 白名單。PanGuard 不收錢、不決定結果 — authority 靠透明度,不靠付費。"
                    : "Skill authors submit a PR free of charge to the ATR repo. Community volunteer reviewers audit transparently (MITRE ATT&CK / Let's Encrypt model). Certified skills get the badge, ATR registry listing, and PanGuard Community whitelist. PanGuard does not charge and does not decide outcomes — authority lives in transparency, not paywalls."}
                </p>
                <a
                  href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-5 hover:underline"
                >
                  {isZh ? 'Submit 到 ATR GitHub' : 'Submit on ATR GitHub'}{' '}
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.18}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary">
                  {isZh ? 'ATR Enterprise Member' : 'ATR Enterprise Member'}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {isZh ? '年會員費' : 'annual membership'}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-text-primary">$10K</span>
                  <span className="text-xs text-text-muted">/ {isZh ? '年' : 'year'}</span>
                </div>
                <p className="text-[13px] text-text-secondary mt-4 leading-relaxed">
                  {isZh
                    ? 'Logo 放 ATR 官網 · 治理投票權 · 優先 PR review · 早期 draft 規則 access · 年度 roadmap 會議發言權。類 MITRE Engenuity / ISO 工作組模式。'
                    : 'Logo on ATR registry · governance vote · priority PR review · early draft rule access · seat in annual roadmap meeting. Modeled on MITRE Engenuity and ISO working-group pattern.'}
                </p>
                <Link
                  href="/contact?tier=atr-member"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-5 hover:underline"
                >
                  {isZh ? '申請會員' : 'Apply for membership'} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </SectionWrapper>

      {/* ─── Why no middle tier ─── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <SectionTitle
            overline={isZh ? '為什麼沒有 Team / Business tier' : 'WHY NO TEAM / BUSINESS TIER'}
            title={isZh ? '中間 tier 對這個產品是陷阱' : 'Middle tier is a trap for this product'}
          />
          <FadeInUp delay={0.15}>
            <div className="mt-10 space-y-5 text-sm sm:text-base text-text-secondary leading-relaxed">
              <p>
                {isZh ? (
                  <>
                    <strong className="text-text-primary">
                      個人開發者 & SMB 的 value 是 sensor,不是 subscription。
                    </strong>
                    Agent security 的 runtime 本質對個人 dev value 有限 — 你跑 2 個 Claude
                    Code,不需要付月費 monitor。反而,每個 Community 安裝都是感測器,把威脅資訊餵回
                    Threat Cloud → 結晶成新 ATR 規則 → 所有人得益。這個 flywheel 用 paywall 會打破。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      For individual devs and SMB, the value is being a sensor, not a subscription.
                    </strong>{' '}
                    Agent security is runtime-centric — a developer running 2 Claude Code sessions
                    does not need a monthly bill to watch them. Each Community install is a sensor
                    that feeds telemetry back to Threat Cloud, which crystallizes new ATR rules,
                    which strengthens detection for everyone. A paywall breaks this flywheel.
                  </>
                )}
              </p>
              <p>
                {isZh ? (
                  <>
                    <strong className="text-text-primary">
                      Self-serve 中間 tier 需要的是規模化客服與通路團隊。
                    </strong>
                    100 個月費 $500 的 SMB 客戶等同於一支專責處理低 LTV 客戶的工程組——這會直接擠壓
                    為 F500 與主權客戶提供的工程時間。Snyk、Datadog 之所以能跑這個模式，背後是 50+
                    人的工程團隊與專屬客服管線。我們的公司形態目前不適合那個層級的自助訂閱。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      A self-serve middle tier needs a scaled customer-success and support
                      organisation.
                    </strong>{' '}
                    100 SMB customers at $500/month is equivalent to a full-time engineering team
                    supporting low-LTV accounts — and that directly squeezes the engineering time
                    F500 and sovereign customers actually pay for. Snyk and Datadog ran this model
                    with 50+ engineers behind a dedicated support pipeline. PanGuard is not that
                    shape today.
                  </>
                )}
              </p>
              <p>
                {isZh ? (
                  <>
                    <strong className="text-text-primary">F500 不需要中間 tier 當橋樑。</strong>
                    F500 security team 本來就用免費 Community 試水 90 天,要合規 + SOC2 + airgap 時跳
                    Pilot → Enterprise。這是 F500 實際的採購行為,不是付費 Team tier。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      F500 does not need a middle tier as a bridge.
                    </strong>{' '}
                    F500 security teams naturally pilot on free Community for 90 days, then jump to
                    Pilot → Enterprise when they need compliance, SOC2, and airgap. That matches
                    real F500 procurement behaviour — a paid Team tier sits in nobody&apos;s way.
                  </>
                )}
              </p>
              <p className="text-text-muted italic">
                {isZh
                  ? '如果 Y2 資料顯示中間有真實需求,我們會重新評估。今天的資料說:不要建。'
                  : "If Y2 data shows a real middle-tier demand, we will reevaluate. Today's data says: do not build it."}
              </p>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── CTA ─── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {isZh ? '還在評估?' : 'Still evaluating?'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-4 leading-relaxed">
              {isZh
                ? 'GRC 採購問題 · on-prem 架構 · 合規 mapping 細節 · F500 logo 計畫 — 直接寫信,48 小時內回。'
                : 'GRC procurement questions · on-prem architecture · compliance mapping specifics · F500 logo program — email us, 48h response.'}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-6 py-3 transition-all"
              >
                {isZh ? '試 Community' : 'Try Community'} <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all"
              >
                {isZh ? '寫信給我們' : 'Contact us'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
