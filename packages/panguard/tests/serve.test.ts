/**
 * Tests for `panguard serve` command
 * Tests command structure and option parsing
 *
 * Note: The serve command creates an actual HTTP server, so we test the
 * Command object structure and option defaults without invoking the action.
 */

import { describe, it, expect, vi } from 'vitest';
import { serveCommand } from '../src/cli/commands/serve.js';

// Mock heavy dependencies that would be imported at module level
vi.mock('@panguard-ai/panguard-auth', () => ({
  AuthDB: vi.fn(),
  createAuthHandlers: vi.fn(),
  sendExpirationWarningEmail: vi.fn(),
  initErrorTracking: vi.fn(),
  captureRequestError: vi.fn(),
  generateOpenApiSpec: vi.fn(),
  generateSwaggerHtml: vi.fn(),
  ManagerProxy: vi.fn(),
}));

vi.mock('@panguard-ai/manager', () => ({
  ManagerServer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
  DEFAULT_MANAGER_CONFIG: { port: 8443 },
}));

vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@panguard-ai/core')>();
  return {
    ...actual,
    c: {
      sage: (s: string) => s,
      bold: (s: string) => s,
      dim: (s: string) => s,
      safe: (s: string) => s,
      caution: (s: string) => s,
      critical: (s: string) => s,
      underline: (s: string) => s,
    },
    banner: () => 'BANNER',
  };
});

describe('serveCommand', () => {
  it('should create a command named "serve"', () => {
    const cmd = serveCommand();
    expect(cmd.name()).toBe('serve');
  });

  it('should have a description mentioning HTTP server', () => {
    const cmd = serveCommand();
    expect(cmd.description()).toContain('HTTP');
  });

  describe('options', () => {
    it('should define --port option with default 3000', () => {
      const cmd = serveCommand();
      const portOpt = cmd.options.find((o) => o.long === '--port');
      expect(portOpt).toBeDefined();
      expect(portOpt!.defaultValue).toBe('3000');
    });

    it('should define --host option with default 127.0.0.1', () => {
      const cmd = serveCommand();
      const hostOpt = cmd.options.find((o) => o.long === '--host');
      expect(hostOpt).toBeDefined();
      expect(hostOpt!.defaultValue).toBe('127.0.0.1');
    });

    it('should define --db option with default path', () => {
      const cmd = serveCommand();
      const dbOpt = cmd.options.find((o) => o.long === '--db');
      expect(dbOpt).toBeDefined();
      expect(dbOpt!.defaultValue).toContain('.panguard');
      expect(dbOpt!.defaultValue).toContain('auth.db');
    });

    it('should define --manager-port option with default 8443', () => {
      const cmd = serveCommand();
      const mgrPortOpt = cmd.options.find((o) => o.long === '--manager-port');
      expect(mgrPortOpt).toBeDefined();
      expect(mgrPortOpt!.defaultValue).toBe('8443');
    });

    it('should have exactly 4 options', () => {
      const cmd = serveCommand();
      expect(cmd.options).toHaveLength(4);
    });
  });

  describe('option value types', () => {
    it('should accept custom port via --port', () => {
      const cmd = serveCommand();
      const portOpt = cmd.options.find((o) => o.long === '--port');
      expect(portOpt).toBeDefined();
      // The option expects a value argument
      expect(portOpt!.flags).toContain('<port>');
    });

    it('should accept custom host via --host', () => {
      const cmd = serveCommand();
      const hostOpt = cmd.options.find((o) => o.long === '--host');
      expect(hostOpt).toBeDefined();
      expect(hostOpt!.flags).toContain('<host>');
    });

    it('should accept custom db path via --db', () => {
      const cmd = serveCommand();
      const dbOpt = cmd.options.find((o) => o.long === '--db');
      expect(dbOpt).toBeDefined();
      expect(dbOpt!.flags).toContain('<path>');
    });

    it('should accept custom manager port via --manager-port', () => {
      const cmd = serveCommand();
      const mgrOpt = cmd.options.find((o) => o.long === '--manager-port');
      expect(mgrOpt).toBeDefined();
      expect(mgrOpt!.flags).toContain('<port>');
    });
  });

  describe('option descriptions', () => {
    it('should have descriptions for all options', () => {
      const cmd = serveCommand();
      for (const opt of cmd.options) {
        expect(opt.description).toBeTruthy();
        expect(opt.description.length).toBeGreaterThan(0);
      }
    });
  });
});
