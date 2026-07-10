'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/navigation';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { STATS } from '@/lib/stats';
import { ExternalLink, ArrowRight } from 'lucide-react';

const REPO_BLOB = 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main';

interface Crosswalk {
  id: string;
  framework: string;
  ownerEn: string;
  ownerZh: string;
  coverage: string;
  coverageZh?: string;
  noteEn: string;
  noteZh: string;
  doc?: string;
}

const CROSSWALKS: readonly Crosswalk[] = [
  {
    id: 'owasp-agentic',
    framework: 'OWASP Agentic Top 10 (2026)',
    ownerEn: 'OWASP Gen AI Security Project',
    ownerZh: 'OWASP Gen AI Security Project',
    coverage: '10 / 10',
    noteEn:
      '866 rule-to-category mappings; every Agentic Top 10 category has at least 4 ATR rules detecting it.',
    noteZh: '866 條規則對應；每個 Agentic Top 10 分類皆至少有 4 條 ATR 規則偵測。',
    doc: `${REPO_BLOB}/docs/OWASP-AGENTIC-MAPPING.md`,
  },
  {
    id: 'owasp-llm',
    framework: 'OWASP LLM Top 10 (2025)',
    ownerEn: 'OWASP Gen AI Security Project',
    ownerZh: 'OWASP Gen AI Security Project',
    coverage: '10 / 10',
    noteEn:
      'Per-rule compliance.owasp_llm field; LLM01 prompt injection has the heaviest coverage.',
    noteZh: '每條規則 compliance.owasp_llm 欄位；LLM01 prompt injection 涵蓋最深。',
    doc: `${REPO_BLOB}/docs/OWASP-MAPPING.md`,
  },
  {
    id: 'mitre-atlas',
    framework: 'MITRE ATLAS',
    ownerEn: 'MITRE Corporation',
    ownerZh: 'MITRE Corporation',
    coverage: '34 / 101 top-level techniques',
    noteEn:
      'ATR maps to 34 of 101 top-level ATLAS techniques (13 of 16 tactics), ATLAS v5.6.0 draft alignment 2026-06. Coverage is partial and grows as rules land — the goal is an executable detection layer for ATLAS TTPs, as Sigma is for ATT&CK.',
    noteZh:
      'ATR 對應 101 個 ATLAS 頂層技術中的 34 個（16 個戰術中的 13 個），ATLAS v5.6.0 草稿對齊，2026-06。覆蓋為部分、隨規則新增持續擴大——目標是成為 ATLAS 攻擊技術的可執行偵測層，如同 Sigma 之於 ATT&CK。',
  },
  {
    id: 'nist-ai-rmf',
    framework: 'NIST AI RMF (AI 100-1 + GenAI Profile 600-1)',
    ownerEn: 'NIST',
    ownerZh: 'NIST',
    coverage: 'Submission in review (PR #338 open)',
    coverageZh: '提交審查中（PR #338 開放中）',
    noteEn:
      'Community-authored OSCAL catalog covering all four AI RMF functions, submitted to the NIST OSCAL team; PR usnistgov/oscal-content#338 is open and in review. Not a NIST endorsement.',
    noteZh:
      '社群撰寫的 OSCAL catalog 涵蓋 AI RMF 四大功能，已提交至 NIST OSCAL 團隊；PR usnistgov/oscal-content#338 為開放中、審查中。非 NIST 背書。',
    doc: 'https://github.com/Agent-Threat-Rule/ai-rmf-oscal-catalog',
  },
  {
    id: 'iso-42001',
    framework: 'ISO/IEC 42001 (AI Management System)',
    ownerEn: 'ISO/IEC JTC1 SC42',
    ownerZh: 'ISO/IEC JTC1 SC42',
    coverage: 'Annex A controls',
    noteEn:
      'Per-rule compliance.iso_iec_42001 field maps detections to specific Annex A clauses. Useful for AIMS certification audit evidence.',
    noteZh: '每條規則 compliance.iso_iec_42001 欄位指向特定 Annex A 條款，作為 AIMS 認證審計證據。',
  },
  {
    id: 'eu-ai-act',
    framework: 'EU AI Act',
    ownerEn: 'European Commission',
    ownerZh: '歐盟執委會',
    coverage: 'Art. 15 (Accuracy/Robustness/Cybersecurity)',
    noteEn:
      'Detections aligned with Art. 15 obligations for high-risk AI systems. Submission filed to EU AI Office Have-Your-Say (deadline 2026-06-03).',
    noteZh:
      '對應高風險 AI 系統的第 15 條 （準確性／穩健性／資安） 義務。已向 EU AI Office Have-Your-Say 提交 （截止 2026-06-03）。',
  },
  {
    id: 'safe-mcp',
    framework: 'SAFE-MCP (OpenSSF)',
    ownerEn: 'Safe Agentic Framework (safe-agentic-framework/safe-mcp)',
    ownerZh: 'Safe Agentic Framework (safe-agentic-framework/safe-mcp)',
    coverage: '78 / 85 techniques (91.8%)',
    noteEn:
      'Highest coverage of MCP-specific attack patterns. Detailed mapping in SAFE-MCP-MAPPING.md.',
    noteZh: '對 MCP 特定攻擊模式覆蓋度最高。詳細對應見 SAFE-MCP-MAPPING.md。',
    doc: `${REPO_BLOB}/docs/SAFE-MCP-MAPPING.md`,
  },
  {
    id: 'five-eyes',
    framework: 'Five Eyes Joint Guidance (CISA / NSA / NCSC / ASD / CCCS / NZ NCSC)',
    ownerEn: 'Five Eyes intelligence alliance',
    ownerZh: 'Five Eyes 情報聯盟',
    coverage: '5 / 5 careful-adoption categories',
    noteEn:
      'Joint guidance published 2026-05-01 calls for runtime detection of known attack patterns; ATR is the open MIT-licensed detection layer the guidance requires.',
    noteZh:
      '2026-05-01 發佈的聯合指導要求對已知攻擊模式做執行期偵測；ATR 是該指導所需的開放 MIT 授權偵測層。',
    doc: `${REPO_BLOB}/docs/FIVE-EYES-MAPPING.md`,
  },
  {
    id: 'cve-cisa-kev',
    framework: 'CISA KEV Catalog',
    ownerEn: 'CISA',
    ownerZh: 'CISA',
    coverage: '1 active KEV (CVE-2026-42208)',
    noteEn:
      'Auto-sync from CISA KEV ingests new entries within 24 hours. CVE-2026-42208 (LiteLLM SQL injection, CVSS 9.3) detected by ATR-2026-00451.',
    noteZh:
      'CISA KEV 自動同步 24 小時內納入新項目。CVE-2026-42208 (LiteLLM SQL injection, CVSS 9.3) 由 ATR-2026-00451 偵測。',
  },
];

