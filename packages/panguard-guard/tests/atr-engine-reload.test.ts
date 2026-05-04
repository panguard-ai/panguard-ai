/**
 * GuardATREngine.reloadRules() tests — live rule reload contract.
 *
 * Pins the live-reload semantics that the SIGHUP signal handler and
 * fsnotify watcher rely on:
 *   - Adding a rule file to disk + reloadRules() loads it
 *   - Removing a rule file + reloadRules() drops it from the engine
 *   - reloadRules can be called repeatedly without engine corruption
 *   - Rule count returned matches the actual loaded set
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GuardATREngine } from '../src/engines/atr-engine.js';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let rulesDir: string;
let engine: GuardATREngine;

const RULE_TEMPLATE = (id: string, title: string) => `
schema_version: '0.1'
title: ${title}
id: ${id}
status: experimental
detection_tier: pattern
maturity: experimental
severity: medium
description: Reload test rule.
author: Reload Test Suite
date: 2026-05-04
rule_version: 1
tags:
  category: tool-poisoning
  scan_target: agent_action
  confidence: high
agent_source:
  type: tool_call
  framework: [claude-code]
  provider: [anthropic]
detection:
  condition: any
  conditions:
    - field: tool_call.arguments
      operator: contains
      value: trigger-${id}
response:
  actions: [block]
  auto_response_threshold: medium
`;

beforeEach(async () => {
  rulesDir = mkdtempSync(join(tmpdir(), 'atr-reload-test-'));
  // Note: bundledRulesDir set to a non-existent dir so the bundled engine is null.
  // Keeps the test focused on custom-dir reload behavior.
  engine = new GuardATREngine({ rulesDir, bundledRulesDir: '/nonexistent-bundled' });
  await engine.loadRules();
});

afterEach(() => {
  if (existsSync(rulesDir)) rmSync(rulesDir, { recursive: true, force: true });
});

describe('GuardATREngine.reloadRules', () => {
  it('returns 0 rules from empty rules dir', async () => {
    const result = await engine.reloadRules();
    expect(result.total).toBe(0);
    expect(result.custom).toBe(0);
  });

  it('picks up a newly added rule file', async () => {
    writeFileSync(
      join(rulesDir, 'new-rule.yaml'),
      RULE_TEMPLATE('ATR-2026-99001', 'New rule one')
    );
    const result = await engine.reloadRules();
    expect(result.custom).toBe(1);
  });

  it('drops a removed rule file', async () => {
    writeFileSync(
      join(rulesDir, 'rule-a.yaml'),
      RULE_TEMPLATE('ATR-2026-99002', 'Rule A')
    );
    let result = await engine.reloadRules();
    expect(result.custom).toBe(1);

    rmSync(join(rulesDir, 'rule-a.yaml'));
    result = await engine.reloadRules();
    expect(result.custom).toBe(0);
  });

  it('handles repeated reloads without corruption', async () => {
    writeFileSync(
      join(rulesDir, 'r1.yaml'),
      RULE_TEMPLATE('ATR-2026-99003', 'R1')
    );
    for (let i = 0; i < 5; i++) {
      const result = await engine.reloadRules();
      expect(result.custom).toBe(1);
    }
  });

  it('reflects rule changes between reloads', async () => {
    writeFileSync(
      join(rulesDir, 'a.yaml'),
      RULE_TEMPLATE('ATR-2026-99004', 'A')
    );
    let result = await engine.reloadRules();
    expect(result.custom).toBe(1);

    writeFileSync(
      join(rulesDir, 'b.yaml'),
      RULE_TEMPLATE('ATR-2026-99005', 'B')
    );
    writeFileSync(
      join(rulesDir, 'c.yaml'),
      RULE_TEMPLATE('ATR-2026-99006', 'C')
    );
    result = await engine.reloadRules();
    expect(result.custom).toBe(3);
  });

  it('reload exposes new rule via getRuleCount', async () => {
    // Initial: 0 rules
    expect(engine.getRuleCount()).toBe(0);

    // Add rule + reload
    writeFileSync(
      join(rulesDir, 'live.yaml'),
      RULE_TEMPLATE('ATR-2026-99007', 'Live load test')
    );
    await engine.reloadRules();

    // Engine now has the rule loaded — covers the public surface that
    // dashboard + status output rely on. End-to-end evaluate() is
    // exercised in e2e-atr-detection.test.ts.
    expect(engine.getRuleCount()).toBe(1);
  });
});
