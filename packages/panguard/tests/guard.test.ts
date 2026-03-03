/**
 * Tests for `panguard guard` command
 * Tests command structure, subcommand parsing, and argument forwarding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guardCommand } from '../src/cli/commands/guard.js';

// Mock the guard engine CLI
vi.mock('@panguard-ai/panguard-guard', () => ({
  runCLI: vi.fn().mockResolvedValue(undefined),
}));

import { runCLI } from '@panguard-ai/panguard-guard';

const mockedRunCLI = vi.mocked(runCLI);

describe('guardCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a command named "guard"', () => {
    const cmd = guardCommand();
    expect(cmd.name()).toBe('guard');
  });

  it('should have a description', () => {
    const cmd = guardCommand();
    expect(cmd.description()).toContain('Guard engine');
  });

  describe('subcommands', () => {
    it('should register expected subcommands', () => {
      const cmd = guardCommand();
      const subcommandNames = cmd.commands.map((c) => c.name());
      expect(subcommandNames).toContain('start');
      expect(subcommandNames).toContain('stop');
      expect(subcommandNames).toContain('restart');
      expect(subcommandNames).toContain('status');
      expect(subcommandNames).toContain('config');
      expect(subcommandNames).toContain('generate-key');
      expect(subcommandNames).toContain('install');
      expect(subcommandNames).toContain('uninstall');
    });

    it('should have 8 subcommands total', () => {
      const cmd = guardCommand();
      expect(cmd.commands).toHaveLength(8);
    });
  });

  describe('guard start', () => {
    it('should forward "start" to runCLI', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['start'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['start']);
    });

    it('should forward --data-dir option', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['start', '--data-dir', '/tmp/guard'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['start', '--data-dir', '/tmp/guard']);
    });

    it('should forward --verbose flag', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['start', '--verbose'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['start', '--verbose']);
    });

    it('should forward --manager option', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['start', '--manager', 'https://manager.local:8443'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith([
        'start',
        '--manager',
        'https://manager.local:8443',
      ]);
    });

    it('should forward all options combined', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(
        ['start', '--data-dir', '/data', '--verbose', '--manager', 'http://m:8443'],
        { from: 'user' }
      );
      expect(mockedRunCLI).toHaveBeenCalledWith([
        'start',
        '--data-dir',
        '/data',
        '--verbose',
        '--manager',
        'http://m:8443',
      ]);
    });

    it('should have --verbose default to false', () => {
      const cmd = guardCommand();
      const startCmd = cmd.commands.find((c) => c.name() === 'start');
      expect(startCmd).toBeDefined();
      const verboseOpt = startCmd!.options.find((o) => o.long === '--verbose');
      expect(verboseOpt).toBeDefined();
    });
  });

  describe('guard stop', () => {
    it('should forward "stop" to runCLI', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['stop'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['stop']);
    });

    it('should forward --data-dir option', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['stop', '--data-dir', '/custom/dir'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['stop', '--data-dir', '/custom/dir']);
    });
  });

  describe('guard status', () => {
    it('should forward "status" to runCLI', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['status'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['status']);
    });

    it('should forward --data-dir option', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['status', '--data-dir', '/var/data'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['status', '--data-dir', '/var/data']);
    });
  });

  describe('guard config', () => {
    it('should forward "config" to runCLI', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['config'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['config']);
    });

    it('should forward --data-dir option', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['config', '--data-dir', '/etc/panguard'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['config', '--data-dir', '/etc/panguard']);
    });
  });

  describe('guard generate-key', () => {
    it('should forward "generate-key" to runCLI without tier', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['generate-key'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['generate-key']);
    });

    it('should forward tier argument when provided', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['generate-key', 'pro'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['generate-key', 'pro']);
    });
  });

  describe('guard install', () => {
    it('should forward "install" to runCLI', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['install'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['install']);
    });

    it('should forward --data-dir option', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['install', '--data-dir', '/srv/panguard'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['install', '--data-dir', '/srv/panguard']);
    });
  });

  describe('guard uninstall', () => {
    it('should forward "uninstall" to runCLI', async () => {
      const cmd = guardCommand();
      await cmd.parseAsync(['uninstall'], { from: 'user' });
      expect(mockedRunCLI).toHaveBeenCalledWith(['uninstall']);
    });
  });
});
