/**
 * ATR output validator unit tests.
 * Exercises validateAtrOutput() and localFallbackValidate() directly.
 *
 * We import localFallbackValidate to guarantee deterministic results even
 * when the agent-threat-rules npm package is present (which uses its own
 * schema version). The fallback is the contract this package ships.
 */

import { describe, it, expect } from 'vitest';
import { validateAtrOutput } from '../src/index.js';
import { localFallbackValidate } from '../src/validators/atr-output-validator.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal ATR object that satisfies all required fields. */
const VALID_ATR = {
  schema_version: '0.1',
  title: 'Prompt Injection via Tool Output',
  id: 'ATR-2026-00001',
  rule_version: 1,
  status: 'experimental',
  description: 'Detects prompt injection payloads delivered through tool responses.',
  author: 'Test Suite',
  date: '2024/06/01',
  detection_tier: 'pattern',
  maturity: 'experimental',
  severity: 'high',
  tags: {
    category: 'prompt-injection',
    scan_target: 'runtime',
    confidence: 'high',
  },
  agent_source: {
    type: 'tool_call',
    framework: ['any'],
    provider: ['any'],
  },
  detection: {
    conditions: [{ field: 'content', operator: 'contains', value: 'ignore previous instructions' }],
    condition: 'any',
  },
  response: {
    actions: ['alert'],
    auto_response_threshold: 'high',
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validator', () => {
  it('ATR YAML that conforms to schema is reported valid with no errors', async () => {
    const result = await validateAtrOutput(VALID_ATR);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('missing required field (id) returns invalid with field name in error', () => {
    const noId = { ...VALID_ATR, id: undefined };
    const result = localFallbackValidate(noId);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorText = result.errors.join(' ').toLowerCase();
    expect(errorText).toContain('id');
  });

  it('invalid severity value returns invalid with allowed values listed in error', () => {
    // The local fallback validator enforces the canonical severity enum sourced
    // from agent-threat-rules loader.js: critical | high | medium | low | informational.
    // A severity outside that set must produce an invalid result with an error that
    // mentions both the offending field and the allowed values.
    const badSeverity = { ...VALID_ATR, severity: 'ultra-critical' };
    const result = localFallbackValidate(badSeverity);
    expect(result.valid).toBe(false);
    const severityErrors = result.errors.filter((e) => e.toLowerCase().includes('severity'));
    expect(severityErrors.length).toBeGreaterThan(0);
    const joined = severityErrors.join(' ');
    // Error should name the bad value and enumerate the canonical allowed set.
    expect(joined).toContain('ultra-critical');
    for (const allowed of ['critical', 'high', 'medium', 'low', 'informational']) {
      expect(joined).toContain(allowed);
    }
  });

  it('invalid id format (does not match ATR-YYYY-NNNNN) returns invalid with format error', () => {
    const badId = { ...VALID_ATR, id: 'INVALID-ID-FORMAT' };
    const result = localFallbackValidate(badId);
    expect(result.valid).toBe(false);
    const errorText = result.errors.join(' ').toLowerCase();
    expect(errorText).toContain('id');
    // Error should mention expected format
    expect(result.errors.some((e) => e.includes('ATR-') || e.includes('format'))).toBe(true);
  });

  it('missing title field returns invalid with title in error', () => {
    const noTitle = { ...VALID_ATR, title: '' };
    const result = localFallbackValidate(noTitle);
    expect(result.valid).toBe(false);
    const errorText = result.errors.join(' ').toLowerCase();
    expect(errorText).toContain('title');
  });

  it('missing detection block returns invalid', () => {
    const noDetection = { ...VALID_ATR, detection: undefined };
    const result = localFallbackValidate(noDetection);
    expect(result.valid).toBe(false);
    const errorText = result.errors.join(' ').toLowerCase();
    expect(errorText).toContain('detection');
  });
});
