/**
 * enforce-lane-block-gate.test.ts
 *
 * Verifies the lane gate on auto-blocking: only enforce-lane (maturity:stable)
 * ATR rules may auto-block; a hunt/test rule that matches has its blocking action
 * downgraded to a non-blocking 'notify' (it still surfaces, it just cannot block on
 * the higher false-positive rate). This is the documented lane model.
 */
import { describe, it, expect } from 'vitest';
import type { EnvironmentBaseline, DetectionResult } from '../src/types.js';
import { AnalyzeAgent } from '../src/agent/analyze-agent.js';

const baseline: EnvironmentBaseline = {
  processes: {},
  networkConnections: {},
  fileAccess: {},
  established: true,
} as unknown as EnvironmentBaseline;

function detectionWith(maturity: string): DetectionResult {
  return {
    event: {
      source: 'agent',
      description: 'tool call with a blocking-rule match',
    },
    ruleMatches: [{ ruleId: 'r', ruleName: 'blocking rule', severity: 'critical' }],
    atrMatches: [
      {
        ruleId: 'ATR-TEST-BLOCK',
        category: 'tool-poisoning',
        severity: 'critical',
        responseActions: ['block_tool'],
        confidence: 0.98,
        maturity,
      },
    ],
  } as unknown as DetectionResult;
}

describe('enforce-lane auto-block gate', () => {
  it('a stable (enforce-lane) rule with block_tool DOES block', async () => {
    const agent = new AnalyzeAgent(null);
    const verdict = await agent.analyze(detectionWith('stable'), baseline);
    expect(verdict.recommendedAction).toBe('block_tool');
  });

  it('a test (hunt-lane) rule with block_tool is downgraded to notify (does NOT block)', async () => {
    const agent = new AnalyzeAgent(null);
    const verdict = await agent.analyze(detectionWith('test'), baseline);
    expect(verdict.recommendedAction).toBe('notify');
  });

  it('an experimental rule likewise cannot auto-block', async () => {
    const agent = new AnalyzeAgent(null);
    const verdict = await agent.analyze(detectionWith('experimental'), baseline);
    expect(verdict.recommendedAction).not.toBe('block_tool');
  });
});
