'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/navigation';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { FileText, GitBranch, Layers, BookOpen, ExternalLink } from 'lucide-react';

const REPO_RAW = 'https://raw.githubusercontent.com/Agent-Threat-Rule/agent-threat-rules/main';
const REPO_BLOB = 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main';

interface SectionRow {
  num: string;
  en: string;
  zh: string;
  anchor: string;
}

const SECTIONS: readonly SectionRow[] = [
  { num: '1', en: 'Abstract', zh: '摘要', anchor: '1-abstract' },
  { num: '2', en: 'Introduction', zh: '導論', anchor: '2-introduction' },
  {
    num: '3',
    en: 'Conventions and Terminology (RFC 2119)',
    zh: '規範性用語',
    anchor: '3-conventions-and-terminology',
  },
  {
    num: '4',
    en: 'Rule Identifier (ATR-YYYY-NNNNN)',
    zh: '規則識別碼',
    anchor: '4-rule-identifier',
  },
  {
    num: '5',
    en: 'Rule Document Structure',
    zh: '規則文件結構',
    anchor: '5-rule-document-structure',
  },
  { num: '6', en: 'Detection Semantics', zh: '偵測語意', anchor: '6-detection-semantics' },
  { num: '7', en: 'Match Output', zh: '比對輸出', anchor: '7-match-output' },
  { num: '8', en: 'Canonical Categories (10)', zh: '正式分類', anchor: '8-canonical-categories' },
  {
    num: '9',
    en: 'Crosswalks (OWASP/NIST/ISO/MITRE)',
    zh: '對應其他標準',
    anchor: '9-crosswalks-optional',
  },
  { num: '10', en: 'Versioning (SemVer)', zh: '版本政策', anchor: '10-versioning' },
  {
    num: '11',
    en: 'Conformance Levels L1/L2/L3',
    zh: '一致性等級',
    anchor: '11-conformance-levels',
  },
  {
    num: '12',
    en: 'Conformance Test Suite',
    zh: '一致性測試套件',
    anchor: '12-conformance-test-suite',
  },
  {
    num: '13',
    en: 'Security and Privacy Considerations',
    zh: '安全與隱私考量',
    anchor: '13-security-and-privacy-considerations',
  },
  {
    num: '14',
    en: 'IANA Considerations',
    zh: 'IANA 媒體類型註冊',
    anchor: '14-iana-considerations',
  },
];

const LEVELS = [
  {
    level: 'L1',
    en: 'Loads the published Corpus without parse errors. Emits Match output per Section 7.',
    zh: '可載入官方規則集無錯，能依規範產生比對輸出。',
  },
  {
    level: 'L2',
    en: '100% pass on Conformance Test Suite (100 TP + 100 TN fixtures) for the declared Spec version.',
    zh: '通過 100 個攻擊 + 100 個良性 fixture 的全套測試。',
  },
  {
    level: 'L3',
    en: 'Passes L2 AND emits output in ≥2 interchange formats (JSON + SARIF/STIX 2.1/MISP/OpenCTI). Publishes FP rate on the public benign corpus.',
    zh: 'L2 加上至少兩種交換格式輸出，且公開 FP 率。',
  },
] as const;

