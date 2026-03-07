/**
 * Panguard MCP - Scan Tools SAST-Unavailable Branch Tests
 * Panguard MCP - 掃描工具 SAST 不可用分支測試
 *
 * Tests the fallback path in executeScanCode when the panguard-scan module
 * does NOT export checkSourceCode or checkHardcodedSecrets. This simulates
 * an older build where SAST is not yet available.
 *
 * @module @panguard-ai/panguard-mcp/tests/scan-tools-sast-unavailable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Setup ─────────────────────────────────────────────────────────────

// Mock the panguard-scan module WITHOUT SAST functions — simulates an older build.
vi.mock('@panguard-ai/panguard-scan', () => ({
  runScan: vi.fn(),
  generatePdfReport: vi.fn(),
  // Intentionally NO checkSourceCode or checkHardcodedSecrets exported
}));

vi.mock('@panguard-ai/core', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@panguard-ai/panguard-skill-auditor', () => ({
  auditSkill: vi.fn(),
}));

// Import AFTER mocks so the module-level top-level await sees the mock.
import { dispatchTool } from '../src/server.js';

// ─── Helper ─────────────────────────────────────────────────────────────────

function parseResult(result: { content: Array<{ text: string }> }): Record<string, unknown> {
  return JSON.parse(result.content[0]!.text) as Record<string, unknown>;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('panguard_scan_code — SAST unavailable (no checkSourceCode export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status "unavailable" when SAST functions are not exported', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/some/code' });
    const parsed = parseResult(result);

    expect(parsed['status']).toBe('unavailable');
  });

  it('includes a message explaining the SAST feature is not available', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/some/code' });
    const parsed = parseResult(result);

    expect(typeof parsed['message']).toBe('string');
    expect((parsed['message'] as string).length).toBeGreaterThan(10);
  });

  it('includes the target directory in the unavailable response', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/my/project' });
    const parsed = parseResult(result);

    expect(parsed['target']).toBe('/my/project');
  });

  it('reports scan_type as "sast" even when unavailable', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/code' });
    const parsed = parseResult(result);

    expect(parsed['scan_type']).toBe('sast');
  });

  it('does NOT set isError — unavailability is not an error condition', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/code' });

    expect((result as Record<string, unknown>)['isError']).toBeFalsy();
  });

  it('returns content with type "text"', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/code' });

    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(typeof result.content[0]!.text).toBe('string');
  });

  it('response text is valid JSON', async () => {
    const result = await dispatchTool('panguard_scan_code', { dir: '/code' });

    expect(() => JSON.parse(result.content[0]!.text)).not.toThrow();
  });

  it('defaults dir to "." when not provided', async () => {
    const result = await dispatchTool('panguard_scan_code', {});
    const parsed = parseResult(result);

    expect(parsed['target']).toBe('.');
  });
});
