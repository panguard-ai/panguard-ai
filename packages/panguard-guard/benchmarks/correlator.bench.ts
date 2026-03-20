/**
 * Event Correlator Throughput Benchmark
 *
 * Measures how many events per second the EventCorrelator can process,
 * including pattern detection for brute force, port scan, lateral movement,
 * data exfiltration, and severity escalation.
 */

import { bench, describe, beforeEach } from 'vitest';
import { setLogLevel } from '@panguard-ai/core';
import type { CorrelationEvent } from '../src/types.js';
import { EventCorrelator } from '../src/correlation/event-correlator.js';

// Suppress all logging during benchmarks to avoid OOM from stderr writes
setLogLevel('silent');

// ---------------------------------------------------------------------------
// Synthetic correlation event factories
// ---------------------------------------------------------------------------

const SOURCE_TYPES = ['network', 'auth', 'process', 'file'];
const CATEGORIES = [
  'brute_force',
  'port_scan',
  'authentication',
  'process_creation',
  'file_write',
  'lateral_movement',
  'data_exfiltration',
];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function makeCorrelationEvent(index: number): CorrelationEvent {
  const source = SOURCE_TYPES[index % SOURCE_TYPES.length]!;
  const category = CATEGORIES[index % CATEGORIES.length]!;
  const severity = SEVERITIES[index % SEVERITIES.length]!;

  return {
    id: `corr-evt-${index}`,
    timestamp: Date.now(),
    sourceIP: `192.168.1.${index % 256}`,
    source,
    category,
    severity,
    ruleIds: [`rule-${index % 100}`],
    metadata: {
      destinationPort: 1024 + (index % 60000),
      destinationIP: `10.0.0.${index % 256}`,
      bytesOut: (index % 50) * 1024 * 1024,
      processName: `proc-${index % 30}`,
      result: index % 3 === 0 ? 'failure' : 'success',
    },
  };
}

function makeBruteForceEvent(index: number, sourceIP: string): CorrelationEvent {
  return {
    id: `bf-evt-${index}`,
    timestamp: Date.now(),
    sourceIP,
    source: 'auth',
    category: 'authentication',
    severity: 'medium',
    ruleIds: ['brute-force-rule'],
    metadata: {
      result: 'failure',
      user: `admin-${index % 5}`,
    },
  };
}

function makePortScanEvent(index: number, sourceIP: string): CorrelationEvent {
  return {
    id: `ps-evt-${index}`,
    timestamp: Date.now(),
    sourceIP,
    source: 'network',
    category: 'port_scan',
    severity: 'low',
    ruleIds: ['port-scan-rule'],
    metadata: {
      destinationPort: 1024 + index,
      destinationIP: '10.0.0.1',
    },
  };
}

