/**
 * E2E: PanguardScan CLI and scanner tests
 * Tests the scan orchestrator and report generation
 */
import { describe, it, expect, vi } from 'vitest';
import {
  checkUnnecessaryPorts,
  SEVERITY_ORDER,
} from '@openclaw/panguard-scan/scanners/index.js';
import type { PortInfo } from '@openclaw/core';

// Suppress logger output during tests
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

describe('PanguardScan CLI E2E', () => {
  describe('Port Scanner', () => {
    it('should flag dangerous ports', () => {
      const ports: PortInfo[] = [
        { port: 21, protocol: 'tcp', service: 'ftp', state: 'open' },
        { port: 23, protocol: 'tcp', service: 'telnet', state: 'open' },
        { port: 3389, protocol: 'tcp', service: 'rdp', state: 'open' },
      ];

      const findings = checkUnnecessaryPorts(ports);
      expect(findings.length).toBeGreaterThanOrEqual(3);

      const ftpFinding = findings.find((f) => f.description.toLowerCase().includes('ftp'));
      expect(ftpFinding).toBeDefined();
      expect(ftpFinding!.severity).toBe('critical');

      const telnetFinding = findings.find((f) => f.description.toLowerCase().includes('telnet'));
      expect(telnetFinding).toBeDefined();
      expect(telnetFinding!.severity).toBe('critical');
    });

    it('should not flag safe ports', () => {
      const ports: PortInfo[] = [
        { port: 443, protocol: 'tcp', service: 'https', state: 'open' },
        { port: 22, protocol: 'tcp', service: 'ssh', state: 'open' },
      ];

      const findings = checkUnnecessaryPorts(ports);
      const httpsFinding = findings.find((f) => f.description.toLowerCase().includes('https'));
      // HTTPS (443) should not be flagged as dangerous
      expect(httpsFinding).toBeUndefined();
    });
  });

  describe('Severity Ordering', () => {
    it('should maintain correct severity order', () => {
      expect(SEVERITY_ORDER.critical).toBeLessThan(SEVERITY_ORDER.high);
      expect(SEVERITY_ORDER.high).toBeLessThan(SEVERITY_ORDER.medium);
      expect(SEVERITY_ORDER.medium).toBeLessThan(SEVERITY_ORDER.low);
      expect(SEVERITY_ORDER.low).toBeLessThan(SEVERITY_ORDER.info);
    });
  });
});
