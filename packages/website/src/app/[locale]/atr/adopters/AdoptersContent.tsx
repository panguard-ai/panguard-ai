'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/navigation';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { STATS } from '@/lib/stats';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

interface Adopter {
  org: string;
  category: 'big-tech' | 'standards' | 'enterprise' | 'awesome-list';
  noteEn: string;
  noteZh: string;
  prs: { number: number; repo?: string; titleEn: string; titleZh: string; date: string }[];
  caveatEn?: string;
  caveatZh?: string;
}

const ADOPTERS: readonly Adopter[] = [
  {
    org: 'Microsoft Agent Governance Toolkit',
    category: 'big-tech',
    noteEn:
      'ATR example adapters in the AGT repository (examples/atr-import, PR #2308, and examples/acs-atr-annotator, PR #3025). The rule-pack YAML that the earlier example PRs #908 and #1277 added was removed upstream on 2026-07-30.',
    noteZh:
      'AGT repo 收錄了 ATR 範例 adapter（examples/atr-import，PR #2308；examples/acs-atr-annotator，PR #3025）。先前範例 PR #908 與 #1277 加入的規則包 YAML 已於 2026-07-30 被上游移除。',
    prs: [
      {
        number: 908,
        titleEn: 'Original 15-rule PoC',
        titleZh: '最初 15 條 PoC',
        date: '2026-04-13',
      },
      {
        number: 1277,
        titleEn: '287-rule expansion + weekly auto-sync (rule pack later removed upstream)',
        titleZh: '287 條擴張 + 每週自動同步（規則包後來被上游移除）',
        date: '2026-04-26',
      },
      {
        number: 2308,
        titleEn: 'atr-import example: compile ATR YAML into AGT policies',
        titleZh: 'atr-import 範例：把 ATR YAML 編譯成 AGT 政策',
        date: '2026-05-18',
      },
      {
        number: 3025,
        titleEn: 'ACS + ATR annotator example',
        titleZh: 'ACS + ATR annotator 範例',
        date: '2026-06-15',
      },
    ],
  },
  {
    org: 'Cisco AI Defense',
    category: 'big-tech',
    noteEn:
      'ATR rule pack merged into the open-source cisco-ai-defense/skill-scanner repository. This describes that repository, not any Cisco product.',
    noteZh:
      'ATR 規則包已合併進開源的 cisco-ai-defense/skill-scanner repo。此處指該 repo，不代表任何 Cisco 產品。',
    prs: [
      {
        number: 79,
        repo: 'cisco-ai-defense/skill-scanner',
        titleEn: 'Original PoC',
        titleZh: '最初 PoC',
        date: '2026-04-03',
      },
      {
        number: 99,
        repo: 'cisco-ai-defense/skill-scanner',
        titleEn: 'ATR rule pack merged',
        titleZh: 'ATR 規則包合併',
        date: '2026-04-22',
      },
    ],
  },
  {
    org: 'MISP (CIRCL)',
    category: 'standards',
    noteEn:
      'ATR rule cluster in global threat-intel sharing (galaxy). Rule-ID tagging vocabulary in taxonomies. CIRCL is Luxembourg national CERT.',
    noteZh:
      'MISP galaxy 中收錄 ATR 規則 cluster，taxonomies 中採用 ATR Rule-ID 作為 tagging 詞彙。CIRCL 為 Luxembourg 國家 CERT。',
    prs: [
      {
        number: 323,
        repo: 'MISP/misp-taxonomies',
        titleEn: 'Rule-ID tagging vocabulary',
        titleZh: 'Rule-ID 標籤詞彙',
        date: '2026-04-12',
      },
      {
        number: 1207,
        repo: 'MISP/misp-galaxy',
        titleEn: '336-rule cluster',
        titleZh: '336 條規則 cluster',
        date: '2026-05-10',
      },
    ],
  },
  {
    org: 'OWASP Agent Security Regression Harness',
    category: 'standards',
    noteEn: 'Project Lead Mert Satilmaz merged with "Welcome to the team" greeting.',
    noteZh: 'Project Lead Mert Satilmaz 合併並以 "Welcome to the team" 致意。',
    caveatEn:
      'PR #74 merged into the OWASP org Agent Security Regression Harness; PR #14 is a separate mapping in a third-party precize repo, not an OWASP Foundation publication.',
    caveatZh:
      'PR #74 併入 OWASP 官方 organization 的 Agent Security Regression Harness；PR #14 是第三方 precize repo 的另一份對應，非 OWASP Foundation 官方出版品。',
    prs: [
      {
        number: 74,
        repo: 'OWASP/agent-security-regression-harness',
        titleEn: 'Rule pack',
        titleZh: '規則包',
        date: '2026-05-11',
      },
      {
        number: 14,
        repo: 'precize/Agentic-AI-Top10-Vulnerability',
        titleEn: 'OWASP Agentic mapping (third-party)',
        titleZh: 'OWASP Agentic 對應（第三方）',
        date: '2026-03-30',
      },
    ],
  },
  {
    org: 'Gen Digital Sage',
    category: 'enterprise',
    noteEn: 'Norton / Avast / AVG parent (consumer security). Merged by Václav Belák.',
    noteZh: 'Norton / Avast / AVG 母公司 （消費端資安）。由 Václav Belák 合併。',
    prs: [
      {
        number: 33,
        repo: 'gendigitalinc/sage',
        titleEn: 'Rule pack',
        titleZh: '規則包',
        date: '2026-05-11',
      },
    ],
  },
];

