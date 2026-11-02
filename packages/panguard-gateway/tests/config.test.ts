import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('resolveConfig', () => {
  it('refuses an evaluation deadline a Node timer cannot hold', () => {
    const upstream = 'http://127.0.0.1:9';
    expect(() => resolveConfig({ upstream, evaluation: { timeoutMs: 2_147_483_648 } })).toThrow(
      /evaluation\.timeoutMs/
    );
    const longest = resolveConfig({ upstream, evaluation: { timeoutMs: 2_147_483_647 } });
    expect(longest.evaluation.timeoutMs).toBe(2_147_483_647);
  });
});
