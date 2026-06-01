/**
 * Bilingual (English / Traditional Chinese) UI strings for the deliverable.
 * Keeping all copy in one typed table means the section renderers stay
 * language-agnostic and adding a locale is a single object literal.
 */

import type { Severity } from '@/lib/types';
import type { Classification, ReportLanguage } from './types';
import type { RiskRating } from './logic';

export interface ReportLabels {
  documentTitle: string;
  subtitle: string;
  cover: {
    client: string;
    assessor: string;
    reportId: string;
    version: string;
    date: string;
    classification: string;
    framework: string;
  };
  sections: {
    documentControl: string;
    confidentiality: string;
    executiveSummary: string;
    scope: string;
    methodology: string;
    findingsSummary: string;
    detailedFindings: string;
    traceability: string;
    attestation: string;
    integrity: string;
  };
  table: {
    severity: string;
    count: string;
    finding: string;
    id: string;
    asset: string;
    cvss: string;
    control: string;
    framework: string;
    context: string;
    atrRule: string;
    description: string;
    evidence: string;
    remediation: string;
  };
  severity: Record<Severity, string>;
  riskRating: Record<RiskRating, string>;
  classification: Record<Classification, string>;
  confidentialityNotice: string;
  attestationStatement: string;
  integrityNote: string;
  overallRiskLine: string;
  noFindings: string;
  preparedBy: string;
  reviewedBy: string;
  page: (n: number, total: number) => string;
}

const EN: ReportLabels = {
  documentTitle: 'AI Agent Security Assessment Report',
  subtitle: 'Findings, CVSS ratings, and compliance control traceability',
  cover: {
    client: 'Client',
    assessor: 'Assessor',
    reportId: 'Report ID',
    version: 'Version',
    date: 'Report date',
    classification: 'Classification',
    framework: 'Primary framework',
  },
  sections: {
    documentControl: 'Document Control',
    confidentiality: 'Confidentiality Notice',
    executiveSummary: 'Executive Summary',
    scope: 'Scope of Assessment',
    methodology: 'Methodology',
    findingsSummary: 'Findings Summary',
    detailedFindings: 'Detailed Findings',
    traceability: 'Compliance Control Traceability',
    attestation: 'Attestation',
    integrity: 'Report Integrity',
  },
  table: {
    severity: 'Severity',
    count: 'Count',
    finding: 'Finding',
    id: 'ID',
    asset: 'Affected asset',
    cvss: 'CVSS',
    control: 'Control',
    framework: 'Framework',
    context: 'Mapping context',
    atrRule: 'ATR rule',
    description: 'Description',
    evidence: 'Evidence (redacted)',
    remediation: 'Remediation',
  },
  severity: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Informational',
  },
  riskRating: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Informational',
    none: 'No findings',
  },
  classification: {
    public: 'PUBLIC',
    internal: 'INTERNAL',
    confidential: 'CONFIDENTIAL',
    restricted: 'RESTRICTED',
  },
  confidentialityNotice:
    'This report contains the results of a security assessment and is intended solely for the named recipient. It may include sensitive information about security weaknesses. Distribution, reproduction, or disclosure beyond the authorised recipient is prohibited without written consent.',
  attestationStatement:
    'This assessment was performed against the Agent Threat Rules (ATR) open detection standard. The findings and control mappings recorded herein reflect the state of the assessed systems as of the report date. The integrity hash below allows the recipient to verify that this document has not been altered after issuance.',
  integrityNote:
    'Recompute the SHA-256 over the canonical report content to verify integrity. A matching HMAC (when present) additionally proves issuance by the holder of the signing key.',
  overallRiskLine: 'Overall risk rating',
  noFindings: 'No findings were identified within the assessment scope.',
  preparedBy: 'Prepared by',
  reviewedBy: 'Reviewed by',
  page: (n, total) => `Page ${n} of ${total}`,
};

const ZH: ReportLabels = {
  documentTitle: 'AI 代理人安全評估報告',
  subtitle: '發現項目、CVSS 評級與合規控制項追溯',
  cover: {
    client: '受評單位',
    assessor: '評估單位',
    reportId: '報告編號',
    version: '版本',
    date: '報告日期',
    classification: '機密等級',
    framework: '主要框架',
  },
  sections: {
    documentControl: '文件控制',
    confidentiality: '保密聲明',
    executiveSummary: '執行摘要',
    scope: '評估範圍',
    methodology: '評估方法',
    findingsSummary: '發現摘要',
    detailedFindings: '詳細發現',
    traceability: '合規控制項追溯',
    attestation: '簽核聲明',
    integrity: '報告完整性',
  },
  table: {
    severity: '嚴重度',
    count: '數量',
    finding: '發現項目',
    id: '編號',
    asset: '受影響資產',
    cvss: 'CVSS',
    control: '控制項',
    framework: '框架',
    context: '對應說明',
    atrRule: 'ATR 規則',
    description: '說明',
    evidence: '證據（已去識別化）',
    remediation: '修復建議',
  },
  severity: {
    critical: '嚴重',
    high: '高',
    medium: '中',
    low: '低',
    info: '參考',
  },
  riskRating: {
    critical: '嚴重',
    high: '高',
    medium: '中',
    low: '低',
    info: '參考',
    none: '無發現',
  },
  classification: {
    public: '公開',
    internal: '內部',
    confidential: '機密',
    restricted: '限閱',
  },
  confidentialityNotice:
    '本報告載有安全評估結果，僅供指名之受文者使用，可能包含安全弱點之敏感資訊。未經書面同意，不得超出授權受文者範圍散布、複製或揭露。',
  attestationStatement:
    '本評估依據 Agent Threat Rules (ATR) 開放偵測標準執行。報告所載之發現與控制項對應，反映受評系統於報告日期之狀態。下方完整性雜湊值可供受文者驗證本文件於核發後未遭竄改。',
  integrityNote:
    '可對報告之正規化內容重新計算 SHA-256 以驗證完整性。若附有相符之 HMAC，另可證明本報告係由持有簽章金鑰者所核發。',
  overallRiskLine: '整體風險評級',
  noFindings: '於評估範圍內未發現任何項目。',
  preparedBy: '製作',
  reviewedBy: '覆核',
  page: (n, total) => `第 ${n} 頁，共 ${total} 頁`,
};

/** Resolve the label table for a language. */
export function labelsFor(language: ReportLanguage): ReportLabels {
  return language === 'zh-Hant' ? ZH : EN;
}
