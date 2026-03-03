/**
 * Panguard MCP - Server Tests
 * Panguard MCP - 伺服器測試
 *
 * Tests for the MCP server tool definitions and dispatcher.
 * MCP 伺服器工具定義和分派器的測試。
 *
 * @module @panguard-ai/panguard-mcp/tests/server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getAllToolDefinitions, dispatchTool } from '../src/server.js';

// ─── Tool Definitions ───────────────────────────────────────────────────────

describe('getAllToolDefinitions()', () => {
  it('returns exactly 10 tool definitions', () => {
    const tools = getAllToolDefinitions();
    expect(tools).toHaveLength(10);
  });

  it('contains all expected tool names', () => {
    const tools = getAllToolDefinitions();
    const names = tools.map((t) => t.name);
    expect(names).toContain('panguard_scan');
    expect(names).toContain('panguard_scan_code');
    expect(names).toContain('panguard_guard_start');
    expect(names).toContain('panguard_guard_stop');
    expect(names).toContain('panguard_status');
    expect(names).toContain('panguard_alerts');
    expect(names).toContain('panguard_block_ip');
    expect(names).toContain('panguard_generate_report');
    expect(names).toContain('panguard_init');
    expect(names).toContain('panguard_deploy');
  });

  it('every tool has an inputSchema', () => {
    const tools = getAllToolDefinitions();
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it('every tool has a non-empty description', () => {
    const tools = getAllToolDefinitions();
    for (const tool of tools) {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('panguard_block_ip requires "ip" field', () => {
    const tools = getAllToolDefinitions();
    const blockTool = tools.find((t) => t.name === 'panguard_block_ip');
    expect(blockTool).toBeDefined();
    expect(blockTool!.inputSchema.required).toContain('ip');
  });

  it('panguard_scan_code requires "dir" field', () => {
    const tools = getAllToolDefinitions();
    const scanCodeTool = tools.find((t) => t.name === 'panguard_scan_code');
    expect(scanCodeTool).toBeDefined();
    expect(scanCodeTool!.inputSchema.required).toContain('dir');
  });
});

// ─── dispatchTool — panguard_status ─────────────────────────────────────────

describe('dispatchTool("panguard_status", {})', () => {
  it('returns a content array with text', async () => {
    const result = await dispatchTool('panguard_status', {});
    expect(result.content).toBeInstanceOf(Array);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(typeof result.content[0]!.text).toBe('string');
  });

  it('returns valid JSON with guard status field', async () => {
    const result = await dispatchTool('panguard_status', {});
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('guard');
    expect(parsed).toHaveProperty('summary');
  });
});

// ─── dispatchTool — panguard_block_ip ───────────────────────────────────────

describe('dispatchTool("panguard_block_ip", ...)', () => {
  it('returns error when no IP is provided', async () => {
    const result = await dispatchTool('panguard_block_ip', {});
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('error');
  });

  it('returns error for an invalid IP address', async () => {
    const result = await dispatchTool('panguard_block_ip', { ip: 'not-an-ip' });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('error');
  });

  it('returns success for a valid IPv4 address', async () => {
    const result = await dispatchTool('panguard_block_ip', { ip: '192.168.1.1' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('status', 'blocked');
    expect(parsed).toHaveProperty('ip', '192.168.1.1');
  });

  it('returns success for a valid IPv6 address', async () => {
    const result = await dispatchTool('panguard_block_ip', { ip: '::1' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('status', 'blocked');
  });

  it('includes custom reason in the blocked response', async () => {
    const result = await dispatchTool('panguard_block_ip', {
      ip: '10.0.0.1',
      reason: 'Suspicious scan activity',
    });
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed['reason']).toBe('Suspicious scan activity');
  });
});

// ─── dispatchTool — panguard_init ───────────────────────────────────────────

const TEST_DATA_DIR = path.join(os.tmpdir(), 'test-panguard-mcp-' + Date.now());

describe('dispatchTool("panguard_init", ...)', () => {
  afterAll(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it('creates the data directory and config.json', async () => {
    const result = await dispatchTool('panguard_init', { dataDir: TEST_DATA_DIR });
    expect(result.isError).toBeFalsy();

    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed['status']).toBe('initialized');
    expect(parsed['dataDir']).toBe(TEST_DATA_DIR);

    const configPath = path.join(TEST_DATA_DIR, 'config.json');
    const exists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('writes valid JSON config with correct defaults', async () => {
    const configPath = path.join(TEST_DATA_DIR, 'config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as Record<string, unknown>;

    expect(config['mode']).toBe('learning');
    expect(config['lang']).toBe('en');
    expect(config['dataDir']).toBe(TEST_DATA_DIR);
  });

  it('respects custom mode and lang arguments', async () => {
    const customDir = TEST_DATA_DIR + '-custom';
    try {
      await dispatchTool('panguard_init', {
        dataDir: customDir,
        mode: 'protection',
        lang: 'zh-TW',
      });

      const configPath = path.join(customDir, 'config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as Record<string, unknown>;

      expect(config['mode']).toBe('protection');
      expect(config['lang']).toBe('zh-TW');
    } finally {
      await fs.rm(customDir, { recursive: true, force: true });
    }
  });
});

// ─── dispatchTool — panguard_alerts ─────────────────────────────────────────

describe('dispatchTool("panguard_alerts", {})', () => {
  it('returns content array even when no events file exists', async () => {
    const result = await dispatchTool('panguard_alerts', {
      dataDir: path.join(os.tmpdir(), 'nonexistent-panguard-' + Date.now()),
    });
    expect(result.content).toBeInstanceOf(Array);
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('total_alerts', 0);
    expect(parsed).toHaveProperty('alerts');
    expect(Array.isArray(parsed['alerts'])).toBe(true);
  });
});

// ─── dispatchTool — panguard_guard_start / stop ──────────────────────────────

describe('dispatchTool("panguard_guard_start", {})', () => {
  it('returns status ready with dataDir and command', async () => {
    const result = await dispatchTool('panguard_guard_start', {
      dataDir: path.join(os.tmpdir(), 'pg-mcp-guard-test-' + Date.now()),
    });
    expect(result.content).toBeInstanceOf(Array);
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed).toHaveProperty('status', 'ready');
    expect(typeof parsed['command']).toBe('string');
  });
});

describe('dispatchTool("panguard_guard_stop", {})', () => {
  it('returns status not_running when no PID file', async () => {
    const result = await dispatchTool('panguard_guard_stop', {
      dataDir: path.join(os.tmpdir(), 'pg-mcp-stop-test-' + Date.now()),
    });
    const parsed = JSON.parse(result.content[0]!.text as string) as Record<string, unknown>;
    expect(parsed['status']).toBe('not_running');
  });
});

// ─── dispatchTool — unknown tool ─────────────────────────────────────────────

describe('dispatchTool with unknown tool name', () => {
  it('returns isError: true for unknown tools', async () => {
    const result = await dispatchTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });
});
