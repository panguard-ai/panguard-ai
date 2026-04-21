/**
 * Tests for `panguard report` command
 *
 * Validates the real AI Compliance Audit Evidence generator
 * (not the old Coming Soon stub). Covers command structure,
 * subcommand registration, and per-subcommand option surface.
 *
 * End-to-end output generation is exercised by integration tests that
 * point PANGUARD_ATR_RULES_DIR at a fixture directory. These unit tests
 * verify the CLI contract without requiring real ATR rules on disk.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportCommand } from '../src/cli/commands/report.js';

describe('reportCommand', () => {
  const originalAtrDir = process.env['PANGUARD_ATR_RULES_DIR'];

  beforeEach(() => {
    vi.clearAllMocks();
    // Point at a non-existent dir so commands exit cleanly without loading real rules
    process.env['PANGUARD_ATR_RULES_DIR'] = '/tmp/__nonexistent_atr_rules__';
  });

  afterEach(() => {
    if (originalAtrDir === undefined) {
      delete process.env['PANGUARD_ATR_RULES_DIR'];
    } else {
      process.env['PANGUARD_ATR_RULES_DIR'] = originalAtrDir;
    }
  });

  it('should create a command named "report"', () => {
    const cmd = reportCommand();
    expect(cmd.name()).toBe('report');
  });

  it('should describe itself as the compliance evidence generator', () => {
    const cmd = reportCommand();
    expect(cmd.description().toLowerCase()).toContain('compliance');
  });

  describe('subcommands', () => {
    it('should register expected subcommands', () => {
      const cmd = reportCommand();
      const subcommandNames = cmd.commands.map((c) => c.name());
      expect(subcommandNames).toContain('list-frameworks');
      expect(subcommandNames).toContain('summary');
      expect(subcommandNames).toContain('generate');
      expect(subcommandNames).toContain('validate');
    });

    it('should have exactly 4 subcommands', () => {
      const cmd = reportCommand();
      expect(cmd.commands).toHaveLength(4);
    });
  });

  describe('report generate', () => {
    it('should expose expected options on generate subcommand', () => {
      const cmd = reportCommand();
      const genCmd = cmd.commands.find((c) => c.name() === 'generate');
      expect(genCmd).toBeDefined();
      const optionNames = genCmd!.options.map((o) => o.long);
      expect(optionNames).toContain('--framework');
      expect(optionNames).toContain('--format');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--org');
    });

    it('should accept --framework option', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await expect(
        cmd.parseAsync(['generate', '--framework', 'owasp-agentic'], { from: 'user' })
      ).resolves.not.toThrow();
      logSpy.mockRestore();
    });

    it('should accept --format json', async () => {
      const cmd = reportCommand();
      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await expect(
        cmd.parseAsync(['generate', '--framework', 'owasp-agentic', '--format', 'json'], {
          from: 'user',
        })
      ).resolves.not.toThrow();
      stdoutSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should accept --org option', async () => {
      const cmd = reportCommand();
      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await expect(
        cmd.parseAsync(['generate', '--framework', 'owasp-agentic', '--org', 'Acme Corp'], {
          from: 'user',
        })
      ).resolves.not.toThrow();
      stdoutSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should warn when --framework is missing', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.parseAsync(['generate'], { from: 'user' });
      const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(output.toLowerCase()).toMatch(/framework.*required|list-frameworks/);
      logSpy.mockRestore();
    });
  });

  describe('report summary', () => {
    it('should expose --framework option', () => {
      const cmd = reportCommand();
      const sumCmd = cmd.commands.find((c) => c.name() === 'summary');
      expect(sumCmd).toBeDefined();
      const optionNames = sumCmd!.options.map((o) => o.long);
      expect(optionNames).toContain('--framework');
    });

    it('should run with --framework owasp-agentic', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await expect(
        cmd.parseAsync(['summary', '--framework', 'owasp-agentic'], { from: 'user' })
      ).resolves.not.toThrow();
      logSpy.mockRestore();
    });

    it('should warn when --framework is missing', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.parseAsync(['summary'], { from: 'user' });
      const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(output.toLowerCase()).toMatch(/framework.*required|list-frameworks/);
      logSpy.mockRestore();
    });
  });

  describe('report list-frameworks', () => {
    it('should run without error', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.parseAsync(['list-frameworks'], { from: 'user' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should list all six supported frameworks in output', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.parseAsync(['list-frameworks'], { from: 'user' });
      const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(output).toContain('owasp-agentic');
      expect(output).toContain('owasp-llm');
      expect(output).toContain('eu-ai-act');
      expect(output).toContain('colorado-ai-act');
      expect(output).toContain('nist-ai-rmf');
      expect(output).toContain('iso-42001');
      logSpy.mockRestore();
    });
  });

  describe('report validate', () => {
    it('should run without error', async () => {
      const cmd = reportCommand();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.parseAsync(['validate'], { from: 'user' });
      logSpy.mockRestore();
    });
  });

  describe('no-longer-coming-soon', () => {
    it('should NOT print "coming soon" for any subcommand', async () => {
      const subcommands = ['list-frameworks', 'validate'];
      for (const sub of subcommands) {
        const cmd = reportCommand();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await cmd.parseAsync([sub], { from: 'user' });
        const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(output.toLowerCase()).not.toMatch(/coming soon|即將推出/);
        logSpy.mockRestore();
      }
    });
  });
});
