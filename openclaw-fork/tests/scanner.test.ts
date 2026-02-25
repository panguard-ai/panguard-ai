import { describe, it, expect } from 'vitest';
import { runSecurityAudit } from '../src/scanner/vulnerability-scanner.js';
import { DEFAULT_SECURITY_POLICY } from '../src/permissions/security-policy.js';
import type { SecurityPolicy } from '../src/types.js';

describe('Vulnerability Scanner', () => {
  it('should detect CVE-2026-25253 in default policy', () => {
    const report = runSecurityAudit(DEFAULT_SECURITY_POLICY);
    const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
    expect(cve).toBeDefined();
    // Default policy has CSRF and origins configured, so it should be fixed
    expect(cve?.fixed).toBe(true);
  });

  it('should flag missing CSRF as high severity', () => {
    const weakPolicy: SecurityPolicy = {
      ...DEFAULT_SECURITY_POLICY,
      requireCsrfToken: false,
      allowedOrigins: [],
    };
    const report = runSecurityAudit(weakPolicy);
    const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
    expect(cve?.fixed).toBe(false);
    expect(cve?.severity).toBe('high');
  });

  it('should check credential storage', () => {
    const report = runSecurityAudit();
    const credFinding = report.findings.find((f) => f.id === 'OCL-SEC-001');
    expect(credFinding).toBeDefined();
    expect(credFinding?.component).toBe('Credential Storage');
  });

  it('should check skill sandbox configuration', () => {
    const report = runSecurityAudit();
    const sandboxFinding = report.findings.find((f) => f.id === 'OCL-SEC-002');
    expect(sandboxFinding).toBeDefined();
    expect(sandboxFinding?.component).toBe('Skill Sandbox');
  });

  it('should check audit logging configuration', () => {
    const report = runSecurityAudit();
    const auditFinding = report.findings.find((f) => f.id === 'OCL-SEC-003');
    expect(auditFinding).toBeDefined();
    // Default policy has audit enabled
    expect(auditFinding?.fixed).toBe(true);
  });

  it('should calculate risk score based on unfixed findings', () => {
    // Default policy: CSRF+origins OK, audit OK, but sandbox not configured
    const report = runSecurityAudit(DEFAULT_SECURITY_POLICY);
    expect(report.riskScore).toBeGreaterThanOrEqual(0);
    expect(report.riskScore).toBeLessThanOrEqual(100);
  });

  it('should have higher risk score with weaker policy', () => {
    const strongReport = runSecurityAudit(DEFAULT_SECURITY_POLICY);

    const weakPolicy: SecurityPolicy = {
      allowShellAccess: true,
      allowedDirectories: [],
      allowedCommands: [],
      requireCsrfToken: false,
      allowedOrigins: [],
      enableAuditLog: false,
    };
    const weakReport = runSecurityAudit(weakPolicy);

    expect(weakReport.riskScore).toBeGreaterThan(strongReport.riskScore);
  });

  it('should generate recommendations for unfixed findings', () => {
    const weakPolicy: SecurityPolicy = {
      ...DEFAULT_SECURITY_POLICY,
      requireCsrfToken: false,
      allowedOrigins: [],
      enableAuditLog: false,
    };
    const report = runSecurityAudit(weakPolicy);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('should include version in report', () => {
    const report = runSecurityAudit();
    expect(report.version).toBe('0.1.0');
    expect(report.timestamp).toBeTruthy();
  });
});
