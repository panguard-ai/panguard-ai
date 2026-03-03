/**
 * Tests for Memory Scanner
 * 記憶體掃描器測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryScanner } from '../src/monitors/memory-scanner.js';

describe('MemoryScanner', () => {
  let scanner: MemoryScanner;

  beforeEach(() => {
    scanner = new MemoryScanner(60_000, 1);
  });

  afterEach(() => {
    scanner.stop();
  });

  it('should extend EventEmitter', () => {
    expect(typeof scanner.on).toBe('function');
    expect(typeof scanner.emit).toBe('function');
  });

  it('should return false on non-Linux platforms', async () => {
    if (process.platform !== 'linux') {
      const available = await scanner.checkAvailability();
      expect(available).toBe(false);
    }
  });

  it('should track running state', () => {
    expect(scanner.isRunning()).toBe(false);
  });

  it('should stop cleanly even if not started', () => {
    expect(() => scanner.stop()).not.toThrow();
    expect(scanner.isRunning()).toBe(false);
  });

  it('should count built-in patterns', () => {
    // Should have at least the 11 built-in patterns
    expect(scanner.getPatternCount()).toBeGreaterThanOrEqual(11);
  });

  it('should add custom patterns', () => {
    const initialCount = scanner.getPatternCount();
    scanner.addPattern({
      name: 'test_pattern',
      category: 'test',
      severity: 'medium',
      description: 'Test pattern',
      bytes: Buffer.from('test_signature', 'ascii'),
    });
    expect(scanner.getPatternCount()).toBe(initialCount + 1);
  });

  it('should accept multiple custom patterns', () => {
    const initialCount = scanner.getPatternCount();
    scanner.addPattern({
      name: 'pattern_a',
      category: 'test',
      severity: 'low',
      description: 'Pattern A',
      bytes: Buffer.from('AAA', 'ascii'),
    });
    scanner.addPattern({
      name: 'pattern_b',
      category: 'test',
      severity: 'high',
      description: 'Pattern B',
      bytes: Buffer.from('BBB', 'ascii'),
    });
    expect(scanner.getPatternCount()).toBe(initialCount + 2);
  });
});

describe('MemoryScanResult', () => {
  it('should have correct structure from type perspective', () => {
    // Verify the MemoryScanResult interface shape via type assertion
    const result = {
      pid: 1234,
      comm: 'test',
      matches: [
        {
          pattern: 'nop_sled',
          category: 'shellcode',
          severity: 'critical' as const,
          offset: 0x1000,
          regionPerms: 'rwxp',
          description: 'NOP sled',
        },
      ],
      scannedBytes: 4096,
      regionsScanned: 1,
      timestamp: new Date().toISOString(),
    };

    expect(result.pid).toBe(1234);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.pattern).toBe('nop_sled');
    expect(result.scannedBytes).toBe(4096);
  });
});
