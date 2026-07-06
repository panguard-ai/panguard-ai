'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/navigation';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Users, Scale, Mail, Calendar, AlertCircle, FileCheck } from 'lucide-react';

const REPO_BLOB = 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main';

interface Seat {
  role: string;
  roleZh: string;
  holder: string;
  org: string;
  status: 'confirmed' | 'pending' | 'open';
  noteEn: string;
  noteZh: string;
}

const FOUNDING_THREE: readonly Seat[] = [
  {
    role: 'Maintainer Seat',
    roleZh: '維護者席',
    holder: 'Adam Lin (林冠辛)',
    org: 'ATR project',
    status: 'confirmed',
    noteEn: 'BDFL transitional authority until TSC seated.',
    noteZh: 'TSC 就任前為 BDFL 過渡權威。',
  },
  {
    role: 'Industry Seat',
    roleZh: '產業席',
    holder: 'Vineeth Sai (target)',
    org: 'Cisco AI Defense',
    status: 'pending',
    noteEn: 'Confirmation pending. Justified by PR #79 + #99 merged in skill-scanner.',
    noteZh: '確認中。已合併 PR #79 + #99 至 skill-scanner。',
  },
  {
    role: 'Community / Threat-Intel Seat',
    roleZh: '社群／威脅情資席',
    holder: 'Alexandre Dulaunoy (target)',
    org: 'MISP / CIRCL',
    status: 'pending',
    noteEn: 'Confirmation pending. Justified by MISP taxonomies #323 + galaxy #1207 merged.',
    noteZh: '確認中。已合併 MISP taxonomies #323 + galaxy #1207。',
  },
];

const AUTHORITY = [
  { en: 'Rule ID assignment', zh: '規則 ID 指派', vote: '2 of 3 majority' },
  { en: 'Spec amendments', zh: '規範修正', vote: '2 of 3 + 14-day public comment' },
  { en: 'New category admission', zh: '新分類核准', vote: '2 of 3 + Spec PR' },
  { en: 'Enterprise Member admission', zh: 'Enterprise Member 入會', vote: '2 of 3 majority' },
];

const COI = [
  {
    en: 'A seat MUST recuse from any PR authored by an organization in which they hold equity, employment, or a commercial contract > $10,000 / year.',
    zh: '若 PR 來自其持股、任職或年合約 >$10,000 USD 的組織，該席次必須迴避。',
  },
  {
    en: 'Recusal MUST be stated publicly in the PR thread.',
    zh: '迴避必須在 PR 中公開宣告。',
  },
  {
    en: 'A reviewer MUST recuse from a PR they authored or that targets their employer’s product.',
    zh: '審閱者不得審閱自己提交、或針對所屬雇主產品的 PR。',
  },
];

