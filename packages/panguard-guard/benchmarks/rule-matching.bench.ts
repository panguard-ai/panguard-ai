/**
 * Rule Matching Latency Benchmark
 *
 * Measures how long DetectAgent.detect() takes per event with varying rule counts.
 * Target: <5ms per event for 3000+ Sigma rules.
 */

import { bench, describe, beforeEach } from 'vitest';
import { RuleEngine, setLogLevel } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import type { SigmaRule } from '@panguard-ai/core';
import { DetectAgent } from '../src/agent/detect-agent.js';

// Suppress all logging during benchmarks to avoid OOM from stderr writes
setLogLevel('silent');

// ---------------------------------------------------------------------------
// Synthetic data factories
// ---------------------------------------------------------------------------

const EVENT_SOURCES: SecurityEvent['source'][] = [
  'network',
  'process',
  'file',
  'syslog',
];

const CATEGORIES = [
  'brute_force',
  'port_scan',
  'lateral_movement',
  'process_creation',
  'file_write',
  'authentication',
  'privilege_escalation',
  'data_exfiltration',
  'malware_execution',
  'dns_tunneling',
];

const SEVERITIES: SecurityEvent['severity'][] = ['info', 'low', 'medium', 'high', 'critical'];

function makeSyntheticEvent(index: number): SecurityEvent {
  return {
    id: `evt-bench-${index}`,
    timestamp: new Date(),
    source: EVENT_SOURCES[index % EVENT_SOURCES.length]!,
    severity: SEVERITIES[index % SEVERITIES.length]!,
    category: CATEGORIES[index % CATEGORIES.length]!,
    description: `Benchmark event ${index}`,
    raw: { index },
    host: `bench-host-${index % 10}`,
    metadata: {
      sourceIP: `10.0.${Math.floor(index / 256) % 256}.${index % 256}`,
      remoteAddress: `10.0.${Math.floor(index / 256) % 256}.${index % 256}`,
      processName: `proc-${index % 50}`,
      user: `user-${index % 20}`,
      destinationPort: 1024 + (index % 60000),
    },
  };
}

function makeSyntheticRule(index: number): SigmaRule {
  const category = CATEGORIES[index % CATEGORIES.length]!;
  const severity = SEVERITIES[index % SEVERITIES.length]!;

  return {
    id: `bench-rule-${index}`,
    title: `Benchmark Rule ${index} - ${category}`,
    status: 'stable' as const,
    description: `Synthetic rule ${index} for benchmark testing`,
    level: severity,
    logsource: { category },
    detection: {
      selection: {
        category,
        'sourceIP|contains': `${index % 256}`,
      },
      condition: 'selection',
    },
    tags: [`attack.t${1000 + index}`],
  };
}

function generateRules(count: number): SigmaRule[] {
  const rules: SigmaRule[] = [];
  for (let i = 0; i < count; i++) {
    rules.push(makeSyntheticRule(i));
  }
  return rules;
}

// ---------------------------------------------------------------------------
// Pre-generate test data to exclude generation time from benchmarks
// ---------------------------------------------------------------------------

const EVENTS_POOL: SecurityEvent[] = [];
for (let i = 0; i < 100; i++) {
  EVENTS_POOL.push(makeSyntheticEvent(i));
}

const RULE_SETS = {
  100: generateRules(100),
  500: generateRules(500),
  1000: generateRules(1000),
  3000: generateRules(3000),
};

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('Rule Matching Latency', () => {
  let eventIndex: number;

  beforeEach(() => {
    eventIndex = 0;
  });

  function nextEvent(): SecurityEvent {
    const event = EVENTS_POOL[eventIndex % EVENTS_POOL.length]!;
    eventIndex++;
    // Return a new event with unique ID to avoid dedup
    return { ...event, id: `evt-bench-${Date.now()}-${eventIndex}` };
  }

  describe('100 rules', () => {
    const ruleEngine = new RuleEngine({ customRules: RULE_SETS[100] });
    const agent = new DetectAgent(ruleEngine);

    bench('detect single event against 100 rules', () => {
      agent.detect(nextEvent());
    });
  });

  describe('500 rules', () => {
    const ruleEngine = new RuleEngine({ customRules: RULE_SETS[500] });
    const agent = new DetectAgent(ruleEngine);

    bench('detect single event against 500 rules', () => {
      agent.detect(nextEvent());
    });
  });

  describe('1000 rules', () => {
    const ruleEngine = new RuleEngine({ customRules: RULE_SETS[1000] });
    const agent = new DetectAgent(ruleEngine);

    bench('detect single event against 1000 rules', () => {
      agent.detect(nextEvent());
    });
  });

  describe('3000 rules', () => {
    const ruleEngine = new RuleEngine({ customRules: RULE_SETS[3000] });
    const agent = new DetectAgent(ruleEngine);

    bench('detect single event against 3000 rules', () => {
      agent.detect(nextEvent());
    });
  });

  describe('Batch processing (3000 rules)', () => {
    const ruleEngine = new RuleEngine({ customRules: RULE_SETS[3000] });
    const agent = new DetectAgent(ruleEngine);

    bench('detect batch of 10 events against 3000 rules', () => {
      for (let i = 0; i < 10; i++) {
        agent.detect(nextEvent());
      }
    });

    bench('detect batch of 50 events against 3000 rules', () => {
      for (let i = 0; i < 50; i++) {
        agent.detect(nextEvent());
      }
    });
  });
});
