import { describe, it, expect } from 'vitest';
import { InMemoryRiskStore } from '../src/risk-store.js';
import { NORMAL_RISK } from '../src/types.js';

describe('InMemoryRiskStore', () => {
  it('returns NORMAL_RISK for an unseen session', () => {
    const store = new InMemoryRiskStore();
    expect(store.get('unseen')).toBe(NORMAL_RISK);
  });

  it('stores and returns a set risk', () => {
    const store = new InMemoryRiskStore();
    store.set('s1', { level: 'high', reasons: ['ATR-1'] });
    expect(store.get('s1').level).toBe('high');
  });

  it('clears a session back to normal', () => {
    const store = new InMemoryRiskStore();
    store.set('s1', { level: 'high', reasons: [] });
    store.clear('s1');
    expect(store.get('s1').level).toBe('normal');
  });
});