export default function GovernanceContent() {
  const locale = useLocale();
  const isZh = locale.startsWith('zh');

  return (
    <SectionWrapper>
      <header className="mb-12 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs font-medium text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-sage" />
          {isZh ? '治理 · 版本 1.1' : 'Governance · Version 1.1'}
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {isZh ? 'ATR 治理' : 'ATR Governance'}
        </h1>
        <p className="text-lg leading-relaxed text-text-secondary">
          {isZh
            ? 'ATR 是公開、社群驅動的偵測標準。本頁說明決策權威、Technical Steering Committee (TSC) 結構、利益衝突政策，以及 Enterprise Member 計畫。'
            : 'ATR is a public, community-driven detection standard. This page documents decision authority, the Technical Steering Committee structure, conflict-of-interest policy, and the Enterprise Member program.'}
        </p>
      </header>

      <SectionTitle
        title={
          isZh ? 'Founding Three TSC（目標：2026 Q3）' : 'Founding Three TSC (Target: Q3 2026)'
        }
        subtitle={
          isZh
            ? '單一維護者治理是專案目前最大的結構性風險。Founding Three 的設計直接解開 bus-factor=1 並把 ATR 從一個專案轉為標準制定機構。'
            : 'Single-maintainer governance is the project’s primary structural risk. The Founding Three resolves bus-factor=1 and converts ATR from a project into a standards body.'
        }
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {FOUNDING_THREE.map((seat) => (
          <div key={seat.role} className="rounded-2xl border border-border bg-surface-1 p-6">
            <div className="mb-3 flex items-center justify-between">
              <Users className="h-5 w-5 text-text-muted" aria-hidden />
              <StatusPill status={seat.status} isZh={isZh} />
            </div>
            <div className="text-xs uppercase tracking-wide text-text-muted">
              {isZh ? seat.roleZh : seat.role}
            </div>
            <div className="mt-1 text-base font-semibold text-text-primary">{seat.holder}</div>
            <div className="text-sm text-text-secondary">{seat.org}</div>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              {isZh ? seat.noteZh : seat.noteEn}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-text-secondary">
        {isZh
          ? '席-3 (社群／威脅情資席) 辭職時，由 TSC 三席全體同意決定接任者。任一席次不得單獨否決。公開會議每兩週一次，會議記錄存於 repo。'
          : 'Seat-3 (community / threat-intel) succession requires TSC supermajority (3-of-3); no single seat may veto. Bi-weekly open meetings; minutes posted to the repo.'}
      </p>

      <div className="mt-16">
        <SectionTitle
          title={isZh ? '決策權威' : 'Decision Authority'}
          subtitle={isZh ? 'TSC 就任後' : 'Once TSC is seated'}
        />
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {isZh ? '決策' : 'Decision'}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {isZh ? '投票門檻' : 'Vote Threshold'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {AUTHORITY.map((row) => (
                <tr key={row.en}>
                  <td className="px-4 py-3 text-text-primary">{isZh ? row.zh : row.en}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{row.vote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-16">
        <SectionTitle
          title={isZh ? '利益衝突政策' : 'Conflict-of-Interest Policy'}
          subtitle={
            isZh ? '所有 TSC 席次與 PR 審閱者均須遵守' : 'Applies to all TSC seats and PR reviewers'
          }
        />
        <div className="mt-6 space-y-3">
          {COI.map((rule, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-border bg-surface-1 p-4">
              <Scale className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-hidden />
              <p className="text-sm leading-relaxed text-text-secondary">
                {isZh ? rule.zh : rule.en}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-brand-sage/40 bg-surface-1 p-6">
          <div className="mb-3 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-brand-sage" aria-hidden />
            <h3 className="text-base font-semibold text-text-primary">
              {isZh ? 'ATR Certified Skill（免費）' : 'ATR Certified Skill (Free)'}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {isZh
              ? '社群運營的免費認證。CI 通過、零 critical 發現的 skill 取得 atr-certified 標籤。決定權在 CI 與社群審閱者，非任何商業實體。'
              : 'Community-run, free. Skills with zero critical findings against the current ATR corpus receive the atr-certified label. Decisions are made by CI and community reviewers, not by any commercial entity.'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-text-secondary" aria-hidden />
            <h3 className="text-base font-semibold text-text-primary">
              {isZh ? 'Enterprise Member（$10,000 / 年）' : 'Enterprise Member ($10,000 / year)'}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {isZh
              ? '採 Apache Software Foundation Platinum Sponsor 模型。提供治理投票權、RFC 早期存取、優先 PR 審閱 SLA、Logo 露出。Enterprise Member 不能影響個別規則的接受或拒絕。'
              : 'Modeled on the Apache Software Foundation Platinum Sponsor program. Grants governance voting rights, early RFC access, priority PR review SLA, logo placement. Enterprise Members cannot influence individual rule acceptance.'}
          </p>
        </div>
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="mb-4 text-base font-semibold text-text-primary">
          {isZh ? '聯絡與參與' : 'Contact and Participation'}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <ContactRow
            icon={<Mail className="h-4 w-4" />}
            label={isZh ? 'BDFL 聯絡' : 'BDFL contact'}
            value="adam@agentthreatrule.org"
            href="mailto:adam@agentthreatrule.org"
          />
          <ContactRow
            icon={<Calendar className="h-4 w-4" />}
            label={isZh ? '會議節奏' : 'Meeting cadence'}
            value={isZh ? '兩週一次公開會議' : 'Bi-weekly open call'}
          />
          <ContactRow
            icon={<AlertCircle className="h-4 w-4" />}
            label={isZh ? '完整章程' : 'Full charter'}
            value="BDFL-charter.md"
            href={`${REPO_BLOB}/docs/BDFL-charter.md`}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={'/atr/spec' as never}
            className="inline-flex items-center gap-1 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-3"
          >
            {isZh ? '核心規範' : 'Core Specification'}
          </Link>
          <Link
            href={'/atr/cite' as never}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-border-hover hover:bg-surface-1"
          >
            {isZh ? '引用方式' : 'How to Cite'}
          </Link>
          <a
            href={`${REPO_BLOB}/GOVERNANCE.md`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-border-hover hover:bg-surface-1"
          >
            {isZh ? '完整 GOVERNANCE.md' : 'GOVERNANCE.md on GitHub'}
          </a>
        </div>
      </div>
    </SectionWrapper>
  );
}

function StatusPill({ status, isZh }: { status: Seat['status']; isZh: boolean }) {
  const tone = status === 'confirmed' ? 'emerald' : status === 'pending' ? 'amber' : 'slate';
  const labelEn = status === 'confirmed' ? 'Confirmed' : status === 'pending' ? 'Pending' : 'Open';
  const labelZh = status === 'confirmed' ? '已確認' : status === 'pending' ? '確認中' : '待提名';
  const color =
    tone === 'emerald'
      ? 'bg-panguard-green/10 text-panguard-green border-panguard-green/30'
      : tone === 'amber'
        ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
        : 'bg-surface-2 text-text-secondary border-border';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {isZh ? labelZh : labelEn}
    </span>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-sm text-text-primary">{value}</div>
    </>
  );
  if (href)
    return (
      <a
        href={href}
        target={href.startsWith('mailto') ? undefined : '_blank'}
        rel="noreferrer"
        className="block hover:text-brand-sage"
      >
        {inner}
      </a>
    );
  return <div>{inner}</div>;
}
