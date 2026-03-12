/**
 * Scanner orchestrator (runScan) unit tests
 * 掃描器編排器 (runScan) 單元測試
 *
 * Tests the main runScan function and its internal helper functions:
 * riskFactorToFinding, calculateEnhancedRiskScore, and enrichManualFix.
 * All external dependencies (discovery, scanner modules, security-hardening)
 * are mocked to isolate the orchestration logic.
 *
 * @module @panguard-ai/panguard-scan/tests/run-scan
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DiscoveryResult, PortInfo, RiskFactor } from '@panguard-ai/core';
import type { Finding, ScanConfig } from '../src/scanners/types.js';

// ---------------------------------------------------------------------------
// Mock all external dependencies before importing the module under test.
// ---------------------------------------------------------------------------

// Mock @panguard-ai/core
vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    getRiskLevel: vi.fn((score: number) => {
      if (score >= 75) return 'critical';
      if (score >= 50) return 'high';
      if (score >= 25) return 'medium';
      if (score >= 10) return 'low';
      return 'info';
    }),
  };
});

// Mock @panguard-ai/security-hardening
vi.mock('@panguard-ai/security-hardening', () => ({
  createFilesystemGuard: vi.fn(() => ({ check: vi.fn() })),
  createCommandValidator: vi.fn(() => ({ validate: vi.fn() })),
  DEFAULT_ALLOWED_COMMANDS: ['ls', 'cat', 'grep'],
}));

// Mock individual scanner modules
const mockDiscover = vi.fn<() => Promise<DiscoveryResult>>();
const mockCheckPasswordPolicy = vi.fn<() => Promise<Finding[]>>();
const mockCheckUnnecessaryPorts = vi.fn<(ports: PortInfo[]) => Finding[]>();
const mockCheckSslCertificates = vi.fn<() => Promise<Finding[]>>();
const mockCheckScheduledTasks = vi.fn<() => Promise<Finding[]>>();
const mockCheckSharedFolders = vi.fn<() => Promise<Finding[]>>();
const mockCheckCVEs = vi.fn<() => Promise<Finding[]>>();

vi.mock('../src/scanners/discovery-scanner.js', () => ({
  discover: (...args: unknown[]) => mockDiscover(...(args as [])),
}));

vi.mock('../src/scanners/password-policy.js', () => ({
  checkPasswordPolicy: (...args: unknown[]) => mockCheckPasswordPolicy(...(args as [])),
}));

vi.mock('../src/scanners/open-ports.js', () => ({
  checkUnnecessaryPorts: (...args: unknown[]) =>
    mockCheckUnnecessaryPorts(...(args as [PortInfo[]])),
}));

vi.mock('../src/scanners/ssl-checker.js', () => ({
  checkSslCertificates: (...args: unknown[]) => mockCheckSslCertificates(...(args as [])),
}));

vi.mock('../src/scanners/scheduled-tasks.js', () => ({
  checkScheduledTasks: (...args: unknown[]) => mockCheckScheduledTasks(...(args as [])),
}));

vi.mock('../src/scanners/shared-folders.js', () => ({
  checkSharedFolders: (...args: unknown[]) => mockCheckSharedFolders(...(args as [])),
}));

vi.mock('../src/scanners/cve-checker.js', () => ({
  checkCVEs: (...args: unknown[]) => mockCheckCVEs(...(args as [])),
}));

// Import the module under test after all mocks are set up
import { runScan } from '../src/scanners/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal DiscoveryResult for testing.
 */