export default function SpecContent() {
  const locale = useLocale();
  const isZh = locale.startsWith('zh');

  return (
    <SectionWrapper>
      <FadeHeader isZh={isZh} />

      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        <StatBox
          label={isZh ? '規格版本' : 'Spec Version'}
          value="1.0.0"
          sub={isZh ? '草案 · 2026-05-16' : 'Draft · 2026-05-16'}
        />
        <StatBox
          label={isZh ? '規範性語言' : 'Normative Language'}
          value="RFC 2119"
          sub={isZh ? '加 RFC 8174 大小寫澄清' : 'with RFC 8174 case clarification'}
        />
        <StatBox
          label={isZh ? '一致性等級' : 'Conformance Tiers'}
          value="L1 / L2 / L3"
          sub={isZh ? '見 §11' : 'see §11'}
        />
      </div>

      <SectionTitle
        title={isZh ? '規範文件目錄' : 'Specification Outline'}
        subtitle={
          isZh
            ? '完整規範採 IETF RFC 風格撰寫，使用 BCP 14 的 MUST/SHOULD/MAY 規範性語言。'
            : 'Full specification authored in IETF RFC style with BCP 14 normative MUST/SHOULD/MAY.'
        }
      />

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-1">
            <tr>
              <th className="px-4 py-3 font-medium text-text-secondary">§</th>
              <th className="px-4 py-3 font-medium text-text-secondary">
                {isZh ? '章節' : 'Section'}
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary">
                {isZh ? '連結' : 'Link'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SECTIONS.map((s) => (
              <tr key={s.num} className="hover:bg-surface-1">
                <td className="px-4 py-3 font-mono text-text-muted">{s.num}</td>
                <td className="px-4 py-3 text-text-primary">{isZh ? s.zh : s.en}</td>
                <td className="px-4 py-3">
                  <a
                    href={`${REPO_BLOB}/SPEC.md#${s.anchor}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-sage hover:underline"
                  >
                    {isZh ? '閱讀' : 'Read'} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16">
        <SectionTitle
          title={isZh ? '一致性等級' : 'Conformance Levels'}
          subtitle={
            isZh
              ? '任何引擎要宣稱「ATR-Compatible」必須先公開其一致性等級與可重現的測試報告。'
              : 'Any engine claiming "ATR-Compatible" must declare a conformance level with a reproducible test report.'
          }
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {LEVELS.map((lvl) => (
            <div key={lvl.level} className="rounded-2xl border border-border bg-surface-1 p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-brand-sage">
                <Layers className="h-5 w-5" aria-hidden />
              </div>
              <div className="mb-2 font-mono text-lg font-semibold text-text-primary">
                {lvl.level}
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">{isZh ? lvl.zh : lvl.en}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <SectionTitle
          title={isZh ? '相關文件' : 'Related Artifacts'}
          subtitle={isZh ? '規格、Schema 與資料規範' : 'Spec, schema, and data artifacts'}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <LinkCard
            icon={<FileText className="h-5 w-5" />}
            title="SPEC.md"
            desc={
              isZh
                ? '完整規範文件，RFC 2119 規範性語言'
                : 'Full normative specification with RFC 2119 language'
            }
            href={`${REPO_BLOB}/SPEC.md`}
          />
          <LinkCard
            icon={<GitBranch className="h-5 w-5" />}
            title="atr-schema.yaml"
            desc={isZh ? '機器可讀的 YAML schema' : 'Machine-readable YAML schema'}
            href={`${REPO_BLOB}/spec/atr-schema.yaml`}
          />
          <LinkCard
            icon={<BookOpen className="h-5 w-5" />}
            title="THREAT-MODEL.md"
            desc={isZh ? '威脅模型與設計理由' : 'Threat model and design rationale'}
            href={`${REPO_BLOB}/THREAT-MODEL.md`}
          />
          <LinkCard
            icon={<FileText className="h-5 w-5" />}
            title="stats.json"
            desc={
              isZh ? '所有公開數字的唯一來源' : 'Single source of truth for all published numbers'
            }
            href={`${REPO_RAW}/stats.json`}
          />
        </div>
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="mb-2 text-base font-semibold text-text-primary">
          {isZh ? '對標準制定機構審閱者的說明' : 'Note to standards-body reviewers'}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {isZh
            ? '本規格採用 BCP 14 規範性語言、明定一致性測試套件、SemVer 版本契約，並要求 IANA 媒體類型註冊。歡迎以 IETF Internet-Draft 或 OASIS Technical Committee 形式提出意見與正式採納。聯絡：adam@agentthreatrule.org'
            : 'This specification uses BCP 14 normative language, defines a conformance test suite, commits to a SemVer contract, and requests IANA media-type registration. Submissions for formal adoption (IETF Internet-Draft, OASIS TC) are welcomed at adam@agentthreatrule.org.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={'/atr/governance' as never}
            className="inline-flex items-center gap-1 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-3"
          >
            {isZh ? '治理結構' : 'Governance'}
          </Link>
          <Link
            href={'/atr/cite' as never}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-border-hover hover:bg-surface-1"
          >
            {isZh ? '引用方式' : 'How to Cite'}
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}

function FadeHeader({ isZh }: { isZh: boolean }) {
  return (
    <div className="mb-12 max-w-3xl">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs font-medium text-brand-sage">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-sage" />
        {isZh ? '規範 · 草案 · v1.0.0' : 'Specification · Draft · v1.0.0'}
      </div>
      <h1 className="mb-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
        {isZh ? 'ATR 核心規範' : 'ATR Core Specification'}
      </h1>
      <p className="text-lg leading-relaxed text-text-secondary">
        {isZh
          ? '定義 ATR 規則的格式、識別碼、偵測語意、一致性等級與 IANA 媒體類型。此規範為實作者撰寫，不是行銷文件 — 採 IETF RFC 風格，使用 BCP 14 的 MUST/SHOULD/MAY 規範性語言，並承諾 SemVer 版本契約。'
          : 'The normative wire format, identifier scheme, evaluation semantics, conformance levels, and IANA media types for ATR rules. Written for implementers, not marketing — IETF RFC style, BCP 14 normative language, SemVer contract.'}
      </p>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-text-primary">{value}</div>
      <div className="mt-1 text-xs text-text-muted">{sub}</div>
    </div>
  );
}

function LinkCard({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex gap-4 rounded-2xl border border-border bg-surface-1 p-5 hover:border-border-hover hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-secondary group-hover:bg-surface-3 group-hover:text-brand-sage">
        {icon}
      </div>
      <div>
        <div className="font-mono text-sm font-semibold text-text-primary">{title}</div>
        <div className="mt-1 text-sm text-text-secondary">{desc}</div>
      </div>
    </a>
  );
}
