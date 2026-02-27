/**
 * FalcoMonitor unit tests
 * FalcoMonitor 單元測試
 */

import { describe, it, expect } from 'vitest';
import { parseFalcoEvent } from '../src/monitors/falco-monitor.js';
import type { FalcoAlert } from '../src/monitors/falco-monitor.js';

describe('parseFalcoEvent', () => {
  it('should parse a CRITICAL reverse shell alert', () => {
    const raw: FalcoAlert = {
      priority: 'Critical',
      rule: 'Reverse Shell via Network Socket',
      time: '2026-02-28T12:00:00.000Z',
      output: 'Reverse shell detected (user=attacker command=bash -i connection=10.0.0.1:4444)',
      output_fields: {
        'proc.pid': 12345,
        'proc.name': 'bash',
        'user.name': 'attacker',
        'fd.sip': '10.0.0.1',
        'fd.name': '10.0.0.1:4444',
      },
      tags: ['shell', 'network', 'mitre_execution'],
    };

    const event = parseFalcoEvent(raw);

    expect(event.source).toBe('falco');
    expect(event.severity).toBe('critical');
    expect(event.category).toBe('reverse_shell');
    expect(event.description).toContain('Reverse shell detected');
    expect(event.metadata).toBeDefined();
    expect(event.metadata!['pid']).toBe(12345);
    expect(event.metadata!['processName']).toBe('bash');
    expect(event.metadata!['userName']).toBe('attacker');
    expect(event.metadata!['sourceIP']).toBe('10.0.0.1');
    expect(event.id).toMatch(/^falco-/);
  });

  it('should parse a WARNING level alert', () => {
    const raw: FalcoAlert = {
      priority: 'Warning',
      rule: 'Suspicious Binary in Container',
      time: '2026-02-28T12:01:00.000Z',
      output: 'Suspicious binary executed (process=nmap container=web-app)',
      output_fields: {
        'proc.name': 'nmap',
        'container.name': 'web-app',
        'container.id': 'abc123',
      },
      tags: ['process', 'suspicious'],
    };

    const event = parseFalcoEvent(raw);

    expect(event.severity).toBe('medium');
    expect(event.category).toBe('process_execution');
    expect(event.metadata!['containerName']).toBe('web-app');
    expect(event.metadata!['containerId']).toBe('abc123');
  });

  it('should parse an ERROR level credential access alert', () => {
    const raw: FalcoAlert = {
      priority: 'Error',
      rule: 'SSH Key File Access',
      time: '2026-02-28T12:02:00.000Z',
      output: 'SSH key accessed by python3',
      output_fields: {
        'proc.name': 'python3',
        'user.name': 'www-data',
        'fd.name': '/home/deploy/.ssh/id_rsa',
      },
      tags: ['credential', 'ssh'],
    };

    const event = parseFalcoEvent(raw);

    expect(event.severity).toBe('high');
    expect(event.category).toBe('credential_access');
    expect(event.metadata!['filePath']).toBe('/home/deploy/.ssh/id_rsa');
  });

  it('should parse a NOTICE level alert as low severity', () => {
    const raw: FalcoAlert = {
      priority: 'Notice',
      rule: 'File Open for Reading',
      time: '2026-02-28T12:03:00.000Z',
      output: 'File opened for reading',
      tags: ['file', 'read'],
    };

    const event = parseFalcoEvent(raw);

    expect(event.severity).toBe('low');
    expect(event.category).toBe('file_access');
  });

  it('should parse an INFO level alert', () => {
    const raw: FalcoAlert = {
      priority: 'Informational',
      rule: 'Process Started',
      time: '2026-02-28T12:04:00.000Z',
      output: 'New process started',
      tags: [],
    };

    const event = parseFalcoEvent(raw);

    expect(event.severity).toBe('info');
    expect(event.category).toBe('unknown');
  });

  it('should handle missing output_fields gracefully', () => {
    const raw: FalcoAlert = {
      priority: 'Critical',
      rule: 'Container Escape',
      time: '2026-02-28T12:05:00.000Z',
      output: 'Container escape attempt detected',
      tags: ['container', 'escape'],
    };

    const event = parseFalcoEvent(raw);

    expect(event.source).toBe('falco');
    expect(event.severity).toBe('critical');
    expect(event.category).toBe('container_escape');
    expect(event.metadata!['pid']).toBeUndefined();
    expect(event.metadata!['processName']).toBeUndefined();
  });

  it('should handle cryptomining category', () => {
    const raw: FalcoAlert = {
      priority: 'Critical',
      rule: 'Cryptomining Activity',
      time: '2026-02-28T12:06:00.000Z',
      output: 'xmrig detected on port 3333',
      output_fields: {
        'proc.name': 'xmrig',
        'fd.sport': 3333,
      },
      tags: ['crypto', 'mining'],
    };

    const event = parseFalcoEvent(raw);

    expect(event.category).toBe('cryptomining');
  });

  it('should generate unique event IDs', () => {
    const raw: FalcoAlert = {
      priority: 'Warning',
      rule: 'Test Rule',
      time: '2026-02-28T12:07:00.000Z',
      output: 'Test event',
    };

    const event1 = parseFalcoEvent(raw);
    const event2 = parseFalcoEvent(raw);

    expect(event1.id).not.toBe(event2.id);
  });

  it('should use output as description, fallback to rule name', () => {
    const withOutput: FalcoAlert = {
      priority: 'Warning',
      rule: 'My Rule',
      time: '2026-02-28T12:08:00.000Z',
      output: 'Custom output message',
    };

    const withoutOutput: FalcoAlert = {
      priority: 'Warning',
      rule: 'My Rule',
      time: '2026-02-28T12:09:00.000Z',
      output: '',
    };

    expect(parseFalcoEvent(withOutput).description).toBe('Custom output message');
    expect(parseFalcoEvent(withoutOutput).description).toContain('My Rule');
  });
});
