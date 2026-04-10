/**
 * Rule Matching Latency Benchmark
 *
 * Measures DetectAgent latency (threat intel + correlation path).
 * ATR engine benchmarks live in `@panguard-ai/atr`.
 */

import { bench, describe } from 'vitest';
import { setLogLevel } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import { DetectAgent } from '../src/agent/detect-agent.js';

setLogLevel('silent');

function makeEvent(): SecurityEvent {
  return {
    id: `bench-${Date.now()}`,
    timestamp: new Date(),
    source: 'network',
    severity: 'medium',
    category: 'network',
    description: 'Normal network event',
    host: 'bench-host',
    metadata: { remoteAddress: '192.168.1.1' },
  };
}

describe('DetectAgent (threat intel only)', () => {
  bench('detect single event', () => {
    const agent = new DetectAgent();
    agent.detect(makeEvent());
  });
});
