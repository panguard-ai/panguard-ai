/**
 * Advisory-only invariant (unknown-attack flywheel).
 *
 * A verdict derived from a behavioral anomaly with no deterministic rule/intel
 * match (adviseOnly: true) may be surfaced and reported to Threat Cloud, but MUST
 * NEVER auto-block — regardless of how high its confidence is. This is the
 * enforcement half of "widen what we LEARN FROM without widening what we ENFORCE".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ThreatVerdict } from '../src/types.js';
import { DEFAULT_ACTION_POLICY } from '../src/types.js';

// Any block action would shell out — mock it so a leaked block is observable as
// success:true on a real action rather than a thrown command.
vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb: (err: Error | null, stdout: string) => void
    ) => cb(null, '')
  ),
}));
vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

import { RespondAgent } from '../src/agent/respond-agent.js';
import { PERMISSIVE_ENFORCEMENT_POLICY } from '../src/agent/respond/safety-rules.js';

function makeVerdict(overrides: Partial<ThreatVerdict>): ThreatVerdict {
  return {
    conclusion: 'malicious',
    confidence: 100,
    enforcementConfidence: 100,
    reasoning: 'test',
    recommendedAction: 'block_ip',
    evidence: [
      {
        source: 'behavioral_deviation',
        description: 'New process not in baseline',
        confidence: 70,
        data: { ip: '10.0.0.9', remoteAddress: '10.0.0.9' },
      },
    ],
    mitreTechnique: 'T1059',
    ...overrides,
  } as ThreatVerdict;
}

describe('RespondAgent — advisory-only invariant', () => {
  let agent: RespondAgent;
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = mkdtempSync(join(tmpdir(), 'respond-advisory-test-'));
    agent = new RespondAgent(
      DEFAULT_ACTION_POLICY,
      'protection',
      [],
      tempDir,
      PERMISSIVE_ENFORCEMENT_POLICY
    );
  });
  afterEach(() => {
    agent.destroy();
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      /* best-effort */
    }
  });

  it('adviseOnly=true NEVER blocks, even at max confidence + a block recommendation', async () => {
    const verdict = makeVerdict({
      adviseOnly: true,
      confidence: 100,
      enforcementConfidence: 100,
      recommendedAction: 'block_ip',
    });
    const result = await agent.respond(verdict);
    // Reported, not enforced.
    expect(result.action).toBe('log_only');
    // And it did NOT execute a real block (which would surface as a block_ip action).
    expect(result.action).not.toBe('block_ip');
  });

  it('CONTROL: the same high-confidence verdict WITHOUT adviseOnly does enforce', async () => {
    const verdict = makeVerdict({
      confidence: 100,
      enforcementConfidence: 100,
      recommendedAction: 'block_ip',
    });
    const result = await agent.respond(verdict);
    // Deterministic high-confidence verdict → real enforcement path (not log_only).
    expect(result.action).toBe('block_ip');
  });

  it('adviseOnly ignores enforcementConfidence entirely (log_only even at 100)', async () => {
    const verdict = makeVerdict({ adviseOnly: true, enforcementConfidence: 100, confidence: 100 });
    const result = await agent.respond(verdict);
    expect(result.action).toBe('log_only');
    expect(result.success).toBe(true);
  });
});
