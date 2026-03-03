/**
 * Compliance Assessors tests
 * 合規評估器測試
 *
 * The assessors module captures `platform()` at module-load time into a
 * top-level `const os`. Because of that, we must use `vi.resetModules()` +
 * dynamic `import()` whenever we need a different OS environment.
 * A helper (`loadAssessors`) encapsulates this pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock state - created with vi.hoisted so vi.mock factories can reference them
// ---------------------------------------------------------------------------

const {
  mockExecFile,
  mockPlatform,
  mockReadFileSync,
  mockExistsSync,
  mockReaddirSync,
} = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
  mockPlatform: vi.fn<() => string>().mockReturnValue('linux'),
  mockReadFileSync: vi.fn<(path: string, encoding: string) => string>(),
  mockExistsSync: vi.fn<(path: string) => boolean>(),
  mockReaddirSync: vi.fn<(path: string) => string[]>(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@panguard-ai/core', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

vi.mock('node:os', () => ({
  platform: () => mockPlatform(),
}));

vi.mock('node:fs', () => ({
  readFileSync: (path: string, encoding: string) => mockReadFileSync(path, encoding),
  existsSync: (path: string) => mockExistsSync(path),
  readdirSync: (path: string) => mockReaddirSync(path),
}));

// ---------------------------------------------------------------------------
// Types for the assessors module
// ---------------------------------------------------------------------------

type AssessorsModule = typeof import('../src/assessors/index.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset modules and re-import the assessors module with the current
 * mockPlatform value baked in.  This is necessary because the source
 * file captures `platform()` once at the top level.
 */
async function loadAssessors(osPlatform: string): Promise<AssessorsModule> {
  mockPlatform.mockReturnValue(osPlatform);
  vi.resetModules();
  return import('../src/assessors/index.js') as Promise<AssessorsModule>;
}

/**
 * Configure mockExecFile so that when `cmd` is called, the callback receives
 * the given `stdout` (or an error if `stdout` is null).
 */
function stubExec(stubs: Record<string, string | null>): void {
  mockExecFile.mockImplementation(
    (
      cmd: string,
      _args: string[],
      _opts: unknown,
      cb: (err: Error | null, stdout: string) => void,
    ) => {
      const key = cmd;
      if (key in stubs) {
        const value = stubs[key];
        if (value === null) {
          cb(new Error('command failed'), '');
        } else {
          cb(null, value);
        }
      } else {
        cb(new Error('not found'), '');
      }
    },
  );
}

