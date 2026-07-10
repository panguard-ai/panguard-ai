'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, ArrowRight } from 'lucide-react';

const APP_ORIGIN =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || 'https://app.panguard.ai';

interface SlotState {
  paid: number;
  total_slots: number;
  slots_remaining: number;
  exhausted: boolean;
}

interface Props {
  locale: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; intentId: string; slotsRemaining: number; magicLinkSent: boolean }
  | { kind: 'error'; code: string; message: string };

const FRAMEWORKS: Array<{ id: string; label: string; labelZh: string }> = [
  { id: 'eu-ai-act', label: 'EU AI Act (2024/1689)', labelZh: 'EU AI Act (2024/1689)' },
  { id: 'nist-ai-rmf', label: 'NIST AI RMF 1.0', labelZh: 'NIST AI RMF 1.0' },
  { id: 'iso-42001', label: 'ISO/IEC 42001:2023', labelZh: 'ISO/IEC 42001:2023' },
  { id: 'owasp-agentic', label: 'OWASP Agentic Top 10', labelZh: 'OWASP Agentic Top 10' },
  { id: 'owasp-llm', label: 'OWASP LLM Top 10', labelZh: 'OWASP LLM Top 10' },
];

const DEPLOYMENT_TARGETS: Array<{ id: string; label: string; labelZh: string }> = [
  { id: 'vpc-aws', label: 'AWS VPC', labelZh: 'AWS VPC' },
  { id: 'vpc-gcp', label: 'Google Cloud VPC', labelZh: 'Google Cloud VPC' },
  { id: 'vpc-azure', label: 'Azure VNet', labelZh: 'Azure VNet' },
  { id: 'on-prem', label: 'On-premises', labelZh: '自架機房' },
  { id: 'airgap', label: 'Airgapped environment', labelZh: 'Airgap 環境' },
  { id: 'undecided', label: 'Undecided / discuss in kickoff', labelZh: '未定 / kickoff 再討論' },
];

const TEAM_SIZES = ['1-10', '11-50', '51-200', '200+'];

