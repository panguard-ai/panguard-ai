'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/navigation';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { ExternalLink, ArrowRight } from 'lucide-react';

const REPO_BLOB = 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main';

interface Crosswalk {
  id: string;
  framework: string;
  ownerEn: string;
  ownerZh: string;
  coverage: string;
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
      '77 rule-to-category mappings; every Agentic Top 10 category has at least 4 ATR rules detecting it.',
    noteZh: '77 條規則對應；每個 Agentic Top 10 分類皆至少有 4 條 ATR 規則偵測。',
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
    coverage: '100 / 113 techniques',
    noteEn:
      'ATR is to ATLAS what Sigma is to ATT&CK — the executable layer for ATLAS adversarial TTPs.',
    noteZh: 'ATR 對 ATLAS 的關係，等同 Sigma 對 ATT&CK — ATLAS 攻擊技術的可執行層。',
  },
  {
    id: 'nist-ai-rmf',
    framework: 'NIST AI RMF (AI 100-1 + GenAI Profile 600-1)',
    ownerEn: 'NIST',
    ownerZh: 'NIST',
    coverage: 'OSCAL Path 1 accepted',
    noteEn:
      'Community OSCAL catalog v0.3 published 2026-05-10, covering all four AI RMF functions (Govern/Map/Measure/Manage). Acceptance email received 2026-05-11.',
    noteZh:
      '社群 OSCAL catalog v0.3 於 2026-05-10 釋出，涵蓋 AI RMF 四大功能 (Govern/Map/Measure/Manage)。2026-05-11 收到 acceptance email。',
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
      '對應高風險 AI 系統的第 15 條 (準確性／穩健性／資安) 義務。已向 EU AI Office Have-Your-Say 提交 (截止 2026-06-03)。',
  },
  {
    id: 'safe-mcp',
    framework: 'SAFE-MCP (OpenSSF)',
    ownerEn: 'OpenSSF SAFE-MCP project',
    ownerZh: 'OpenSSF SAFE-MCP project',
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
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          {isZh
            ? '對應 · 政策框架 ↔ 可執行偵測'
            : 'Crosswalks · Policy frameworks ↔ executable detection'}
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          {isZh ? 'ATR 對應其他框架' : 'ATR Framework Crosswalks'}
        </h1>
        <p className="text-lg leading-relaxed text-slate-600">
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
          bodyEn="421 rules with deterministic YAML detectors and reproducible test cases."
          bodyZh="421 條具備確定性 YAML 偵測器與可重現測試案例的規則。"
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

      <div className="mt-16 rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="mb-2 text-base font-semibold text-amber-900">
          {isZh ? '採用建議' : 'Adoption guidance'}
        </h3>
        <p className="text-sm leading-relaxed text-amber-900">
          {isZh
            ? '若你的組織需依循 NIST AI RMF / ISO 42001 / EU AI Act，可以將 ATR 規則的偵測結果直接作為合規證據 (audit evidence)。每條規則的 compliance 欄位都對應到特定條款。'
            : 'If your organization follows NIST AI RMF, ISO 42001, or EU AI Act, ATR rule findings can be submitted as audit evidence — each rule’s compliance field maps to specific clauses.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={'/atr/spec' as never}
            className="inline-flex items-center gap-1 rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            {isZh ? '核心規範 §9' : 'Spec §9 Crosswalks'}
          </Link>
          <Link
            href={'/atr/adopters' as never}
            className="inline-flex items-center gap-1 rounded-md border border-amber-900 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
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
    <div className="rounded-lg border border-slate-200 p-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{c.framework}</h3>
          <div className="text-xs text-slate-500">{isZh ? c.ownerZh : c.ownerEn}</div>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          {c.coverage}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{isZh ? c.noteZh : c.noteEn}</p>
      {c.doc ? (
        <a
          href={c.doc}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
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
  const cls = accent ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200';
  return (
    <div className={`rounded-lg border p-5 ${cls}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {isZh ? headZh : headEn}
      </div>
      <p className="text-sm leading-relaxed text-slate-700">{isZh ? bodyZh : bodyEn}</p>
    </div>
  );
}

function ArrowCard({ isZh }: { isZh: boolean }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 p-5">
      <ArrowRight className="h-6 w-6 text-slate-400" aria-label={isZh ? '對應到' : 'maps to'} />
    </div>
  );
}