function makeLateralMovementEvent(index: number, sourceIP: string): CorrelationEvent {
  return {
    id: `lm-evt-${index}`,
    timestamp: Date.now(),
    sourceIP,
    source: 'network',
    category: 'lateral_movement',
    severity: 'medium',
    ruleIds: ['lateral-move-rule'],
    metadata: {
      destinationIP: `192.168.1.${index % 256}`,
      destinationPort: 22,
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-generate event pools
// ---------------------------------------------------------------------------

const GENERIC_EVENTS: CorrelationEvent[] = [];
for (let i = 0; i < 1000; i++) {
  GENERIC_EVENTS.push(makeCorrelationEvent(i));
}

const BRUTE_FORCE_EVENTS: CorrelationEvent[] = [];
for (let i = 0; i < 100; i++) {
  BRUTE_FORCE_EVENTS.push(makeBruteForceEvent(i, '10.99.99.1'));
}

const PORT_SCAN_EVENTS: CorrelationEvent[] = [];
for (let i = 0; i < 100; i++) {
  PORT_SCAN_EVENTS.push(makePortScanEvent(i, '10.99.99.2'));
}

const LATERAL_EVENTS: CorrelationEvent[] = [];
for (let i = 0; i < 100; i++) {
  LATERAL_EVENTS.push(makeLateralMovementEvent(i, '10.99.99.3'));
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('EventCorrelator Throughput', () => {
  describe('Generic event processing', () => {
    let correlator: EventCorrelator;
    let eventIndex: number;

    beforeEach(() => {
      correlator = new EventCorrelator(5 * 60 * 1000, 10000);
      eventIndex = 0;
    });

    bench('addEvent - single generic event', () => {
      const event = {
        ...GENERIC_EVENTS[eventIndex % GENERIC_EVENTS.length]!,
        id: `ge-${Date.now()}-${eventIndex}`,
        timestamp: Date.now(),
      };
      eventIndex++;
      correlator.addEvent(event);
    });

    bench('addEvent - batch of 100 generic events', () => {
      for (let i = 0; i < 100; i++) {
        const event = {
          ...GENERIC_EVENTS[(eventIndex + i) % GENERIC_EVENTS.length]!,
          id: `gb-${Date.now()}-${eventIndex}-${i}`,
          timestamp: Date.now(),
        };
        correlator.addEvent(event);
      }
      eventIndex += 100;
    });

    bench('addEvent - batch of 500 generic events', () => {
      for (let i = 0; i < 500; i++) {
        const event = {
          ...GENERIC_EVENTS[(eventIndex + i) % GENERIC_EVENTS.length]!,
          id: `g5-${Date.now()}-${eventIndex}-${i}`,
          timestamp: Date.now(),
        };
        correlator.addEvent(event);
      }
      eventIndex += 500;
    });
  });

  describe('Brute force pattern detection', () => {
    let correlator: EventCorrelator;
    let eventIndex: number;

    beforeEach(() => {
      correlator = new EventCorrelator(5 * 60 * 1000, 10000);
      eventIndex = 0;
    });

    bench('addEvent - brute force stream (triggers detection)', () => {
      const event = {
        ...BRUTE_FORCE_EVENTS[eventIndex % BRUTE_FORCE_EVENTS.length]!,
        id: `bf-${Date.now()}-${eventIndex}`,
        timestamp: Date.now(),
      };
      eventIndex++;
      correlator.addEvent(event);
    });
  });

  describe('Port scan pattern detection', () => {
    let correlator: EventCorrelator;
    let eventIndex: number;

    beforeEach(() => {
      correlator = new EventCorrelator(5 * 60 * 1000, 10000);
      eventIndex = 0;
    });

    bench('addEvent - port scan stream (triggers detection)', () => {
      const event = {
        ...PORT_SCAN_EVENTS[eventIndex % PORT_SCAN_EVENTS.length]!,
        id: `ps-${Date.now()}-${eventIndex}`,
        timestamp: Date.now(),
      };
      eventIndex++;
      correlator.addEvent(event);
    });
  });

  describe('Lateral movement pattern detection', () => {
    let correlator: EventCorrelator;
    let eventIndex: number;

    beforeEach(() => {
      correlator = new EventCorrelator(5 * 60 * 1000, 10000);
      eventIndex = 0;
    });

    bench('addEvent - lateral movement stream (triggers detection)', () => {
      const event = {
        ...LATERAL_EVENTS[eventIndex % LATERAL_EVENTS.length]!,
        id: `lm-${Date.now()}-${eventIndex}`,
        timestamp: Date.now(),
      };
      eventIndex++;
      correlator.addEvent(event);
    });
  });

  describe('High-volume throughput (warm buffer)', () => {
    bench('process 1000 events through correlator', () => {
      const correlator = new EventCorrelator(5 * 60 * 1000, 5000);
      const now = Date.now();
      for (let i = 0; i < 1000; i++) {
        correlator.addEvent({
          ...GENERIC_EVENTS[i % GENERIC_EVENTS.length]!,
          id: `hv-${now}-${i}`,
          timestamp: now + i,
        });
      }
    });
  });
});