export default function ScopingForm({ locale }: Props) {
  const isZh = locale === 'zh-TW';
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [, startTransition] = useTransition();
  const [slots, setSlots] = useState<SlotState | null>(null);

  // Load remaining-slots count on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${APP_ORIGIN}/api/pilot/intent?slots=1`, {
          headers: { accept: 'application/json' },
        });
        if (!res.ok) return;
        const body = (await res.json()) as SlotState;
        if (!cancelled) setSlots(body);
      } catch {
        /* offline / cold start — leave slots unknown */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(formData: FormData) {
    setState({ kind: 'submitting' });

    const body = {
      org_name: String(formData.get('org_name') ?? '').trim(),
      contact_email: String(formData.get('contact_email') ?? '')
        .trim()
        .toLowerCase(),
      contact_name: String(formData.get('contact_name') ?? '').trim(),
      framework: String(formData.get('framework') ?? ''),
      deployment_target: String(formData.get('deployment_target') ?? ''),
      team_size: String(formData.get('team_size') ?? ''),
      use_case: String(formData.get('use_case') ?? '').trim(),
      payment_path: String(formData.get('payment_path') ?? 'card'),
      accepted_msa: formData.get('accepted_msa') === 'on',
      accepted_dpa: formData.get('accepted_dpa') === 'on',
      accepted_refund_policy: formData.get('accepted_refund_policy') === 'on',
    };

    try {
      const res = await fetch(`${APP_ORIGIN}/api/pilot/intent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        intent_id?: string;
        slots_remaining?: number;
        magic_link_sent?: boolean;
        error?: string;
        message?: string;
      };

      if (!res.ok || !result.ok) {
        setState({
          kind: 'error',
          code: result.error ?? `http_${res.status}`,
          message:
            result.message ??
            (result.error === 'slots_exhausted'
              ? isZh
                ? 'Founding Customer Pilot 3 個名額已售完。請聯絡 sales@panguard.ai 詢問 Enterprise tier （$250K起）。'
                : 'All 3 Founding Customer slots claimed. Email sales@panguard.ai for Enterprise tier ($250K+).'
              : isZh
                ? '提交失敗。請寄信給 adam@panguard.ai。'
                : 'Submission failed. Please email adam@panguard.ai.'),
        });
        return;
      }

      setState({
        kind: 'success',
        intentId: result.intent_id ?? '',
        slotsRemaining: result.slots_remaining ?? 0,
        magicLinkSent: result.magic_link_sent ?? false,
      });
    } catch (err) {
      setState({
        kind: 'error',
        code: 'network_error',
        message:
          err instanceof Error
            ? err.message
            : isZh
              ? '網路錯誤。請重試。'
              : 'Network error. Please retry.',
      });
    }
  }

  if (state.kind === 'success') {
    return (
      <SuccessPanel
        intentId={state.intentId}
        slotsRemaining={state.slotsRemaining}
        magicLinkSent={state.magicLinkSent}
        isZh={isZh}
      />
    );
  }

  if (slots?.exhausted) {
    return <ExhaustedPanel isZh={isZh} />;
  }

  return (
    <form
      action={(fd) => {
        startTransition(() => {
          void onSubmit(fd);
        });
      }}
      className="mt-10 space-y-6"
    >
      <SlotsBanner slots={slots} isZh={isZh} />

      <Field label={isZh ? '公司名稱' : 'Organization name'} required>
        <input
          name="org_name"
          required
          minLength={2}
          maxLength={200}
          placeholder={isZh ? 'Acme Bank, Inc.' : 'Acme Bank, Inc.'}
          className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={isZh ? '你的姓名' : 'Your name'} required>
          <input
            name="contact_name"
            required
            minLength={2}
            maxLength={100}
            placeholder={isZh ? 'Adam Lin' : 'Adam Lin'}
            className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage"
          />
        </Field>

        <Field
          label={isZh ? '工作信箱' : 'Work email'}
          hint={isZh ? '會寄 magic link 到這個信箱' : 'Magic-link login is sent here'}
          required
        >
          <input
            name="contact_email"
            type="email"
            required
            maxLength={254}
            placeholder="you@company.com"
            className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage"
          />
        </Field>
      </div>

      <Field
        label={isZh ? '主要合規框架 （選一）' : 'Primary compliance framework (pick one)'}
        hint={
          isZh
            ? '我們會根據這個產出 sample evidence pack — 之後可在 Enterprise tier 加掛其他框架。'
            : 'We produce the sample evidence pack against this framework. Additional frameworks can be added at Enterprise tier.'
        }
        required
      >
        <select
          name="framework"
          required
          defaultValue=""
          className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-sage"
        >
          <option value="" disabled>
            {isZh ? '請選擇…' : 'Select…'}
          </option>
          {FRAMEWORKS.map((f) => (
            <option key={f.id} value={f.id}>
              {isZh ? f.labelZh : f.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={isZh ? '部署環境' : 'Deployment target'} required>
          <select
            name="deployment_target"
            required
            defaultValue=""
            className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-sage"
          >
            <option value="" disabled>
              {isZh ? '請選擇…' : 'Select…'}
            </option>
            {DEPLOYMENT_TARGETS.map((d) => (
              <option key={d.id} value={d.id}>
                {isZh ? d.labelZh : d.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label={isZh ? '團隊規模' : 'Team size'} required>
          <select
            name="team_size"
            required
            defaultValue=""
            className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-sage"
          >
            <option value="" disabled>
              {isZh ? '請選擇…' : 'Select…'}
            </option>
            {TEAM_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label={isZh ? '使用情境' : 'Use case'}
        hint={
          isZh
            ? '簡述你的 AI agent / chatbot / RAG / 客服系統——我們會根據這個挑 50-100 條 ATR 規則。（10-1000 字）'
            : 'Briefly describe the AI agent / chatbot / RAG / customer-facing system you want to protect. We use this to pick 50-100 ATR rules. (10-1000 chars)'
        }
        required
      >
        <textarea
          name="use_case"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          placeholder={
            isZh
              ? '例：我們在客服跑一個 GPT-4 chatbot，擔心 prompt injection 跟 PII 洩漏…'
              : 'e.g. We run a GPT-4 customer-support chatbot, concerns are prompt injection and PII exfiltration…'
          }
          className="w-full bg-surface-1 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage resize-y"
        />
      </Field>

      <Field
        label={isZh ? '付款方式' : 'Payment method'}
        hint={
          isZh
            ? 'F500 採購建議選電匯；直接刷卡適合 P-card 上限 > $25K 的客戶。'
            : 'F500 procurement: wire (Net-30). P-card-friendly buyers: card.'
        }
        required
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-3 px-4 py-3 bg-surface-1 border border-border rounded-lg cursor-pointer hover:border-brand-sage transition-colors">
            <input type="radio" name="payment_path" value="card" defaultChecked />
            <span className="text-sm text-text-primary">
              {isZh ? '信用卡 (Stripe Checkout)' : 'Credit card (Stripe)'}
            </span>
          </label>
          <label className="flex items-center gap-3 px-4 py-3 bg-surface-1 border border-border rounded-lg cursor-pointer hover:border-brand-sage transition-colors">
            <input type="radio" name="payment_path" value="wire" />
            <span className="text-sm text-text-primary">
              {isZh ? '電匯 / 發票 (Net-30)' : 'Wire / invoice (Net-30)'}
            </span>
          </label>
        </div>
      </Field>

      <div className="pt-4 border-t border-border space-y-3">
        <p className="text-sm font-semibold text-text-primary">
          {isZh ? '條款接受' : 'Terms acceptance'}
        </p>
        <TermsCheckbox
          name="accepted_msa"
          href="/legal/msa"
          label={isZh ? '我接受 MSA （主服務協議）' : 'I accept the MSA (Master Services Agreement)'}
          isZh={isZh}
        />
        <TermsCheckbox
          name="accepted_dpa"
          href="/legal/dpa"
          label={isZh ? '我接受 DPA （資料處理協議）' : 'I accept the DPA (Data Processing Addendum)'}
          isZh={isZh}
        />
        <TermsCheckbox
          name="accepted_refund_policy"
          href="/legal/refund"
          label={
            isZh ? '我接受退費政策 （7 天無條件）' : 'I accept the Refund Policy (7-day no-questions)'
          }
          isZh={isZh}
        />
      </div>

      {state.kind === 'error' ? (
        <div className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-400">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={state.kind === 'submitting'}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-6 py-3 text-sm hover:bg-brand-sage-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state.kind === 'submitting'
          ? isZh
            ? '提交中…'
            : 'Submitting…'
          : isZh
            ? '提交並寄送 magic link'
            : 'Submit and send magic link'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {label}
        {required ? <span className="text-brand-sage">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-text-muted leading-relaxed">{hint}</p> : null}
    </div>
  );
}

function TermsCheckbox({
  name,
  href,
  label,
  isZh,
}: {
  name: string;
  href: string;
  label: string;
  isZh: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-1 w-4 h-4 accent-brand-sage cursor-pointer"
      />
      <span className="text-sm text-text-secondary leading-relaxed">
        {label}{' '}
        <a href={href} target="_blank" rel="noreferrer" className="text-brand-sage hover:underline">
          ({isZh ? '查看' : 'read'})
        </a>
      </span>
    </label>
  );
}

function SlotsBanner({ slots, isZh }: { slots: SlotState | null; isZh: boolean }) {
  if (!slots) return null;
  return (
    <div className="rounded-lg bg-surface-1 border border-brand-sage/30 px-4 py-3 flex items-center gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
      <p className="text-sm text-text-secondary">
        <strong className="text-text-primary">
          {slots.slots_remaining} / {slots.total_slots}
        </strong>{' '}
        {isZh ? 'Founding Customer Pilot 名額剩餘' : 'Founding Customer Pilot slots remaining'}
      </p>
    </div>
  );
}

function SuccessPanel({
  intentId,
  slotsRemaining,
  magicLinkSent,
  isZh,
}: {
  intentId: string;
  slotsRemaining: number;
  magicLinkSent: boolean;
  isZh: boolean;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-brand-emerald/40 bg-surface-1 p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand-emerald/15 flex items-center justify-center">
        <Check className="w-6 h-6 text-brand-emerald" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-text-primary">
        {isZh ? '提交完成 · 請檢查信箱' : 'Submitted · Check your inbox'}
      </h2>
      <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
        {magicLinkSent
          ? isZh
            ? '已寄出 magic link 到你提供的 email。點擊信中連結後會跳到 Stripe 結帳頁面。 （連結 60 分鐘內有效）'
            : 'A magic link has been sent to your email. Click it within 60 minutes to land on Stripe Checkout.'
          : isZh
            ? '提交保留下來了，但 magic link email 沒寄出。請寄信給 adam@panguard.ai 主旨「[Pilot Intent ' +
              intentId +
              '] resend」，我會手動寄。'
            : 'Submission saved, but magic-link email failed. Email adam@panguard.ai with subject "[Pilot Intent ' +
              intentId +
              '] resend" and we will manually send the link.'}
      </p>
      <p className="mt-4 text-xs text-text-muted">
        {isZh ? 'Intent ID: ' : 'Intent ID: '}
        <code>{intentId}</code>
        {' · '}
        {isZh ? '剩餘名額： ' : 'Slots remaining: '}
        <strong>{slotsRemaining}</strong>
      </p>
    </div>
  );
}

function ExhaustedPanel({ isZh }: { isZh: boolean }) {
  return (
    <div className="mt-10 rounded-2xl border border-amber-400/40 bg-surface-1 p-8 text-center">
      <h2 className="text-2xl font-bold text-text-primary">
        {isZh ? 'Founding Customer 名額已滿' : 'Founding Customer slots claimed'}
      </h2>
      <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
        {isZh
          ? '3 個 $25K Pilot 名額已全部被認領。Enterprise tier （$250K起、sales-led） 仍開放。寄信給 sales@panguard.ai 啟動 scoping。'
          : 'All three $25K Founding Customer Pilot slots have been claimed. Enterprise tier ($250K+, sales-led) remains open. Email sales@panguard.ai to start scoping.'}
      </p>
      <a
        href="mailto:sales@panguard.ai?subject=Enterprise%20scoping%20request"
        className="mt-6 inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-brand-sage-light transition-colors"
      >
        {isZh ? '聯絡 sales' : 'Email sales'}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
