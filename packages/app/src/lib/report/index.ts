/**
 * Public surface of the deliverable report module. Server actions / API routes
 * should import from here, not from individual files.
 */

export { generateDeliverableReport } from './generator';
export {
  buildTraceabilityRows,
  complianceFrameworksForRegion,
  computeIntegrityHash,
  countBySeverity,
  cvssRatingLabel,
  defaultMethodology,
  frameworkDisplayName,
  overallRiskRating,
  signIntegrity,
  sortFindingsBySeverity,
  validateReportInput,
  SEVERITY_ORDER,
} from './logic';
export { resolveAtrLogoPath } from './assets';
export type {
  AssessmentParty,
  Classification,
  ControlRef,
  DeliverableFinding,
  DeliverableReportInput,
  DeliverableReportResult,
  ReportBranding,
  ReportLanguage,
  SeverityCounts,
  TraceabilityRow,
} from './types';
export type { RiskRating } from './logic';
