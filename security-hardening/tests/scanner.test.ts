import { describe, it, expect } from 'vitest';
import { runSecurityAudit } from '../src/scanner/vulnerability-scanner.js';
import { DEFAULT_SECURITY_POLICY } from '../src/permissions/security-policy.js';
import type { SecurityPolicy } from '../src/types.js';

// ---------------------------------------------------------------------------
// Vulnerability Scanner
// ---------------------------------------------------------------------------
describe('Vulnerability Scanner', () => {
  describe('runSecurityAudit', () => {
    it('should return a valid report structure', () => {
      const report = runSecurityAudit();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeTruthy();
      expect(report.version).toBeTruthy();
      expect(Array.isArray(report.findings)).toBe(true);
      expect(typeof report.riskScore).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should include version in report', () => {
      const report = runSecurityAudit();
      expect(report.version).toBe('0.1.0');
    });

    it('should include ISO timestamp', () => {
      const report = runSecurityAudit();
      // ISO timestamp pattern
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should produce 4 findings', () => {
      const report = runSecurityAudit();
      expect(report.findings).toHaveLength(4);
    });
  });

  describe('CVE-2026-25253 (WebSocket auth)', () => {
    it('should detect CVE-2026-25253 in default policy', () => {
      const report = runSecurityAudit(DEFAULT_SECURITY_POLICY);
      const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
      expect(cve).toBeDefined();
      // Default policy has CSRF and origins configured, so it should be fixed
      expect(cve?.fixed).toBe(true);
      expect(cve?.severity).toBe('info');
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

    it('should flag missing origins even when CSRF enabled', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        requireCsrfToken: true,
        allowedOrigins: [],
      };
      const report = runSecurityAudit(policy);
      const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
      // Both CSRF and origin check needed
      expect(cve?.fixed).toBe(false);
    });

    it('should flag disabled CSRF even when origins configured', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        requireCsrfToken: false,
        allowedOrigins: ['http://localhost:18789'],
      };
      const report = runSecurityAudit(policy);
      const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
      expect(cve?.fixed).toBe(false);
    });

    it('should mark as fixed when both CSRF and origins configured', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        requireCsrfToken: true,
        allowedOrigins: ['http://localhost:18789'],
      };
      const report = runSecurityAudit(policy);
      const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
      expect(cve?.fixed).toBe(true);
      expect(cve?.severity).toBe('info');
    });

    it('should have correct component name', () => {
      const report = runSecurityAudit();
      const cve = report.findings.find((f) => f.id === 'CVE-2026-25253');
      expect(cve?.component).toBe('WebSocket Gateway');
    });
  });

  describe('OCL-SEC-001 (Credential storage)', () => {
    it('should check credential storage', () => {
      const report = runSecurityAudit();
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-001');
      expect(finding).toBeDefined();
      expect(finding?.component).toBe('Credential Storage');
    });

    it('should include remediation guidance', () => {
      const report = runSecurityAudit();
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-001');
      expect(finding?.remediation).toContain('EncryptedFileCredentialStore');
    });
  });

  describe('OCL-SEC-002 (Skill sandbox)', () => {
    it('should check skill sandbox configuration', () => {
      const report = runSecurityAudit();
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-002');
      expect(finding).toBeDefined();
      expect(finding?.component).toBe('Skill Sandbox');
    });

    it('should mark sandbox as unfixed when shell is enabled and no restrictions', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: true,
        allowedDirectories: [],
        allowedCommands: [],
      };
      const report = runSecurityAudit(policy);
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-002');
      expect(finding?.fixed).toBe(false);
      expect(finding?.severity).toBe('medium');
    });

    it('should mark sandbox as fixed when shell disabled and dirs configured', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: false,
        allowedDirectories: ['/tmp'],
        allowedCommands: [],
      };
      const report = runSecurityAudit(policy);
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-002');
      expect(finding?.fixed).toBe(true);
    });

    it('should mark sandbox as fixed when shell disabled and commands configured', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: false,
        allowedDirectories: [],
        allowedCommands: ['ls', 'cat'],
      };
      const report = runSecurityAudit(policy);
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-002');
      expect(finding?.fixed).toBe(true);
    });

    it('should mark sandbox as unfixed when shell disabled and no restrictions', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        allowShellAccess: false,
        allowedDirectories: [],
        allowedCommands: [],
      };
      const report = runSecurityAudit(policy);
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-002');
      expect(finding?.fixed).toBe(false);
    });
  });

  describe('OCL-SEC-003 (Audit logging)', () => {
    it('should check audit logging configuration', () => {
      const report = runSecurityAudit();
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-003');
      expect(finding).toBeDefined();
      // Default policy has audit enabled
      expect(finding?.fixed).toBe(true);
    });

    it('should flag disabled audit logging', () => {
      const policy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        enableAuditLog: false,
      };
      const report = runSecurityAudit(policy);
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-003');
      expect(finding?.fixed).toBe(false);
      expect(finding?.severity).toBe('low');
    });

    it('should have correct component name', () => {
      const report = runSecurityAudit();
      const finding = report.findings.find((f) => f.id === 'OCL-SEC-003');
      expect(finding?.component).toBe('Audit System');
    });
  });

  describe('Risk score calculation', () => {
    it('should calculate risk score between 0 and 100', () => {
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

    it('should cap risk score at 100', () => {
      // Even with all vulnerabilities, score should not exceed 100
      const weakPolicy: SecurityPolicy = {
        allowShellAccess: true,
        allowedDirectories: [],
        allowedCommands: [],
        requireCsrfToken: false,
        allowedOrigins: [],
        enableAuditLog: false,
      };
      const report = runSecurityAudit(weakPolicy);
      expect(report.riskScore).toBeLessThanOrEqual(100);
    });

    it('should have low risk for well-configured policy', () => {
      const securePolicy: SecurityPolicy = {
        allowShellAccess: false,
        allowedDirectories: ['/tmp/safe'],
        allowedCommands: ['ls', 'cat'],
        requireCsrfToken: true,
        allowedOrigins: ['http://localhost:18789'],
        enableAuditLog: true,
      };
      const report = runSecurityAudit(securePolicy);
      // With a secure policy, risk should be low (only credential scan may vary)
      expect(report.riskScore).toBeLessThanOrEqual(50);
    });
  });

  describe('Recommendations', () => {
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

    it('should not include recommendations for fixed findings', () => {
      const report = runSecurityAudit(DEFAULT_SECURITY_POLICY);
      // Recommendations should only be for unfixed findings
      const unfixedCount = report.findings.filter((f) => !f.fixed).length;
      expect(report.recommendations).toHaveLength(unfixedCount);
    });

    it('should contain remediation text from unfixed findings', () => {
      const weakPolicy: SecurityPolicy = {
        ...DEFAULT_SECURITY_POLICY,
        requireCsrfToken: false,
        allowedOrigins: [],
      };
      const report = runSecurityAudit(weakPolicy);
      const unfixedFindings = report.findings.filter((f) => !f.fixed);

      for (const finding of unfixedFindings) {
        expect(report.recommendations).toContain(finding.remediation);
      }
    });
  });

  describe('Finding structure', () => {
    it('should have all required fields on every finding', () => {
      const report = runSecurityAudit();
      for (const finding of report.findings) {
        expect(finding.id).toBeTruthy();
        expect(finding.severity).toBeTruthy();
        expect(finding.title).toBeTruthy();
        expect(finding.description).toBeTruthy();
        expect(finding.component).toBeTruthy();
        expect(finding.remediation).toBeTruthy();
        expect(typeof finding.fixed).toBe('boolean');
      }
    });

    it('should use valid severity levels', () => {
      const report = runSecurityAudit();
      const validSeverities = ['info', 'low', 'medium', 'high', 'critical'];
      for (const finding of report.findings) {
        expect(validSeverities).toContain(finding.severity);
      }
    });
  });
});