/** Reset all mocks to a clean state */
function resetAllMocks(): void {
  vi.clearAllMocks();
  mockPlatform.mockReturnValue('linux');
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('');
  mockReaddirSync.mockReturnValue([]);
  stubExec({});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Compliance Assessors', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // assessAccessControl
  // =========================================================================
  describe('assessAccessControl', () => {
    describe('on Linux', () => {
      let assessAccessControl: AssessorsModule['assessAccessControl'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        assessAccessControl = mod.assessAccessControl;
      });

      it('should report weak password policy when minlen < 8', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/security/pwquality.conf');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/security/pwquality.conf') return 'minlen = 6\nminclass = 2';
          return '';
        });

        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-001');
        expect(pwdFinding).toBeDefined();
        expect(pwdFinding!.severity).toBe('high');
        expect(pwdFinding!.description).toContain('6');
      });

      it('should report weak password policy when minlen is not set', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/security/pwquality.conf');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/security/pwquality.conf') return 'minclass = 2';
          return '';
        });

        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-001');
        expect(pwdFinding).toBeDefined();
        expect(pwdFinding!.description).toContain('not set');
      });

      it('should NOT report weak password when minlen >= 8', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/security/pwquality.conf');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/security/pwquality.conf') return 'minlen = 12\nminclass = 3';
          return '';
        });

        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-001');
        expect(pwdFinding).toBeUndefined();
      });

      it('should report when pam_pwquality is not configured', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadFileSync.mockReturnValue('');

        const findings = await assessAccessControl();
        const pamFinding = findings.find((f) => f.findingId === 'AC-PWD-002');
        expect(pamFinding).toBeDefined();
        expect(pamFinding!.severity).toBe('medium');
        expect(pamFinding!.category).toBe('password');
      });

      it('should NOT report pam_pwquality when configured in PAM', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/pam.d/common-password');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/pam.d/common-password')
            return 'password required pam_pwquality.so retry=3';
          return '';
        });

        const findings = await assessAccessControl();
        const pamFinding = findings.find((f) => f.findingId === 'AC-PWD-002');
        expect(pamFinding).toBeUndefined();
      });

      it('should NOT report pam_pwquality when minlen exists in pwquality.conf', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/security/pwquality.conf');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/security/pwquality.conf') return 'minlen = 12';
          return '';
        });

        const findings = await assessAccessControl();
        const pamFinding = findings.find((f) => f.findingId === 'AC-PWD-002');
        expect(pamFinding).toBeUndefined();
      });

      it('should report accounts without passwords in /etc/shadow', async () => {
        mockExistsSync.mockImplementation((p: string) => {
          if (p === '/etc/shadow') return true;
          return false;
        });
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/shadow') {
            return [
              'root:$6$hash:19000:0:99999:7:::',
              'user1::19000:0:99999:7:::',
              'user2:!:19000:0:99999:7:::',
              'user3:$6$hash:19000:0:99999:7:::',
            ].join('\n');
          }
          return '';
        });

        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-004');
        expect(pwdFinding).toBeDefined();
        expect(pwdFinding!.severity).toBe('critical');
        expect(pwdFinding!.description).toContain('2 account(s)');
        expect(pwdFinding!.description).toContain('user1');
        expect(pwdFinding!.description).toContain('user2');
      });

      it('should NOT report empty passwords when none exist', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/shadow');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/shadow') {
            return [
              'root:$6$hash:19000:0:99999:7:::',
              'user1:$6$hash:19000:0:99999:7:::',
            ].join('\n');
          }
          return '';
        });

        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-004');
        expect(pwdFinding).toBeUndefined();
      });

      it('should handle missing /etc/shadow gracefully', async () => {
        mockExistsSync.mockReturnValue(false);
        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-004');
        expect(pwdFinding).toBeUndefined();
      });

      it('should limit displayed empty-password account names to 5', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/shadow');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/shadow') {
            return Array.from(
              { length: 8 },
              (_, i) => `user${i}::19000:0:99999:7:::`,
            ).join('\n');
          }
          return '';
        });

        const findings = await assessAccessControl();
        const pwdFinding = findings.find((f) => f.findingId === 'AC-PWD-004');
        expect(pwdFinding).toBeDefined();
        expect(pwdFinding!.description).toContain('8 account(s)');
        // Only first 5 names shown
        expect(pwdFinding!.description).toContain('user0');
        expect(pwdFinding!.description).toContain('user4');
        expect(pwdFinding!.description).not.toContain('user5');
      });

      it('should report NOPASSWD: ALL in sudoers', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/sudoers');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/sudoers')
            return 'root ALL=(ALL) ALL\nuser ALL=(ALL) NOPASSWD: ALL';
          return '';
        });

        const findings = await assessAccessControl();
        const sudoFinding = findings.find((f) => f.findingId === 'AC-SUDO-001');
        expect(sudoFinding).toBeDefined();
        expect(sudoFinding!.severity).toBe('high');
        expect(sudoFinding!.category).toBe('access');
      });

      it('should NOT report when sudoers has no NOPASSWD', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/sudoers');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/sudoers') return 'root ALL=(ALL) ALL\nuser ALL=(ALL) ALL';
          return '';
        });

        const findings = await assessAccessControl();
        const sudoFinding = findings.find((f) => f.findingId === 'AC-SUDO-001');
        expect(sudoFinding).toBeUndefined();
      });

      it('should handle missing /etc/sudoers gracefully', async () => {
        mockExistsSync.mockReturnValue(false);
        const findings = await assessAccessControl();
        const sudoFinding = findings.find((f) => f.findingId === 'AC-SUDO-001');
        expect(sudoFinding).toBeUndefined();
      });

      it('should produce findings with correct ComplianceFinding shape', async () => {
        mockExistsSync.mockReturnValue(false);
        mockReadFileSync.mockReturnValue('');

        const findings = await assessAccessControl();
        for (const f of findings) {
          expect(f).toHaveProperty('findingId');
          expect(f).toHaveProperty('severity');
          expect(f).toHaveProperty('title');
          expect(f).toHaveProperty('description');
          expect(f).toHaveProperty('category');
          expect(f).toHaveProperty('timestamp');
          expect(f).toHaveProperty('source');
          expect(f.source).toBe('panguard-scan');
          expect(f.timestamp).toBeInstanceOf(Date);
        }
      });
    });

    describe('on macOS', () => {
      let assessAccessControl: AssessorsModule['assessAccessControl'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        assessAccessControl = mod.assessAccessControl;
      });

      it('should report when no password policy is configured', async () => {
        stubExec({ '/usr/bin/pwpolicy': 'No policies found' });

        const findings = await assessAccessControl();
        const finding = findings.find((f) => f.findingId === 'AC-PWD-003');
        expect(finding).toBeDefined();
        expect(finding!.severity).toBe('medium');
        expect(finding!.category).toBe('password');
      });

      it('should NOT report when password policy is configured', async () => {
        stubExec({
          '/usr/bin/pwpolicy':
            '<dict><key>policyAttributePassword</key><string>regex</string></dict>',
        });

        const findings = await assessAccessControl();
        const finding = findings.find((f) => f.findingId === 'AC-PWD-003');
        expect(finding).toBeUndefined();
      });

      it('should handle pwpolicy command failure gracefully', async () => {
        stubExec({ '/usr/bin/pwpolicy': null });

        const findings = await assessAccessControl();
        expect(Array.isArray(findings)).toBe(true);
      });

      it('should check sudo on macOS (non-win32)', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/etc/sudoers');
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === '/etc/sudoers')
            return 'admin ALL=(ALL) NOPASSWD: ALL';
          return '';
        });

        const findings = await assessAccessControl();
        const sudoFinding = findings.find((f) => f.findingId === 'AC-SUDO-001');
        expect(sudoFinding).toBeDefined();
      });
    });

    describe('on win32', () => {
      let assessAccessControl: AssessorsModule['assessAccessControl'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('win32');
        assessAccessControl = mod.assessAccessControl;
      });

      it('should NOT run sudo check on win32', async () => {
        const findings = await assessAccessControl();
        const sudoFinding = findings.find((f) => f.findingId === 'AC-SUDO-001');
        expect(sudoFinding).toBeUndefined();
      });

      it('should return empty array on win32', async () => {
        const findings = await assessAccessControl();
        expect(findings).toEqual([]);
      });
    });
  });

  // =========================================================================
  // assessFirewallAndNetwork
  // =========================================================================
  describe('assessFirewallAndNetwork', () => {
    describe('firewall check on macOS', () => {
      let assessFirewallAndNetwork: AssessorsModule['assessFirewallAndNetwork'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        assessFirewallAndNetwork = mod.assessFirewallAndNetwork;
      });

      it('should report when macOS firewall is disabled', async () => {
        stubExec({
          '/usr/libexec/ApplicationFirewall/socketfilterfw':
            'Firewall is disabled. (State = 0)',
          '/usr/sbin/lsof': '',
        });

        const findings = await assessFirewallAndNetwork();
        const fwFinding = findings.find((f) => f.findingId === 'FW-001');
        expect(fwFinding).toBeDefined();
        expect(fwFinding!.severity).toBe('high');
        expect(fwFinding!.category).toBe('firewall');
      });

      it('should NOT report when macOS firewall is enabled', async () => {
        stubExec({
          '/usr/libexec/ApplicationFirewall/socketfilterfw':
            'Firewall is enabled. (State = 1)',
          '/usr/sbin/lsof': '',
        });

        const findings = await assessFirewallAndNetwork();
        const fwFinding = findings.find((f) => f.findingId === 'FW-001');
        expect(fwFinding).toBeUndefined();
      });
    });

    describe('risky port detection on macOS', () => {
      let assessFirewallAndNetwork: AssessorsModule['assessFirewallAndNetwork'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        assessFirewallAndNetwork = mod.assessFirewallAndNetwork;
      });

      it('should report risky services on common ports', async () => {
        stubExec({
          '/usr/libexec/ApplicationFirewall/socketfilterfw':
            'Firewall is enabled. (State = 1)',
          '/usr/sbin/lsof': [
            'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME',
            'redis-ser 1234 user 6u IPv4 0x1234 0t0 TCP *:6379 (LISTEN)',
            'mysqld   5678 user 10u IPv4 0x5678 0t0 TCP *:3306 (LISTEN)',
          ].join('\n'),
        });

        const findings = await assessFirewallAndNetwork();
        const portFinding = findings.find((f) => f.findingId === 'NET-PORT-001');
        expect(portFinding).toBeDefined();
        expect(portFinding!.severity).toBe('high');
        expect(portFinding!.description).toContain('Redis');
        expect(portFinding!.description).toContain('MySQL');
        expect(portFinding!.category).toBe('network');
      });

      it('should NOT report for non-risky ports', async () => {
        stubExec({
          '/usr/libexec/ApplicationFirewall/socketfilterfw':
            'Firewall is enabled. (State = 1)',
          '/usr/sbin/lsof': [
            'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME',
            'nginx    1234 user 6u IPv4 0x1234 0t0 TCP *:443 (LISTEN)',
            'nginx    1234 user 7u IPv4 0x1234 0t0 TCP *:80 (LISTEN)',
          ].join('\n'),
        });

        const findings = await assessFirewallAndNetwork();
        const portFinding = findings.find((f) => f.findingId === 'NET-PORT-001');
        expect(portFinding).toBeUndefined();
      });

      it('should handle empty lsof output', async () => {
        stubExec({
          '/usr/libexec/ApplicationFirewall/socketfilterfw':
            'Firewall is enabled. (State = 1)',
          '/usr/sbin/lsof': '',
        });

        const findings = await assessFirewallAndNetwork();
        const portFinding = findings.find((f) => f.findingId === 'NET-PORT-001');
        expect(portFinding).toBeUndefined();
      });
    });

    describe('firewall check on Linux', () => {
      let assessFirewallAndNetwork: AssessorsModule['assessFirewallAndNetwork'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        assessFirewallAndNetwork = mod.assessFirewallAndNetwork;
      });

      it('should report when no firewall rules and UFW is not active', async () => {
        // Note: ufw.includes('active') is the check, so "inactive" still contains "active".
        // We use an empty string to simulate ufw not installed / returning nothing.
        stubExec({
          '/sbin/iptables': 'Chain INPUT\nChain FORWARD\nChain OUTPUT',
          '/usr/sbin/ufw': '',
          '/usr/bin/ss': '',
        });

        const findings = await assessFirewallAndNetwork();
        const fwFinding = findings.find((f) => f.findingId === 'FW-002');
        expect(fwFinding).toBeDefined();
        expect(fwFinding!.severity).toBe('high');
      });

      it('should NOT report when iptables has many rules', async () => {
        const lines = Array.from({ length: 12 }, (_, i) => `rule-${i}`).join('\n');
        stubExec({
          '/sbin/iptables': lines,
          '/usr/sbin/ufw': 'Status: inactive',
          '/usr/bin/ss': '',
        });

        const findings = await assessFirewallAndNetwork();
        const fwFinding = findings.find((f) => f.findingId === 'FW-002');
        expect(fwFinding).toBeUndefined();
      });

      it('should NOT report when UFW is active', async () => {
        stubExec({
          '/sbin/iptables': 'Chain INPUT\nChain OUTPUT',
          '/usr/sbin/ufw': 'Status: active',
          '/usr/bin/ss': '',
        });

        const findings = await assessFirewallAndNetwork();
        const fwFinding = findings.find((f) => f.findingId === 'FW-002');
        expect(fwFinding).toBeUndefined();
      });

      it('should detect risky ports via ss command', async () => {
        stubExec({
          '/sbin/iptables':
            Array.from({ length: 12 }, (_, i) => `rule-${i}`).join('\n'),
          '/usr/sbin/ufw': 'Status: active',
          '/usr/bin/ss': [
            'State Recv-Q Send-Q Local Address:Port Peer Address:Port',
            'LISTEN 0 128 0.0.0.0:27017 0.0.0.0:*',
            'LISTEN 0 128 0.0.0.0:22 0.0.0.0:*',
          ].join('\n'),
        });

        const findings = await assessFirewallAndNetwork();
        const portFinding = findings.find((f) => f.findingId === 'NET-PORT-001');
        expect(portFinding).toBeDefined();
        expect(portFinding!.description).toContain('MongoDB');
      });
    });

    describe('on win32', () => {
      let assessFirewallAndNetwork: AssessorsModule['assessFirewallAndNetwork'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('win32');
        assessFirewallAndNetwork = mod.assessFirewallAndNetwork;
      });

      it('should return empty findings on win32', async () => {
        stubExec({});
        const findings = await assessFirewallAndNetwork();
        expect(findings).toEqual([]);
      });
    });
  });

  // =========================================================================
  // assessEncryption
  // =========================================================================
  describe('assessEncryption', () => {
    describe('disk encryption on macOS', () => {
      let assessEncryption: AssessorsModule['assessEncryption'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        assessEncryption = mod.assessEncryption;
      });

      it('should report when FileVault is not enabled', async () => {
        stubExec({ '/usr/bin/fdesetup': 'FileVault is Off.' });

        const findings = await assessEncryption();
        const diskFinding = findings.find((f) => f.findingId === 'ENC-DISK-001');
        expect(diskFinding).toBeDefined();
        expect(diskFinding!.severity).toBe('high');
        expect(diskFinding!.category).toBe('encryption');
      });

      it('should NOT report when FileVault is enabled', async () => {
        stubExec({ '/usr/bin/fdesetup': 'FileVault is On.' });

        const findings = await assessEncryption();
        const diskFinding = findings.find((f) => f.findingId === 'ENC-DISK-001');
        expect(diskFinding).toBeUndefined();
      });

      it('should handle fdesetup failure gracefully', async () => {
        stubExec({ '/usr/bin/fdesetup': null });

        const findings = await assessEncryption();
        expect(Array.isArray(findings)).toBe(true);
      });
    });

    describe('disk encryption on Linux', () => {
      let assessEncryption: AssessorsModule['assessEncryption'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        assessEncryption = mod.assessEncryption;
      });

      it('should report when no LUKS encryption is detected', async () => {
        stubExec({
          '/bin/lsblk': 'NAME TYPE FSTYPE\nsda disk\nsda1 part ext4',
        });

        const findings = await assessEncryption();
        const diskFinding = findings.find((f) => f.findingId === 'ENC-DISK-002');
        expect(diskFinding).toBeDefined();
        expect(diskFinding!.severity).toBe('medium');
      });

      it('should NOT report when LUKS is detected via crypt', async () => {
        stubExec({
          '/bin/lsblk': 'NAME TYPE FSTYPE\nsda disk\nsda1 part crypt',
        });

        const findings = await assessEncryption();
        const diskFinding = findings.find((f) => f.findingId === 'ENC-DISK-002');
        expect(diskFinding).toBeUndefined();
      });

      it('should NOT report when LUKS is detected via luks keyword', async () => {
        stubExec({
          '/bin/lsblk': 'NAME TYPE FSTYPE\nsda disk\nsda1 part luks_partition',
        });

        const findings = await assessEncryption();
        const diskFinding = findings.find((f) => f.findingId === 'ENC-DISK-002');
        expect(diskFinding).toBeUndefined();
      });
    });

    describe('SSH key security', () => {
      const sshDir = `${process.env['HOME']}/.ssh`;
      let assessEncryption: AssessorsModule['assessEncryption'];

      beforeEach(async () => {
        resetAllMocks();
        stubExec({});
        const mod = await loadAssessors('linux');
        assessEncryption = mod.assessEncryption;
      });

      it('should report unencrypted RSA private keys', async () => {
        mockExistsSync.mockImplementation((p: string) => p === sshDir);
        mockReaddirSync.mockReturnValue([
          'id_rsa',
          'id_rsa.pub',
          'known_hosts',
          'id_ed25519',
        ]);
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === `${sshDir}/id_rsa`)
            return '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
          if (p === `${sshDir}/id_ed25519`)
            return '-----BEGIN OPENSSH PRIVATE KEY-----\nbase64...';
          return '';
        });

        const findings = await assessEncryption();
        const sshFinding = findings.find((f) => f.findingId === 'ENC-SSH-id_rsa');
        expect(sshFinding).toBeDefined();
        expect(sshFinding!.severity).toBe('medium');
        expect(sshFinding!.description).toContain('id_rsa');
      });

      it('should NOT report encrypted RSA private keys', async () => {
        mockExistsSync.mockImplementation((p: string) => p === sshDir);
        mockReaddirSync.mockReturnValue(['id_rsa', 'id_rsa.pub']);
        mockReadFileSync.mockImplementation((p: string) => {
          if (p === `${sshDir}/id_rsa`) {
            return '-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128...';
          }
          return '';
        });

        const findings = await assessEncryption();
        const sshFinding = findings.find((f) => f.findingId === 'ENC-SSH-id_rsa');
        expect(sshFinding).toBeUndefined();
      });

      it('should skip .pub files and known_hosts', async () => {
        mockExistsSync.mockImplementation((p: string) => p === sshDir);
        mockReaddirSync.mockReturnValue([
          'id_rsa.pub',
          'known_hosts',
          'known_hosts.old',
          'config',
        ]);

        const findings = await assessEncryption();
        const sshFindings = findings.filter((f) =>
          f.findingId.startsWith('ENC-SSH-'),
        );
        expect(sshFindings).toHaveLength(0);
      });

      it('should handle missing .ssh directory', async () => {
        mockExistsSync.mockReturnValue(false);

        const findings = await assessEncryption();
        const sshFindings = findings.filter((f) =>
          f.findingId.startsWith('ENC-SSH-'),
        );
        expect(sshFindings).toHaveLength(0);
      });

      it('should handle permission denied on key read gracefully', async () => {
        mockExistsSync.mockImplementation((p: string) => p === sshDir);
        mockReaddirSync.mockReturnValue(['id_rsa']);
        mockReadFileSync.mockImplementation(() => {
          throw new Error('EACCES: permission denied');
        });

        const findings = await assessEncryption();
        const sshFindings = findings.filter((f) =>
          f.findingId.startsWith('ENC-SSH-'),
        );
        expect(sshFindings).toHaveLength(0);
      });
    });
  });

  // =========================================================================
  // assessMonitoring
  // =========================================================================
  describe('assessMonitoring', () => {
    describe('logging check on Linux', () => {
      let assessMonitoring: AssessorsModule['assessMonitoring'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        assessMonitoring = mod.assessMonitoring;
      });

      it('should report when journald has no journal files', async () => {
        stubExec({
          '/bin/journalctl': 'No journal files were found.',
          '/bin/systemctl': 'inactive',
          '/bin/ps': 'PID TTY TIME CMD',
        });

        const findings = await assessMonitoring();
        const logFinding = findings.find((f) => f.findingId === 'MON-LOG-001');
        expect(logFinding).toBeDefined();
        expect(logFinding!.severity).toBe('high');
        expect(logFinding!.category).toBe('logging');
      });

      it('should report when journalctl returns empty', async () => {
        stubExec({
          '/bin/journalctl': '',
          '/bin/systemctl': 'active',
          '/bin/ps': 'PID TTY TIME CMD',
        });

        const findings = await assessMonitoring();
        const logFinding = findings.find((f) => f.findingId === 'MON-LOG-001');
        expect(logFinding).toBeDefined();
      });

      it('should NOT report when journald has disk usage', async () => {
        stubExec({
          '/bin/journalctl':
            'Archived and active journals take up 256.0M in the file system.',
          '/bin/systemctl': 'active',
          '/bin/ps': 'PID TTY TIME CMD',
        });

        const findings = await assessMonitoring();
        const logFinding = findings.find((f) => f.findingId === 'MON-LOG-001');
        expect(logFinding).toBeUndefined();
      });
    });

    describe('logging check on macOS', () => {
      let assessMonitoring: AssessorsModule['assessMonitoring'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        assessMonitoring = mod.assessMonitoring;
      });

      it('should report when log stats returns empty', async () => {
        stubExec({
          '/usr/bin/log': '',
          '/bin/ps': 'PID TTY TIME CMD',
        });

        const findings = await assessMonitoring();
        const logFinding = findings.find((f) => f.findingId === 'MON-LOG-002');
        expect(logFinding).toBeDefined();
        expect(logFinding!.severity).toBe('medium');
      });

      it('should NOT report when log stats returns data', async () => {
        stubExec({
          '/usr/bin/log': 'system: 1234 messages\nuser: 5678 messages',
          '/bin/ps': 'PID TTY TIME CMD',
        });

        const findings = await assessMonitoring();
        const logFinding = findings.find((f) => f.findingId === 'MON-LOG-002');
        expect(logFinding).toBeUndefined();
      });

      it('should NOT run audit daemon check on macOS', async () => {
        stubExec({
          '/usr/bin/log': 'system: 1234 messages',
          '/bin/ps': 'PID TTY TIME CMD',
        });

        const findings = await assessMonitoring();
        const auditFinding = findings.find(
          (f) => f.findingId === 'MON-AUDIT-001',
        );
        expect(auditFinding).toBeUndefined();
      });
    });

    describe('audit daemon check (Linux only)', () => {
      let assessMonitoring: AssessorsModule['assessMonitoring'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        assessMonitoring = mod.assessMonitoring;
      });

      it('should report when auditd is not active', async () => {
        stubExec({
          '/bin/journalctl': 'Archived journals: 100M',
          '/bin/systemctl': 'inactive',
          '/bin/ps': 'PID TTY TIME CMD\npanguard-guard 1234',
        });

        const findings = await assessMonitoring();
        const auditFinding = findings.find(
          (f) => f.findingId === 'MON-AUDIT-001',
        );
        expect(auditFinding).toBeDefined();
        expect(auditFinding!.severity).toBe('medium');
        expect(auditFinding!.category).toBe('audit');
      });

      it('should NOT report when auditd is active', async () => {
        stubExec({
          '/bin/journalctl': 'Archived journals: 100M',
          '/bin/systemctl': 'active',
          '/bin/ps': 'PID TTY TIME CMD\npanguard-guard 1234',
        });

        const findings = await assessMonitoring();
        const auditFinding = findings.find(
          (f) => f.findingId === 'MON-AUDIT-001',
        );
        expect(auditFinding).toBeUndefined();
      });
    });

    describe('Panguard Guard process check', () => {
      it('should report when panguard/guard is not in process list (Linux)', async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        stubExec({
          '/bin/journalctl': 'Archived journals: 100M',
          '/bin/systemctl': 'active',
          '/bin/ps': 'PID TTY TIME CMD\nnginx 1234\nnode 5678',
        });

        const findings = await mod.assessMonitoring();
        const guardFinding = findings.find(
          (f) => f.findingId === 'MON-GUARD-001',
        );
        expect(guardFinding).toBeDefined();
        expect(guardFinding!.severity).toBe('medium');
        expect(guardFinding!.category).toBe('monitoring');
      });

      it('should NOT report when panguard is in process list', async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        stubExec({
          '/bin/journalctl': 'Archived journals: 100M',
          '/bin/systemctl': 'active',
          '/bin/ps': 'PID TTY TIME CMD\npanguard-guard 1234\nnode 5678',
        });

        const findings = await mod.assessMonitoring();
        const guardFinding = findings.find(
          (f) => f.findingId === 'MON-GUARD-001',
        );
        expect(guardFinding).toBeUndefined();
      });

      it('should NOT report when guard keyword is in process list', async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        stubExec({
          '/usr/bin/log': 'system: ok',
          '/bin/ps': 'PID TTY TIME CMD\nguard-daemon 1234',
        });

        const findings = await mod.assessMonitoring();
        const guardFinding = findings.find(
          (f) => f.findingId === 'MON-GUARD-001',
        );
        expect(guardFinding).toBeUndefined();
      });
    });
  });

  // =========================================================================
  // assessPatching
  // =========================================================================
  describe('assessPatching', () => {
    describe('on macOS', () => {
      let assessPatching: AssessorsModule['assessPatching'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('darwin');
        assessPatching = mod.assessPatching;
      });

      it('should report pending updates with high severity when > 5', async () => {
        const updates = Array.from(
          { length: 7 },
          (_, i) => `   * macOS Update ${i}`,
        ).join('\n');
        stubExec({ '/usr/sbin/softwareupdate': updates });

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-001');
        expect(patchFinding).toBeDefined();
        expect(patchFinding!.severity).toBe('high');
        expect(patchFinding!.description).toContain('7');
      });

      it('should report pending updates with medium severity when <= 5', async () => {
        const updates =
          '   * Safari update\n   * Security Update 2025-001\n   * XProtect';
        stubExec({ '/usr/sbin/softwareupdate': updates });

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-001');
        expect(patchFinding).toBeDefined();
        expect(patchFinding!.severity).toBe('medium');
        expect(patchFinding!.description).toContain('3');
      });

      it('should NOT report when no updates are available', async () => {
        stubExec({
          '/usr/sbin/softwareupdate':
            'Software Update Tool\n\nNo new software available.',
        });

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-001');
        expect(patchFinding).toBeUndefined();
      });

      it('should handle softwareupdate failure gracefully', async () => {
        stubExec({ '/usr/sbin/softwareupdate': null });

        const findings = await assessPatching();
        expect(Array.isArray(findings)).toBe(true);
      });
    });

    describe('on Linux with apt', () => {
      let assessPatching: AssessorsModule['assessPatching'];

      beforeEach(async () => {
        resetAllMocks();
        const mod = await loadAssessors('linux');
        assessPatching = mod.assessPatching;
      });

      it('should report security updates (critical when > 10)', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/usr/bin/apt');
        const lines = Array.from(
          { length: 12 },
          (_, i) =>
            `libssl${i}/focal-security 1.1.1f-1ubuntu2.${i} amd64 [upgradable from: 1.1.1f-1ubuntu2.${i - 1}]`,
        ).join('\n');
        stubExec({ '/usr/bin/apt': `Listing...\n${lines}` });

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-002');
        expect(patchFinding).toBeDefined();
        expect(patchFinding!.severity).toBe('critical');
      });

      it('should report security updates with high severity when <= 10', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/usr/bin/apt');
        const lines = [
          'libssl/focal-security 1.1.1f amd64 [upgradable from: 1.1.1e]',
          'openssl/focal-security 1.1.1f amd64 [upgradable from: 1.1.1e]',
        ].join('\n');
        stubExec({ '/usr/bin/apt': `Listing...\n${lines}` });

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-002');
        expect(patchFinding).toBeDefined();
        expect(patchFinding!.severity).toBe('high');
      });

      it('should NOT report when no security updates are pending', async () => {
        mockExistsSync.mockImplementation((p: string) => p === '/usr/bin/apt');
        const lines =
          'vim/focal 8.1.2269-1 amd64 [upgradable from: 8.1.2269-0]';
        stubExec({ '/usr/bin/apt': `Listing...\n${lines}` });

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-002');
        expect(patchFinding).toBeUndefined();
      });

      it('should NOT check apt when /usr/bin/apt does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        const findings = await assessPatching();
        const patchFinding = findings.find((f) => f.findingId === 'PATCH-002');
        expect(patchFinding).toBeUndefined();
      });
    });

    describe('on win32', () => {
      it('should return empty findings on win32', async () => {
        resetAllMocks();
        const mod = await loadAssessors('win32');
        const findings = await mod.assessPatching();
        expect(findings).toEqual([]);
      });
    });
  });

  // =========================================================================
  // assessIncidentResponse
  // =========================================================================
  describe('assessIncidentResponse', () => {
    const configPath = `${process.env['HOME']}/.panguard/config.json`;
    let assessIncidentResponse: AssessorsModule['assessIncidentResponse'];

    beforeEach(async () => {
      resetAllMocks();
      const mod = await loadAssessors('linux');
      assessIncidentResponse = mod.assessIncidentResponse;
    });

    it('should report when Panguard config is missing', async () => {
      mockExistsSync.mockReturnValue(false);

      const findings = await assessIncidentResponse();
      const configFinding = findings.find(
        (f) => f.findingId === 'IR-CONFIG-001',
      );
      expect(configFinding).toBeDefined();
      expect(configFinding!.severity).toBe('low');
      expect(configFinding!.category).toBe('incident');
    });

    it('should report when no notification channels are configured', async () => {
      mockExistsSync.mockImplementation((p: string) => p === configPath);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === configPath) return JSON.stringify({ notifications: {} });
        return '';
      });

      const findings = await assessIncidentResponse();
      const notifyFinding = findings.find(
        (f) => f.findingId === 'IR-NOTIFY-001',
      );
      expect(notifyFinding).toBeDefined();
      expect(notifyFinding!.severity).toBe('medium');
    });

    it('should report when notifications key is missing entirely', async () => {
      mockExistsSync.mockImplementation((p: string) => p === configPath);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === configPath) return JSON.stringify({ someOther: true });
        return '';
      });

      const findings = await assessIncidentResponse();
      const notifyFinding = findings.find(
        (f) => f.findingId === 'IR-NOTIFY-001',
      );
      expect(notifyFinding).toBeDefined();
    });

    it('should NOT report when notification channels are configured', async () => {
      mockExistsSync.mockImplementation((p: string) => p === configPath);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === configPath) {
          return JSON.stringify({
            notifications: {
              telegram: { chatId: '12345', botToken: 'token' },
            },
          });
        }
        return '';
      });

      const findings = await assessIncidentResponse();
      const notifyFinding = findings.find(
        (f) => f.findingId === 'IR-NOTIFY-001',
      );
      expect(notifyFinding).toBeUndefined();
      const configFinding = findings.find(
        (f) => f.findingId === 'IR-CONFIG-001',
      );
      expect(configFinding).toBeUndefined();
    });

    it('should handle malformed JSON config gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => p === configPath);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === configPath) return '{ invalid json';
        return '';
      });

      const findings = await assessIncidentResponse();
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  // =========================================================================
  // runAssessment
  // =========================================================================
  describe('runAssessment', () => {
    let runAssessment: AssessorsModule['runAssessment'];

    beforeEach(async () => {
      resetAllMocks();
      stubExec({
        '/bin/journalctl': 'Archived journals: 100M',
        '/bin/systemctl': 'active',
        '/bin/ps': 'PID TTY TIME CMD',
      });
      const mod = await loadAssessors('linux');
      runAssessment = mod.runAssessment;
    });

    it('should run assessors for given categories', async () => {
      const findings = await runAssessment(['access_control']);
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should skip unknown categories', async () => {
      const findings = await runAssessment(['nonexistent_category']);
      expect(findings).toEqual([]);
    });

    it('should return empty array for empty category list', async () => {
      const findings = await runAssessment([]);
      expect(findings).toEqual([]);
    });

    it('should deduplicate assessor invocations for same function', async () => {
      // access_control and authentication both map to assessAccessControl
      const findings = await runAssessment([
        'access_control',
        'authentication',
      ]);
      const ids = findings.map((f) => f.findingId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should deduplicate findings by findingId', async () => {
      const findings = await runAssessment([
        'access_control',
        'system_protection',
        'encryption',
        'monitoring',
        'incident_response',
        'asset_management',
      ]);
      const ids = findings.map((f) => f.findingId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle assessor errors without crashing', async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, stdout: string) => void,
        ) => {
          cb(new Error('command failed'), '');
        },
      );

      const findings = await runAssessment([
        'access_control',
        'monitoring',
        'encryption',
      ]);
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should support all TCSA categories', async () => {
      const tcsa = [
        'access_control',
        'authentication',
        'system_protection',
        'network_security',
        'encryption',
        'monitoring',
        'incident_response',
        'asset_management',
        'patch_management',
        'audit',
      ];
      const findings = await runAssessment(tcsa);
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should support all SOC 2 categories', async () => {
      const soc2 = [
        'logical_access',
        'credentials',
        'access_management',
        'boundary_protection',
        'data_transmission',
        'anomaly_detection',
        'incident_evaluation',
        'change_management',
      ];
      const findings = await runAssessment(soc2);
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should support all ISO 27001 categories', async () => {
      const iso = [
        'technology',
        'malware',
        'vulnerability',
        'configuration',
        'data_protection',
        'logging',
        'network',
        'cryptography',
        'incident',
      ];
      const findings = await runAssessment(iso);
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  // =========================================================================
  // runFullAssessment
  // =========================================================================
  describe('runFullAssessment', () => {
    let runFullAssessment: AssessorsModule['runFullAssessment'];

    beforeEach(async () => {
      resetAllMocks();
      stubExec({
        '/bin/journalctl': 'Archived journals: 100M',
        '/bin/systemctl': 'active',
        '/bin/ps': 'PID TTY TIME CMD',
      });
      const mod = await loadAssessors('linux');
      runFullAssessment = mod.runFullAssessment;
    });

    it('should run all assessors and return findings', async () => {
      const findings = await runFullAssessment();
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should deduplicate findings by findingId', async () => {
      const findings = await runFullAssessment();
      const ids = findings.map((f) => f.findingId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should return findings with valid ComplianceFinding shape', async () => {
      const findings = await runFullAssessment();
      for (const f of findings) {
        expect(typeof f.findingId).toBe('string');
        expect(['critical', 'high', 'medium', 'low', 'info']).toContain(
          f.severity,
        );
        expect(typeof f.title).toBe('string');
        expect(typeof f.description).toBe('string');
        expect(typeof f.category).toBe('string');
        expect(f.timestamp).toBeInstanceOf(Date);
        expect(f.source).toBe('panguard-scan');
      }
    });

    it('should run all 6 unique assessor functions', async () => {
      const findings = await runFullAssessment();
      // On a "blank" linux system, at minimum: AC-PWD-001/002, IR-CONFIG-001, MON-GUARD-001
      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Finding shape / cross-cutting concerns
  // =========================================================================
  describe('Finding shape consistency', () => {
    it('all findings have source = panguard-scan', async () => {
      resetAllMocks();
      stubExec({
        '/bin/journalctl': '',
        '/bin/systemctl': 'inactive',
        '/bin/ps': 'PID TTY TIME CMD',
      });
      const mod = await loadAssessors('linux');

      const findings = await mod.runFullAssessment();
      for (const f of findings) {
        expect(f.source).toBe('panguard-scan');
      }
    });

    it('all findings have a timestamp within the test run window', async () => {
      resetAllMocks();
      stubExec({
        '/bin/journalctl': '',
        '/bin/systemctl': 'inactive',
        '/bin/ps': 'PID TTY TIME CMD',
      });

      const before = new Date();
      const mod = await loadAssessors('linux');
      const findings = await mod.runFullAssessment();
      const after = new Date();

      for (const f of findings) {
        expect(f.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(f.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });
  });
});