const AWESOME_LISTS = [
  { repo: 'CryptoAILab/Awesome-LM-SSP', pr: 108 },
  { repo: 'wearetyomsmnv/Awesome-LLM-agent-Security', pr: 6 },
  { repo: 'nibzard/awesome-agentic-patterns', pr: 58 },
  { repo: 'TalEliyahu/Awesome-AI-Security', pr: 53 },
];

const STANDARDS_PIPELINE_OPEN = [
  {
    org: 'NIST AI RMF (OSCAL)',
    status: 'oscal-content #338 open, awaiting NIST review',
    detail: 'Community AI RMF profile examples (CC0), not produced or endorsed by NIST',
  },
  { org: 'promptfoo/promptfoo', status: 'PR #8529 open' },
];

export default function AdoptersContent() {
  const locale = useLocale();
  const isZh = locale.startsWith('zh');

  // Counts come from the lists on this page, so the summary cannot drift from them.
  const mergedPrs = ADOPTERS.reduce((total, adopter) => total + adopter.prs.length, 0);
  const awesomeListInclusions = AWESOME_LISTS.length;
  const mergedList = ADOPTERS.map(
    (adopter) => `${adopter.org} (${adopter.prs.map((pr) => `#${pr.number}`).join(' + ')})`
  ).join(isZh ? '、' : ', ');
  const standardsBody = STATS.adoption.standardsBodyMerges;
  const tier1 = STATS.adoption.tier1Institutions;

  return (
    <SectionWrapper>
      <header className="mb-12 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-panguard-green/30 bg-panguard-green/10 px-3 py-1 text-xs font-medium text-panguard-green">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          {isZh ? '已合併上游 · 證據可驗證' : 'Merged upstream · evidence verifiable'}
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {isZh ? 'ATR 採用者' : 'ATR Adopters'}
        </h1>
        <p className="text-lg leading-relaxed text-text-secondary">
          {isZh
            ? '每一筆採用都對應一個已合併的 GitHub PR。本頁只列出外部審閱者已合併的項目；草稿、進行中、僅自行發布的項目不在此列。'
            : 'Every adoption below corresponds to a merged GitHub PR with an external reviewer. Drafts, in-flight PRs, and self-published artifacts are not listed here.'}
        </p>
      </header>

      <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBox label={isZh ? '已合併 PR' : 'Merged PRs'} value={String(mergedPrs)} />
        <StatBox label={isZh ? '組織' : 'Organizations'} value={String(ADOPTERS.length)} />
        <StatBox label={isZh ? '標準制定機構' : 'Standards bodies'} value={String(standardsBody)} />
        <StatBox label={isZh ? 'Tier-1 在談機構' : 'Tier-1 engaged'} value={String(tier1)} />
      </div>

      <p className="-mt-8 mb-12 text-xs leading-relaxed text-text-muted">
        {isZh
          ? `已合併 PR：${mergedList}，共 ${mergedPrs} 件，涉及 ${ADOPTERS.length} 個組織。Microsoft AGT 透過 #908 + #1277 加入的規則包已於 2026-07-30 被上游移除。另有 ${awesomeListInclusions} 件 awesome-list 收錄（不視為採用）。`
          : `Merged PRs: ${mergedList} — ${mergedPrs} PRs across ${ADOPTERS.length} organizations. The rule pack Microsoft AGT received through #908 + #1277 was removed upstream on 2026-07-30. Plus ${awesomeListInclusions} awesome-list inclusions (not counted as adoption).`}
      </p>

      <SectionTitle
        title={isZh ? '已合併的貢獻' : 'Merged Contributions'}
        subtitle={isZh ? '由外部維護者審閱並合併' : 'Reviewed and merged by external maintainers'}
      />

      <div className="mt-8 space-y-6">
        {ADOPTERS.map((a) => (
          <AdopterCard key={a.org} a={a} isZh={isZh} />
        ))}
      </div>

      <div className="mt-16">
        <SectionTitle
          title={isZh ? 'Awesome List 收錄' : 'Listed in Awesome Lists'}
          subtitle={
            isZh
              ? '收錄不等於採用，但代表社群可見度'
              : 'Listing is not adoption, but reflects community visibility'
          }
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {AWESOME_LISTS.map((l) => (
            <a
              key={l.repo}
              href={`https://github.com/${l.repo}/pull/${l.pr}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-sm hover:border-border-hover"
            >
              <span className="font-mono text-text-primary">{l.repo}</span>
              <span className="inline-flex items-center gap-1 text-text-muted">
                PR #{l.pr} <ExternalLink className="h-3 w-3" aria-hidden />
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <SectionTitle
          title={isZh ? '審閱中（尚未合併）' : 'Open PRs (Not Yet Merged)'}
          subtitle={
            isZh
              ? '此列表反映進行中的對話，非採納證明。狀態為時間點快照，可能已變動——以各 PR 頁面為準'
              : 'Reflects in-flight conversations, not adoption. Statuses are point-in-time snapshots and may have changed — check each PR for current state'
          }
        />
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-1">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {isZh ? '組織／專案' : 'Org / Project'}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {isZh ? '狀態' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STANDARDS_PIPELINE_OPEN.map((row) => (
                <tr key={row.org}>
                  <td className="px-4 py-3 text-text-primary">{row.org}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="mb-2 text-base font-semibold text-text-primary">
          {isZh ? '想成為採用者？' : 'Want to become an adopter?'}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {isZh
            ? '所有規則 MIT 授權，無需簽署即可使用。完成 production 部署後請開 issue 通知，本頁會在下次發行同步更新。'
            : 'All rules are MIT-licensed; no agreement needed to use. After production deployment, open an issue to be added — this page syncs on each release.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={'/atr/governance' as never}
            className="inline-flex items-center gap-1 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-3"
          >
            {isZh ? '治理結構' : 'Governance'}
          </Link>
          <a
            href="https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/new?title=Adopter+Registration&labels=adoption&body=Organization%3A%0ARepo%20or%20product%3A%0APR%20or%20commit%20link%3A%0ABrief%20description%20of%20how%20ATR%20is%20used%3A"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-border-hover hover:bg-surface-1"
          >
            {isZh ? '註冊採用' : 'Register adoption'}
          </a>
        </div>
      </div>
    </SectionWrapper>
  );
}

function AdopterCard({ a, isZh }: { a: Adopter; isZh: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{a.org}</h3>
          {a.caveatEn ? (
            <div className="mt-1 text-xs text-amber-300">{isZh ? a.caveatZh : a.caveatEn}</div>
          ) : null}
        </div>
        <CategoryPill category={a.category} isZh={isZh} />
      </div>
      <p className="mb-4 text-sm leading-relaxed text-text-secondary">
        {isZh ? a.noteZh : a.noteEn}
      </p>
      <div className="space-y-2">
        {a.prs.map((pr) => {
          const repo = pr.repo ?? inferRepoFromOrg(a.org);
          const url = `https://github.com/${repo}/pull/${pr.number}`;
          return (
            <a
              key={pr.number}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm hover:border-border-hover"
            >
              <span className="font-mono text-text-primary">
                {repo}#{pr.number}
              </span>
              <span className="text-text-secondary">{isZh ? pr.titleZh : pr.titleEn}</span>
              <span className="font-mono text-xs text-text-muted">{pr.date}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function inferRepoFromOrg(org: string): string {
  if (org.startsWith('Microsoft Agent')) return 'microsoft/agent-governance-toolkit';
  if (org.startsWith('Cisco')) return 'cisco-ai-defense/skill-scanner';
  return 'unknown/unknown';
}

function CategoryPill({ category, isZh }: { category: Adopter['category']; isZh: boolean }) {
  const label =
    category === 'big-tech'
      ? isZh
        ? 'Big Tech'
        : 'Big Tech'
      : category === 'standards'
        ? isZh
          ? '標準制定'
          : 'Standards'
        : category === 'enterprise'
          ? isZh
            ? '企業'
            : 'Enterprise'
          : isZh
            ? '社群列表'
            : 'Awesome List';
  const color =
    category === 'big-tech'
      ? 'border-blue-400/30 bg-blue-400/10 text-blue-300'
      : category === 'standards'
        ? 'border-purple-400/30 bg-purple-400/10 text-purple-300'
        : category === 'enterprise'
          ? 'border-panguard-green/30 bg-panguard-green/10 text-panguard-green'
          : 'border-border bg-surface-2 text-text-secondary';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="font-mono text-2xl font-semibold text-text-primary">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">{label}</div>
    </div>
  );
}
