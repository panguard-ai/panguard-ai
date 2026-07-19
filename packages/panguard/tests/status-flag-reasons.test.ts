/**
 * `pga status` must answer WHY a skill was flagged, not just THAT it was.
 *
 * A verdict the user cannot interrogate leaves only bad options: delete a skill
 * they depend on, or ignore a real warning. Naming the rule turns it into a
 * decision — every ATR rule id is a public YAML file they can read and dispute.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { printFlagReasons } from '../src/cli/commands/status.js';

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

const capture = (fn: () => void): string => {
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    lines.push(a.map(String).join(' '));
  });
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  // Strip colour so assertions read on content, not escape codes.
  return lines.join('\n').replace(ANSI, '');
};

const verdict = (over: Record<string, unknown> = {}) =>
  ({
    name: 'repo-helper',
    normalizedName: 'repo-helper',
    platform: 'claude-code',
    riskLevel: 'CRITICAL',
    scannedAt: '2026-07-19T00:00:00.000Z',
    ...over,
  }) as never;

afterEach(() => vi.restoreAllMocks());

describe('status: why a skill was flagged', () => {
  it('names the rule that fired, and points at the live view for the lines', () => {
    const out = capture(() =>
      printFlagReasons(
        [{ name: 'repo-helper' }],
        new Map([
          [
            'repo-helper',
            verdict({
              evidence: [
                {
                  ruleId: 'ATR-2026-00162',
                  title: 'Outbound copy of local files',
                  severity: 'critical',
                },
              ],
            }),
          ],
        ]),
        'en'
      )
    );
    expect(out).toContain('Why these were flagged');
    expect(out).toContain('ATR-2026-00162');
    expect(out).toContain('Outbound copy of local files');
    // The matched lines are NOT in the store; status must send users to the live path.
    expect(out).toContain('pga audit ~/.claude/skills/repo-helper --verbose');
    expect(out).toContain('agentthreatrule.org/rules');
  });

  it('orders worst-first so triage can stop reading early', () => {
    const out = capture(() =>
      printFlagReasons(
        [{ name: 'mild' }, { name: 'nasty' }],
        new Map([
          ['mild', verdict({ name: 'mild', normalizedName: 'mild', riskLevel: 'HIGH' })],
          ['nasty', verdict({ name: 'nasty', normalizedName: 'nasty', riskLevel: 'CRITICAL' })],
        ]),
        'en'
      )
    );
    expect(out.indexOf('nasty')).toBeLessThan(out.indexOf('mild'));
  });

  it('says so when a verdict predates the evidence layer, rather than showing a blank', () => {
    const out = capture(() =>
      printFlagReasons([{ name: 'repo-helper' }], new Map([['repo-helper', verdict()]]), 'en')
    );
    expect(out).toContain('re-scan');
  });

  it('prints nothing when no installed skill is flagged', () => {
    expect(capture(() => printFlagReasons([{ name: 'clean' }], new Map(), 'en'))).toBe('');
  });
});