function makeDiscoveryResult(overrides: Partial<DiscoveryResult> = {}): DiscoveryResult {
  return {
    os: {
      platform: 'linux',
      distro: 'Ubuntu',
      version: '22.04',
      arch: 'x64',
      kernel: '5.15.0',
      hostname: 'test-host',
      uptime: 3600,
      patchLevel: '',
    },
    hostname: 'test-host',
    network: {
      interfaces: [],
      openPorts: [],
      activeConnections: [],
      gateway: '192.168.1.1',
      dns: ['8.8.8.8'],
    },
    openPorts: [],
    services: [],
    security: {
      existingTools: [],
      firewall: { enabled: true, product: 'ufw', rules: [] },
      updates: { pendingUpdates: 0, autoUpdateEnabled: true },
      users: [],
    },
    vulnerabilities: [],
    riskScore: 20,
    discoveredAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create a minimal Finding for testing.
 */
function makeFinding(overrides: Partial<Finding> & { severity: Finding['severity'] }): Finding {
  return {
    id: overrides.id ?? 'TEST-001',
    title: overrides.title ?? 'Test finding',
    description: overrides.description ?? 'A test finding',
    severity: overrides.severity,
    category: overrides.category ?? 'system',
    remediation: overrides.remediation ?? 'Fix it',
    complianceRef: overrides.complianceRef,
    details: overrides.details,
    manualFix: overrides.manualFix,
  };
}

/**
 * Create a RiskFactor for testing.
 */
function makeRiskFactor(overrides: Partial<RiskFactor> = {}): RiskFactor {
  return {
    category: overrides.category ?? 'noFirewall',
    description: overrides.description ?? 'Firewall is disabled',
    score: overrides.score ?? 15,
    severity: overrides.severity ?? 'high',
    details: overrides.details,
  };
}

/**
 * Set up default mock return values for a clean scan.
 */
function setupDefaultMocks(discoveryOverrides: Partial<DiscoveryResult> = {}): void {
  mockDiscover.mockResolvedValue(makeDiscoveryResult(discoveryOverrides));
  mockCheckPasswordPolicy.mockResolvedValue([]);
  mockCheckUnnecessaryPorts.mockReturnValue([]);
  mockCheckSslCertificates.mockResolvedValue([]);
  mockCheckScheduledTasks.mockResolvedValue([]);
  mockCheckSharedFolders.mockResolvedValue([]);
  mockCheckCVEs.mockResolvedValue([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runScan - orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Basic scan execution
  // -------------------------------------------------------------------------

  it('should return a valid ScanResult with all required fields', async () => {
    setupDefaultMocks();

    const config: ScanConfig = { depth: 'quick', lang: 'en' };
    const result = await runScan(config);

    expect(result).toHaveProperty('discovery');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('scanDuration');
    expect(result).toHaveProperty('scannedAt');
    expect(result).toHaveProperty('config');

    expect(result.config).toEqual(config);
    expect(typeof result.scanDuration).toBe('number');
    expect(result.scanDuration).toBeGreaterThanOrEqual(0);
    expect(result.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(result.findings)).toBe(true);
  });

  it('should call discover with correct config', async () => {
    setupDefaultMocks();

    const config: ScanConfig = { depth: 'full', lang: 'zh-TW' };
    await runScan(config);

    expect(mockDiscover).toHaveBeenCalledTimes(1);
    expect(mockDiscover).toHaveBeenCalledWith({
      depth: 'full',
      lang: 'zh-TW',
    });
  });

  // -------------------------------------------------------------------------
  // Quick mode vs Full mode
  // -------------------------------------------------------------------------

  it('should NOT run SSL, scheduled tasks, shared folders, or CVE checks in quick mode', async () => {
    setupDefaultMocks();

    await runScan({ depth: 'quick', lang: 'en' });

    expect(mockDiscover).toHaveBeenCalledTimes(1);
    expect(mockCheckPasswordPolicy).toHaveBeenCalledTimes(1);
    expect(mockCheckUnnecessaryPorts).toHaveBeenCalledTimes(1);

    // These should NOT be called in quick mode
    expect(mockCheckSslCertificates).not.toHaveBeenCalled();
    expect(mockCheckScheduledTasks).not.toHaveBeenCalled();
    expect(mockCheckSharedFolders).not.toHaveBeenCalled();
    expect(mockCheckCVEs).not.toHaveBeenCalled();
  });

  it('should run ALL scanners in full mode', async () => {
    setupDefaultMocks();

    await runScan({ depth: 'full', lang: 'en' });

    expect(mockDiscover).toHaveBeenCalledTimes(1);
    expect(mockCheckPasswordPolicy).toHaveBeenCalledTimes(1);
    expect(mockCheckUnnecessaryPorts).toHaveBeenCalledTimes(1);
    expect(mockCheckSslCertificates).toHaveBeenCalledTimes(1);
    expect(mockCheckScheduledTasks).toHaveBeenCalledTimes(1);
    expect(mockCheckSharedFolders).toHaveBeenCalledTimes(1);
    expect(mockCheckCVEs).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Risk factor to finding conversion
  // -------------------------------------------------------------------------

  it('should convert discovery risk factors to findings', async () => {
    const riskFactors: RiskFactor[] = [
      makeRiskFactor({
        category: 'noFirewall',
        severity: 'high',
        description: 'Firewall is disabled',
      }),
      makeRiskFactor({
        category: 'dangerousPorts',
        severity: 'medium',
        description: 'Dangerous ports open',
        details: 'Port 21 open',
      }),
    ];

    setupDefaultMocks({ vulnerabilities: riskFactors });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    // Should have at least the risk factor findings
    expect(result.findings.length).toBeGreaterThanOrEqual(2);

    const firewallFinding = result.findings.find((f) => f.id === 'DISC-noFirewall');
    expect(firewallFinding).toBeDefined();
    expect(firewallFinding!.title).toContain('Firewall disabled');
    expect(firewallFinding!.severity).toBe('high');
    expect(firewallFinding!.description).toBe('Firewall is disabled');
    expect(firewallFinding!.remediation).toContain('firewall');

    const portsFinding = result.findings.find((f) => f.id === 'DISC-dangerousPorts');
    expect(portsFinding).toBeDefined();
    expect(portsFinding!.details).toBe('Port 21 open');
  });

  it('should use fallback title and remediation for unknown risk factor categories', async () => {
    const unknownFactor: RiskFactor = makeRiskFactor({
      category: 'unknownCategory',
      severity: 'low',
      description: 'An unknown risk',
    });

    setupDefaultMocks({ vulnerabilities: [unknownFactor] });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    const finding = result.findings.find((f) => f.id === 'DISC-unknownCategory');
    expect(finding).toBeDefined();
    expect(finding!.title).toContain('Risk factor: unknownCategory');
    expect(finding!.remediation).toContain('Review and address');
  });

  // -------------------------------------------------------------------------
  // Manual fix enrichment
  // -------------------------------------------------------------------------

  it('should enrich findings with manual fix commands from RISK_FACTOR_MANUAL_FIX', async () => {
    const riskFactors: RiskFactor[] = [
      makeRiskFactor({
        category: 'noFirewall',
        severity: 'high',
      }),
    ];

    setupDefaultMocks({ vulnerabilities: riskFactors });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    const firewallFinding = result.findings.find((f) => f.id === 'DISC-noFirewall');
    expect(firewallFinding).toBeDefined();
    expect(firewallFinding!.manualFix).toBeDefined();
    expect(firewallFinding!.manualFix!.length).toBeGreaterThan(0);
    expect(firewallFinding!.manualFix).toContain('sudo ufw enable');
  });

  it('should enrich password-category findings with fallback manual fix', async () => {
    const passwordFinding = makeFinding({
      id: 'PWD-001',
      severity: 'medium',
      category: 'password',
      // No manualFix provided - should be enriched
    });

    mockCheckPasswordPolicy.mockResolvedValue([passwordFinding]);
    setupDefaultMocks();
    mockCheckPasswordPolicy.mockResolvedValue([passwordFinding]);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    const enrichedPwd = result.findings.find((f) => f.id === 'PWD-001');
    expect(enrichedPwd).toBeDefined();
    expect(enrichedPwd!.manualFix).toBeDefined();
    expect(enrichedPwd!.manualFix!.length).toBeGreaterThan(0);
  });

  it('should NOT overwrite existing manualFix on findings', async () => {
    const existingFix = ['custom fix command'];
    const findingWithFix = makeFinding({
      id: 'PWD-002',
      severity: 'medium',
      category: 'password',
      manualFix: existingFix,
    });

    setupDefaultMocks();
    mockCheckPasswordPolicy.mockResolvedValue([findingWithFix]);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    const enriched = result.findings.find((f) => f.id === 'PWD-002');
    expect(enriched).toBeDefined();
    expect(enriched!.manualFix).toEqual(existingFix);
  });

  // -------------------------------------------------------------------------
  // Enhanced risk score calculation
  // -------------------------------------------------------------------------

  it('should add extra points for additional findings beyond discovery base', async () => {
    const baseRiskScore = 20;
    setupDefaultMocks({ riskScore: baseRiskScore });

    // Add a critical finding from password policy (worth 8 points)
    const criticalFinding = makeFinding({
      id: 'PWD-CRIT',
      severity: 'critical',
      category: 'password',
    });
    mockCheckPasswordPolicy.mockResolvedValue([criticalFinding]);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    // Base 20 + 8 (critical) = 28
    expect(result.riskScore).toBe(28);
  });

  it('should apply correct severity points: critical=8, high=5, medium=3, low=1, info=0', async () => {
    const baseRiskScore = 10;
    setupDefaultMocks({ riskScore: baseRiskScore });

    const additionalFindings: Finding[] = [
      makeFinding({ id: 'F1', severity: 'critical', category: 'test' }),
      makeFinding({ id: 'F2', severity: 'high', category: 'test' }),
      makeFinding({ id: 'F3', severity: 'medium', category: 'test' }),
      makeFinding({ id: 'F4', severity: 'low', category: 'test' }),
      makeFinding({ id: 'F5', severity: 'info', category: 'test' }),
    ];
    mockCheckPasswordPolicy.mockResolvedValue(additionalFindings);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    // Base 10 + 8 + 5 + 3 + 1 + 0 = 27
    expect(result.riskScore).toBe(27);
  });

  it('should cap the enhanced risk score at 100', async () => {
    const baseRiskScore = 80;
    setupDefaultMocks({ riskScore: baseRiskScore });

    // Add many critical findings to push over 100
    const manyFindings = Array.from({ length: 10 }, (_, i) =>
      makeFinding({
        id: `CRIT-${i}`,
        severity: 'critical',
        category: 'test',
      })
    );
    mockCheckPasswordPolicy.mockResolvedValue(manyFindings);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    // 80 + (10 * 8) = 160, should be capped at 100
    expect(result.riskScore).toBe(100);
  });

  it('should never produce a negative risk score', async () => {
    setupDefaultMocks({ riskScore: 0 });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // Findings sorting
  // -------------------------------------------------------------------------

  it('should sort all findings by severity (most severe first)', async () => {
    const riskFactors: RiskFactor[] = [
      makeRiskFactor({ category: 'noFirewall', severity: 'high' }),
    ];

    setupDefaultMocks({ vulnerabilities: riskFactors });

    const lowFinding = makeFinding({
      id: 'LOW-1',
      severity: 'low',
      category: 'test',
    });
    const criticalFinding = makeFinding({
      id: 'CRIT-1',
      severity: 'critical',
      category: 'test',
    });
    mockCheckPasswordPolicy.mockResolvedValue([lowFinding, criticalFinding]);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    // Verify findings are sorted: critical before high before low
    const severityOrder = result.findings.map((f) => f.severity);
    for (let i = 1; i < severityOrder.length; i++) {
      const prevOrder =
        { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[severityOrder[i - 1]] ?? 5;
      const currOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[severityOrder[i]] ?? 5;
      expect(prevOrder).toBeLessThanOrEqual(currOrder);
    }
  });

  // -------------------------------------------------------------------------
  // Findings aggregation from all scanners
  // -------------------------------------------------------------------------

  it('should aggregate findings from all scanners in full mode', async () => {
    const riskFactors: RiskFactor[] = [
      makeRiskFactor({ category: 'noFirewall', severity: 'high' }),
    ];

    setupDefaultMocks({ vulnerabilities: riskFactors });

    mockCheckPasswordPolicy.mockResolvedValue([
      makeFinding({ id: 'PWD-1', severity: 'medium', category: 'password' }),
    ]);
    mockCheckUnnecessaryPorts.mockReturnValue([
      makeFinding({ id: 'PORT-1', severity: 'critical', category: 'network' }),
    ]);
    mockCheckSslCertificates.mockResolvedValue([
      makeFinding({ id: 'SSL-1', severity: 'high', category: 'certificate' }),
    ]);
    mockCheckScheduledTasks.mockResolvedValue([
      makeFinding({ id: 'TASK-1', severity: 'medium', category: 'system' }),
    ]);
    mockCheckSharedFolders.mockResolvedValue([
      makeFinding({ id: 'SHARE-1', severity: 'medium', category: 'access' }),
    ]);
    mockCheckCVEs.mockResolvedValue([
      makeFinding({
        id: 'CVE-1',
        severity: 'high',
        category: 'vulnerability_management',
      }),
    ]);

    const result = await runScan({ depth: 'full', lang: 'en' });

    // 1 discovery + 1 password + 1 port + 1 ssl + 1 task + 1 share + 1 cve = 7
    expect(result.findings).toHaveLength(7);

    const findingIds = result.findings.map((f) => f.id);
    expect(findingIds).toContain('DISC-noFirewall');
    expect(findingIds).toContain('PWD-1');
    expect(findingIds).toContain('PORT-1');
    expect(findingIds).toContain('SSL-1');
    expect(findingIds).toContain('TASK-1');
    expect(findingIds).toContain('SHARE-1');
    expect(findingIds).toContain('CVE-1');
  });

  // -------------------------------------------------------------------------
  // Risk level mapping
  // -------------------------------------------------------------------------

  it('should set riskLevel based on the enhanced risk score', async () => {
    setupDefaultMocks({ riskScore: 30 });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    // riskScore=30, getRiskLevel mock returns 'medium' for 25-49
    expect(result.riskLevel).toBe('medium');
  });

  // -------------------------------------------------------------------------
  // Port data passed to checkUnnecessaryPorts
  // -------------------------------------------------------------------------

  it('should pass discovery openPorts to checkUnnecessaryPorts', async () => {
    const ports: PortInfo[] = [
      {
        port: 21,
        protocol: 'tcp',
        state: 'LISTEN',
        pid: undefined,
        process: 'vsftpd',
        service: 'ftp',
      },
      {
        port: 443,
        protocol: 'tcp',
        state: 'LISTEN',
        pid: undefined,
        process: 'nginx',
        service: 'https',
      },
    ];

    setupDefaultMocks({ openPorts: ports });

    await runScan({ depth: 'quick', lang: 'en' });

    expect(mockCheckUnnecessaryPorts).toHaveBeenCalledWith(ports);
  });

  // -------------------------------------------------------------------------
  // Scan with zero findings
  // -------------------------------------------------------------------------

  it('should produce a clean scan result when no findings are generated', async () => {
    setupDefaultMocks({ riskScore: 0 });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    expect(result.findings).toHaveLength(0);
    expect(result.riskScore).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Known risk factor manual fix mapping
  // -------------------------------------------------------------------------

  it('should attach manual fix for dangerousPorts risk factor', async () => {
    setupDefaultMocks({
      vulnerabilities: [makeRiskFactor({ category: 'dangerousPorts', severity: 'medium' })],
    });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    const finding = result.findings.find((f) => f.id === 'DISC-dangerousPorts');
    expect(finding).toBeDefined();
    expect(finding!.manualFix).toBeDefined();
    expect(finding!.manualFix!.some((cmd) => cmd.includes('ufw deny'))).toBe(true);
  });

  it('should attach manual fix for noUpdates risk factor', async () => {
    setupDefaultMocks({
      vulnerabilities: [makeRiskFactor({ category: 'noUpdates', severity: 'medium' })],
    });

    const result = await runScan({ depth: 'quick', lang: 'en' });

    const finding = result.findings.find((f) => f.id === 'DISC-noUpdates');
    expect(finding).toBeDefined();
    expect(finding!.manualFix).toBeDefined();
    expect(finding!.manualFix!.some((cmd) => cmd.includes('apt update'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Discovery result passthrough
  // -------------------------------------------------------------------------

  it('should include the original discovery result in the scan result', async () => {
    const customDiscovery = makeDiscoveryResult({
      hostname: 'custom-host',
      riskScore: 42,
    });
    mockDiscover.mockResolvedValue(customDiscovery);
    mockCheckPasswordPolicy.mockResolvedValue([]);
    mockCheckUnnecessaryPorts.mockReturnValue([]);

    const result = await runScan({ depth: 'quick', lang: 'en' });

    expect(result.discovery).toEqual(customDiscovery);
    expect(result.discovery.hostname).toBe('custom-host');
  });
});