export default function CrosswalksContent() {
  const locale = useLocale();
  const isZh = locale.startsWith('zh');

  return (
    <SectionWrapper>
      <header className="mb-12 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs font-medium text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-sage" />
          {isZh
            ? '對應 · 政策框架 ↔ 可執行偵測'
            : 'Crosswalks · Policy frameworks ↔ executable detection'}
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {isZh ? 'ATR 對應其他框架' : 'ATR Framework Crosswalks'}
        </h1>
        <p className="text-lg leading-relaxed text-text-secondary">
          {isZh
            ? 'ATR 不取代任何政策框架。ATR 是把這些框架在掃描時可執行的偵測規則層 — Sigma 之於 ATT&CK、YARA 之於 malware。下方為已發佈對應表。'
            : 'ATR does not replace policy frameworks. It is the executable detection layer that operationalizes them at scan time — Sigma is to ATT&CK what ATR is to ATLAS. Published mappings below.'}
        </p>
      </header>

      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        <CalloutCard
          headEn="Policy says what"
          headZh="政策說該偵測什麼"
          bodyEn="NIST AI RMF, ISO 42001, OWASP Top 10, EU AI Act Art. 15."
          bodyZh="NIST AI RMF、ISO 42001、OWASP Top 10、EU AI Act 第 15 條。"
          isZh={isZh}
        />
        <ArrowCard isZh={isZh} />
        <CalloutCard
          headEn="ATR says how to detect"
          headZh="ATR 說怎麼偵測"
          bodyEn={`${STATS.totalRulesDisplay} rules with deterministic YAML detectors and reproducible test cases.`}
          bodyZh={`${STATS.totalRulesDisplay} 條具備確定性 YAML 偵測器與可重現測試案例的規則。`}
          isZh={isZh}
          accent
        />
      </div>

      <SectionTitle
        title={isZh ? '對應表清單' : 'Mapping Inventory'}
        subtitle={
          isZh
            ? '每條對應在 ATR repo 中均有 .md 或結構化資料'
            : 'Each mapping has a .md or structured artifact in the ATR repo'
        }
      />

      <div className="mt-8 space-y-4">
        {CROSSWALKS.map((c) => (
          <CrosswalkRow key={c.id} c={c} isZh={isZh} />
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="mb-2 text-base font-semibold text-text-primary">
          {isZh ? '採用建議' : 'Adoption guidance'}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {isZh
            ? '若你的組織需依循 NIST AI RMF / ISO 42001 / EU AI Act，可以將 ATR 規則的偵測結果直接作為合規證據 (audit evidence)。每條規則的 compliance 欄位都對應到特定條款。'
            : 'If your organization follows NIST AI RMF, ISO 42001, or EU AI Act, ATR rule findings can be submitted as audit evidence — each rule’s compliance field maps to specific clauses.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={'/atr/spec' as never}
            className="inline-flex items-center gap-1 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-3"
          >
            {isZh ? '核心規範 §9' : 'Spec §9 Crosswalks'}
          </Link>
          <Link
            href={'/atr/adopters' as never}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-border-hover hover:bg-surface-1"
          >
            {isZh ? '看採用情況' : 'See adopters'}
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}

function CrosswalkRow({ c, isZh }: { c: Crosswalk; isZh: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{c.framework}</h3>
          <div className="text-xs text-text-muted">{isZh ? c.ownerZh : c.ownerEn}</div>
        </div>
        <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-brand-sage">
          {isZh && c.coverageZh ? c.coverageZh : c.coverage}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{isZh ? c.noteZh : c.noteEn}</p>
      {c.doc ? (
        <a
          href={c.doc}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-sage hover:underline"
        >
          {isZh ? '完整對應' : 'Full mapping'} <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function CalloutCard({
  headEn,
  headZh,
  bodyEn,
  bodyZh,
  isZh,
  accent,
}: {
  headEn: string;
  headZh: string;
  bodyEn: string;
  bodyZh: string;
  isZh: boolean;
  accent?: boolean;
}) {
  const cls = accent ? 'border-brand-sage/40 bg-surface-2' : 'border-border bg-surface-1';
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {isZh ? headZh : headEn}
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{isZh ? bodyZh : bodyEn}</p>
    </div>
  );
}

function ArrowCard({ isZh }: { isZh: boolean }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface-1 p-5">
      <ArrowRight className="h-6 w-6 text-text-muted" aria-label={isZh ? '對應到' : 'maps to'} />
    </div>
  );
}
