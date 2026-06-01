/**
 * Types for the gov-grade deliverable report.
 *
 * This is the findings-based assessment deliverable a Partner/JV hands to a
 * client (e.g. a bank's security team): a pen-test style body (findings by
 * severity, CVSS, evidence, remediation) cross-walked to compliance controls
 * (finding -> ATR rule -> framework control) plus an attestation + integrity
 * block. Distinct from `report-generator.ts`, which produces a rule->control
 * coverage matrix rather than a findings deliverable.
 *
 * All shapes are plain data so the pure logic in `logic.ts` stays testable
 * and the PDF generator in `generator.ts` is a thin rendering layer on top.
 */

import type { ReportFramework, Severity } from '@/lib/types';

/** Document handling classification, printed as a banner on every page. */
export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';

/** Output languages the deliverable supports. */
export type ReportLanguage = 'en' | 'zh-Hant';

/**
 * One framework control a finding maps to. `framework` reuses the app-wide
 * `ReportFramework` union; `identifier` is the control id within it (e.g.
 * an EU AI Act article, an ISO clause, an OWASP id). `context` explains the
 * mapping; `strength` mirrors the ATR compliance-block vocabulary.
 */
export interface ControlRef {
  framework: ReportFramework;
  identifier: string;
  context?: string;
  strength?: 'primary' | 'secondary' | 'partial';
}

/**
 * A single assessment finding. Carries its own `controls` explicitly so the
 * generator never has to reach into ATR YAML at render time — control
 * resolution is a separate adapter concern (keeps this unit testable).
 */
export interface DeliverableFinding {
  /** Stable finding id, e.g. "PG-001" or a scan finding id. */
  id: string;
  title: string;
  severity: Severity;
  /** Domain category, e.g. "tool-poisoning", "network". Optional. */
  category?: string;
  /** ATR rule that detected this, e.g. "ATR-2026-00540". Optional. */
  atrRuleId?: string;
  /** Host / endpoint / asset the finding applies to. Optional. */
  affectedAsset?: string;
  /** What the finding is, in prose. */
  description: string;
  /** Redacted evidence excerpt (never raw secrets/payloads). Optional. */
  evidence?: string;
  /** CVSS v3.1 base score 0.0-10.0. Optional. */
  cvss?: number;
  /** CVSS v3.1 vector string. Optional. */
  cvssVector?: string;
  /** Remediation guidance. */
  remediation: string;
  /** Framework controls this finding is traceable to. May be empty. */
  controls?: ReadonlyArray<ControlRef>;
}

/** Branding overrides a partner can supply (white-label footer / legal name). */
export interface ReportBranding {
  legalName?: string;
  reportFooter?: string;
  primaryColor?: string;
}

/** Who/what the assessment was performed by and for. */
export interface AssessmentParty {
  /** Display name (org or person). */
  name: string;
  /** Optional sub-line, e.g. role, dept, or registration number. */
  detail?: string;
}

/**
 * Everything needed to render one deliverable. Pure data — no Supabase rows,
 * no Buffers. The caller (a server action) is responsible for assembling this
 * from workspace events / scan results before invoking the generator.
 */
export interface DeliverableReportInput {
  /** Client the report is prepared for (the bank, the agency). */
  client: AssessmentParty;
  /** Assessor who prepared it (the partner / JV). */
  assessor: AssessmentParty;
  region: 'eu' | 'us' | 'apac' | 'global';
  classification: Classification;
  /** Headline framework the deliverable is organised around. */
  primaryFramework: ReportFramework;
  findings: ReadonlyArray<DeliverableFinding>;
  /** Scope statement bullet points (systems, time window, exclusions). */
  scope: ReadonlyArray<string>;
  /** Methodology bullet points; falls back to a regional default if empty. */
  methodology?: ReadonlyArray<string>;
  language: ReportLanguage;
  /** Human-facing document id, e.g. "PG-RPT-2026-0042". */
  reportId: string;
  /** Document version, e.g. "1.0". */
  version: string;
  /** ISO date (YYYY-MM-DD) the report is dated. */
  reportDate: string;
  /** Name printed on the attestation/sign-off line. */
  preparedBy: string;
  /** Optional reviewer printed alongside preparedBy. */
  reviewedBy?: string;
  /** Optional HMAC signing key; when present a signature is embedded. */
  signingKey?: string;
  branding?: ReportBranding;
  /** Optional explicit ATR logo path override (else resolved from assets). */
  logoPath?: string;
}

/** Per-severity tally with all bands present (zeroes included). */
export type SeverityCounts = Record<Severity, number>;

/** One row of the finding -> control traceability matrix. */
export interface TraceabilityRow {
  findingId: string;
  findingTitle: string;
  severity: Severity;
  atrRuleId: string | null;
  framework: ReportFramework;
  controlIdentifier: string;
  context: string;
}

/** Result of rendering a deliverable. */
export interface DeliverableReportResult {
  buffer: Buffer;
  contentType: 'application/pdf';
  sha256: string;
  hmacSha256: string | null;
  findingCount: number;
  severityCounts: SeverityCounts;
  /** Page count of the produced PDF. */
  pageCount: number;
}
