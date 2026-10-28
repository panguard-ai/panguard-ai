import { describe, expect, it } from 'vitest';
import { VerdictLedger, type CallRecordInput } from '../src/ledger.js';

const call = (id: string, status: CallRecordInput['status']): CallRecordInput => ({
  call_id: id,
  item_id: `fc_${id}`,
  name: 'run_shell',
  canonicalArguments: '{"command":"ls"}',
  status,
  decision_id: `dec-${id}`,
  rules: status === 'withheld' ? ['ATR-X'] : [],
  reason: status === 'withheld' ? 'blocked' : 'ok',
});

const options = { ttlMs: 1_000, maxResponses: 3, storeArguments: true };

describe('VerdictLedger', () => {
  it('looks calls up by call_id and lists the withheld ones of a response', () => {
    const ledger = new VerdictLedger(options);
    ledger.recordResponse('r1', undefined, [call('a', 'released'), call('b', 'withheld')], 0);
    expect(ledger.call('a', 1)?.status).toBe('released');
    expect(ledger.call('a', 1)?.arguments).toBe('{"command":"ls"}');
    expect(ledger.withheldCalls('r1', 1).map((c) => c.call_id)).toEqual(['b']);
  });

  it('keeps only a hash of the arguments when told not to store them', () => {
    const ledger = new VerdictLedger({ ...options, storeArguments: false });
    ledger.recordResponse('r1', undefined, [call('a', 'released')], 0);
    const recorded = ledger.call('a', 1);
    expect(recorded?.arguments).toBeUndefined();
    expect(recorded?.arguments_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('re-recording a response replaces its calls', () => {
    const ledger = new VerdictLedger(options);
    ledger.recordResponse('r1', undefined, [call('a', 'withheld')], 0);
    ledger.recordResponse('r1', undefined, [call('a', 'withheld'), call('b', 'withheld')], 0);
    expect(ledger.withheldCalls('r1', 1).map((c) => c.call_id)).toEqual(['a', 'b']);
  });

  it('reports a chain complete only when every ancestor is recorded', () => {
    const ledger = new VerdictLedger(options);
    ledger.recordResponse('r1', undefined, [call('a', 'released')], 0);
    ledger.recordResponse('r2', 'r1', [call('b', 'released')], 0);
    expect(ledger.chainCalls('r2', 1)).toEqual({ ids: new Set(['a', 'b']), complete: true });
    ledger.recordResponse('r9', 'unknown-parent', [], 0);
    expect(ledger.chainCalls('r9', 1).complete).toBe(false);
    expect(ledger.chainCalls('missing', 1).complete).toBe(false);
    expect(ledger.chainRoot('r2', 1)).toBe('r1');
  });

  it('forgets responses past the TTL and beyond the size bound', () => {
    const ledger = new VerdictLedger(options);
    ledger.recordResponse('old', undefined, [call('a', 'withheld')], 0);
    expect(ledger.response('old', 2_000)).toBeUndefined();
    expect(ledger.call('a', 2_000)).toBeUndefined();

    for (const id of ['r1', 'r2', 'r3', 'r4']) ledger.recordResponse(id, undefined, [], 5_000);
    expect(ledger.size()).toBe(3);
    expect(ledger.response('r1', 5_000)).toBeUndefined();
    expect(ledger.response('r4', 5_000)).toBeDefined();
  });
});
