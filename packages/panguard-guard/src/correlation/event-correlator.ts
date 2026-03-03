/**
 * Event Correlator - Pattern-based multi-step attack detection
 * 事件關聯器 - 基於模式的多步驟攻擊偵測
 *
 * Detects complex attack patterns by correlating security events
 * within a sliding time window. Goes beyond simple IP-based grouping
 * to identify brute force, port scanning, lateral movement,
 * data exfiltration, backdoor installation, privilege escalation,
 * and severity escalation patterns.
 *
 * @module @panguard-ai/panguard-guard/correlation/event-correlator
 */

import { createLogger } from '@panguard-ai/core';
import type {
  CorrelationEvent,
  CorrelationResult,
  CorrelationPattern,
} from '../types.js';

const logger = createLogger('panguard-guard:event-correlator');

/** Default correlation window: 5 minutes */
const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

/** Default max buffer size */
const DEFAULT_MAX_BUFFER = 1000;

/** Brute force: auth failures within this window */
const BRUTE_FORCE_WINDOW_MS = 60 * 1000;

/** Brute force: minimum auth failure count */
const BRUTE_FORCE_THRESHOLD = 5;

/** Port scan: distinct ports within this window */
const PORT_SCAN_WINDOW_MS = 60 * 1000;

/** Port scan: minimum distinct ports */
const PORT_SCAN_THRESHOLD = 10;

/** Lateral movement: distinct internal IPs within window */
const LATERAL_MOVEMENT_THRESHOLD = 3;

/** Data exfiltration: bytes threshold (10MB) */
const EXFIL_BYTES_THRESHOLD = 10 * 1024 * 1024;

/** Severity escalation: events from same source to trigger */
const SEVERITY_ESCALATION_THRESHOLD = 3;

/** RFC 1918 private IP ranges */
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^fd/,
  /^fe80:/,
];

/**
 * Check if an IP address is internal (RFC 1918 or loopback)
 */
function isInternalIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Extract a numeric value from metadata by trying multiple field names
 */
function extractNumber(
  metadata: Record<string, unknown>,
  ...fields: string[]
): number | undefined {
  for (const field of fields) {
    const val = metadata[field];
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Number(val);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
}

/**
 * Extract a string value from metadata by trying multiple field names
 */
function extractString(
  metadata: Record<string, unknown>,
  ...fields: string[]
): string | undefined {
  for (const field of fields) {
    const val = metadata[field];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return undefined;
}

/**
 * Extract destination port from event metadata
 */
function extractDestPort(metadata: Record<string, unknown>): number | undefined {
  return extractNumber(metadata, 'destinationPort', 'dst_port', 'dstPort', 'remotePort', 'port');
}

/**
 * Extract destination IP from event metadata
 */
function extractDestIP(metadata: Record<string, unknown>): string | undefined {
  return extractString(
    metadata,
    'destinationIP',
    'dst_ip',
    'dstIP',
    'remoteAddress',
    'peerAddress'
  );
}

/**
 * Extract bytes transferred from event metadata
 */
function extractBytes(metadata: Record<string, unknown>): number | undefined {
  return extractNumber(
    metadata,
    'bytesOut',
    'bytes_out',
    'bytesSent',
    'bytes_sent',
    'transferSize',
    'bytes'
  );
}

/**
 * EventCorrelator performs pattern-based multi-step attack detection
 * by analyzing events within a sliding time window.
 *
 * Supported attack patterns:
 * - Brute Force (MITRE T1110)
 * - Port Scan (MITRE T1046)
 * - Lateral Movement (MITRE T1021)
 * - Data Exfiltration (MITRE T1041)
 * - Backdoor Installation
 * - Privilege Escalation (MITRE T1548)
 * - Severity Escalation (compound low/medium events)
 */
export class EventCorrelator {
  private readonly windowMs: number;
  private readonly maxBuffer: number;
  private readonly eventBuffer: CorrelationEvent[];

  constructor(windowMs?: number, maxBuffer?: number) {
    this.windowMs = windowMs ?? DEFAULT_WINDOW_MS;
    this.maxBuffer = maxBuffer ?? DEFAULT_MAX_BUFFER;
    this.eventBuffer = [];
  }

  /**
   * Add an event to the correlation buffer and run all pattern detectors.
   * Returns a CorrelationResult with any matched patterns.
   */
  addEvent(event: CorrelationEvent): CorrelationResult {
    const now = event.timestamp;

    // Add to buffer
    this.eventBuffer.push(event);

    // Evict events outside the correlation window
    this.pruneBuffer(now);

    // Run all pattern detectors
    const patterns: CorrelationPattern[] = [
      ...this.detectBruteForce(event, now),
      ...this.detectPortScan(event, now),
      ...this.detectLateralMovement(event, now),
      ...this.detectDataExfiltration(event),
      ...this.detectBackdoorInstall(event, now),
      ...this.detectPrivilegeEscalation(event, now),
      ...this.detectSeverityEscalation(event, now),
    ];

    if (patterns.length > 0) {
      logger.warn(
        `Correlation: ${patterns.length} pattern(s) matched for event ${event.id}: ` +
          patterns.map((p) => p.type).join(', ')
      );
    }

    return {
      matched: patterns.length > 0,
      patterns,
    };
  }

  /** Get current buffer size for monitoring */
  getBufferSize(): number {
    return this.eventBuffer.length;
  }

  /** Clear the entire event buffer */
  reset(): void {
    this.eventBuffer.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Buffer management
  // ---------------------------------------------------------------------------

  private pruneBuffer(now: number): void {
    // Remove events outside the time window
    while (
      this.eventBuffer.length > 0 &&
      now - this.eventBuffer[0]!.timestamp > this.windowMs
    ) {
      this.eventBuffer.shift();
    }

    // Trim if over capacity
    while (this.eventBuffer.length > this.maxBuffer) {
      this.eventBuffer.shift();
    }
  }

  // ---------------------------------------------------------------------------
  // Pattern Detectors
  // ---------------------------------------------------------------------------

  /**
   * Brute Force (T1110): Same source IP, 5+ auth failure events within 60s
   */
  private detectBruteForce(
    event: CorrelationEvent,
    now: number
  ): CorrelationPattern[] {
    // Only trigger on auth events
    if (event.source !== 'auth' && event.category !== 'authentication') {
      return [];
    }

    if (!event.sourceIP) return [];

    // Check for auth failure indication in metadata
    const isAuthFailure =
      event.metadata['result'] === 'failure' ||
      event.metadata['result'] === 'failed' ||
      event.metadata['outcome'] === 'failure' ||
      event.metadata['status'] === 'failed' ||
      event.category === 'brute_force' ||
      event.ruleIds.some((id) => id.toLowerCase().includes('brute'));

    // Count auth failures from same IP within brute force window
    const cutoff = now - BRUTE_FORCE_WINDOW_MS;
    const authFailures = this.eventBuffer.filter((e) => {
      if (e.sourceIP !== event.sourceIP) return false;
      if (e.timestamp < cutoff) return false;
      if (e.source !== 'auth' && e.category !== 'authentication') return false;

      const isFail =
        e.metadata['result'] === 'failure' ||
        e.metadata['result'] === 'failed' ||
        e.metadata['outcome'] === 'failure' ||
        e.metadata['status'] === 'failed' ||
        e.category === 'brute_force' ||
        e.ruleIds.some((id) => id.toLowerCase().includes('brute'));

      return isFail || isAuthFailure;
    });

    if (authFailures.length >= BRUTE_FORCE_THRESHOLD) {
      const confidence = Math.min(100, 60 + (authFailures.length - BRUTE_FORCE_THRESHOLD) * 8);
      return [
        {
          type: 'brute_force',
          confidence,
          sourceIP: event.sourceIP,
          eventCount: authFailures.length,
          eventIds: authFailures.map((e) => e.id),
          description:
            `Brute force detected: ${authFailures.length} authentication failures ` +
            `from ${event.sourceIP} within ${BRUTE_FORCE_WINDOW_MS / 1000}s`,
          mitreTechnique: 'T1110',
          suggestedSeverity: authFailures.length >= 10 ? 'critical' : 'high',
        },
      ];
    }

    return [];
  }

  /**
   * Port Scan (T1046): Same source IP, 10+ distinct destination ports within 60s
   */
  private detectPortScan(
    event: CorrelationEvent,
    now: number
  ): CorrelationPattern[] {
    if (event.source !== 'network' && event.source !== 'suricata') return [];
    if (!event.sourceIP) return [];

    const cutoff = now - PORT_SCAN_WINDOW_MS;

    // Collect all network events from same source IP within the window
    const networkEvents = this.eventBuffer.filter(
      (e) =>
        e.sourceIP === event.sourceIP &&
        e.timestamp >= cutoff &&
        (e.source === 'network' || e.source === 'suricata')
    );

    // Collect distinct destination ports
    const distinctPorts = new Set<number>();
    for (const e of networkEvents) {
      const port = extractDestPort(e.metadata);
      if (port !== undefined) {
        distinctPorts.add(port);
      }
    }

    if (distinctPorts.size >= PORT_SCAN_THRESHOLD) {
      const confidence = Math.min(100, 65 + (distinctPorts.size - PORT_SCAN_THRESHOLD) * 3);
      return [
        {
          type: 'port_scan',
          confidence,
          sourceIP: event.sourceIP,
          eventCount: networkEvents.length,
          eventIds: networkEvents.map((e) => e.id),
          description:
            `Port scan detected: ${distinctPorts.size} distinct destination ports ` +
            `probed from ${event.sourceIP} within ${PORT_SCAN_WINDOW_MS / 1000}s`,
          mitreTechnique: 'T1046',
          suggestedSeverity: distinctPorts.size >= 50 ? 'high' : 'medium',
        },
      ];
    }

    return [];
  }

  /**
   * Lateral Movement (T1021): Network connections to 3+ internal IPs from same source within 5min
   */
  private detectLateralMovement(
    event: CorrelationEvent,
    now: number
  ): CorrelationPattern[] {
    if (event.source !== 'network' && event.source !== 'suricata') return [];
    if (!event.sourceIP) return [];

    const cutoff = now - this.windowMs;

    // Collect network events from same source IP
    const networkEvents = this.eventBuffer.filter(
      (e) =>
        e.sourceIP === event.sourceIP &&
        e.timestamp >= cutoff &&
        (e.source === 'network' || e.source === 'suricata')
    );

    // Collect distinct internal destination IPs
    const internalDestIPs = new Set<string>();
    for (const e of networkEvents) {
      const destIP = extractDestIP(e.metadata);
      if (destIP && isInternalIP(destIP)) {
        internalDestIPs.add(destIP);
      }
    }

    if (internalDestIPs.size >= LATERAL_MOVEMENT_THRESHOLD) {
      const confidence = Math.min(100, 55 + (internalDestIPs.size - LATERAL_MOVEMENT_THRESHOLD) * 10);
      return [
        {
          type: 'lateral_movement',
          confidence,
          sourceIP: event.sourceIP,
          eventCount: networkEvents.length,
          eventIds: networkEvents.map((e) => e.id),
          description:
            `Lateral movement detected: connections to ${internalDestIPs.size} internal IPs ` +
            `(${[...internalDestIPs].join(', ')}) from ${event.sourceIP} within ` +
            `${this.windowMs / 1000}s`,
          mitreTechnique: 'T1021',
          suggestedSeverity: internalDestIPs.size >= 5 ? 'critical' : 'high',
        },
      ];
    }

    return [];
  }

  /**
   * Data Exfiltration (T1041): Large outbound transfers to external IP
   */
  private detectDataExfiltration(event: CorrelationEvent): CorrelationPattern[] {
    if (event.source !== 'network' && event.source !== 'suricata') return [];

    const destIP = extractDestIP(event.metadata);
    if (!destIP) return [];

    // Only flag outbound to external IPs
    if (isInternalIP(destIP)) return [];

    const bytes = extractBytes(event.metadata);
    if (bytes === undefined || bytes < EXFIL_BYTES_THRESHOLD) return [];

    const mbTransferred = (bytes / (1024 * 1024)).toFixed(1);
    const confidence = Math.min(100, 50 + Math.floor(bytes / EXFIL_BYTES_THRESHOLD) * 15);

    return [
      {
        type: 'data_exfiltration',
        confidence,
        sourceIP: event.sourceIP,
        eventCount: 1,
        eventIds: [event.id],
        description:
          `Data exfiltration suspected: ${mbTransferred}MB transferred to external IP ` +
          `${destIP}${event.sourceIP ? ` from ${event.sourceIP}` : ''}`,
        mitreTechnique: 'T1041',
        suggestedSeverity: bytes >= EXFIL_BYTES_THRESHOLD * 5 ? 'critical' : 'high',
      },
    ];
  }

  /**
   * Backdoor Installation: file write + process creation + outbound network connection
   * all within the correlation window
   */
  private detectBackdoorInstall(
    event: CorrelationEvent,
    now: number
  ): CorrelationPattern[] {
    // Only check when we see a network outbound event (the last step in the chain)
    if (event.source !== 'network' && event.source !== 'suricata') return [];

    const cutoff = now - this.windowMs;

    // Look for file write events in the window
    const fileWriteEvents = this.eventBuffer.filter(
      (e) =>
        e.timestamp >= cutoff &&
        e.source === 'file' &&
        (e.category === 'file_write' ||
          e.category === 'file_creation' ||
          e.metadata['action'] === 'write' ||
          e.metadata['action'] === 'create')
    );

    if (fileWriteEvents.length === 0) return [];

    // Look for process creation events in the window
    const processEvents = this.eventBuffer.filter(
      (e) =>
        e.timestamp >= cutoff &&
        e.source === 'process' &&
        (e.category === 'process_creation' ||
          e.category === 'process_start' ||
          e.metadata['action'] === 'exec' ||
          e.metadata['action'] === 'execve' ||
          e.metadata['action'] === 'create')
    );

    if (processEvents.length === 0) return [];

    // We have all three: file write, process creation, and network connection
    // Check if the same host is involved (optional correlation by sourceIP)
    const relevantFileEvents = event.sourceIP
      ? fileWriteEvents.filter(
          (e) => !e.sourceIP || e.sourceIP === event.sourceIP
        )
      : fileWriteEvents;

    const relevantProcessEvents = event.sourceIP
      ? processEvents.filter(
          (e) => !e.sourceIP || e.sourceIP === event.sourceIP
        )
      : processEvents;

    if (relevantFileEvents.length === 0 || relevantProcessEvents.length === 0) {
      return [];
    }

    const allEvents = [...relevantFileEvents, ...relevantProcessEvents, event];
    const confidence = Math.min(
      100,
      55 + relevantFileEvents.length * 5 + relevantProcessEvents.length * 5
    );

    return [
      {
        type: 'backdoor_install',
        confidence,
        sourceIP: event.sourceIP,
        eventCount: allEvents.length,
        eventIds: allEvents.map((e) => e.id),
        description:
          `Backdoor installation suspected: file write (${relevantFileEvents.length}), ` +
          `process creation (${relevantProcessEvents.length}), and outbound network ` +
          `connection detected within ${this.windowMs / 1000}s window`,
        mitreTechnique: 'T1059',
        suggestedSeverity: 'critical',
      },
    ];
  }

  /**
   * Privilege Escalation (T1548): setuid/setgid events or sudo usage patterns
   */
  private detectPrivilegeEscalation(
    event: CorrelationEvent,
    now: number
  ): CorrelationPattern[] {
    const isPrivEscEvent = this.isPrivilegeEscalationEvent(event);
    if (!isPrivEscEvent) return [];

    const cutoff = now - this.windowMs;

    // Count privilege escalation events in the window (optionally from same source)
    const privEscEvents = this.eventBuffer.filter(
      (e) =>
        e.timestamp >= cutoff &&
        this.isPrivilegeEscalationEvent(e) &&
        (!event.sourceIP || !e.sourceIP || e.sourceIP === event.sourceIP)
    );

    // A single priv-esc event is notable; multiple are higher confidence
    if (privEscEvents.length === 0) return [];

    const confidence = Math.min(100, 50 + privEscEvents.length * 15);

    return [
      {
        type: 'privilege_escalation',
        confidence,
        sourceIP: event.sourceIP,
        eventCount: privEscEvents.length,
        eventIds: privEscEvents.map((e) => e.id),
        description:
          `Privilege escalation detected: ${privEscEvents.length} privilege escalation ` +
          `event(s) within ${this.windowMs / 1000}s` +
          (event.sourceIP ? ` from ${event.sourceIP}` : ''),
        mitreTechnique: 'T1548',
        suggestedSeverity: privEscEvents.length >= 3 ? 'critical' : 'high',
      },
    ];
  }

  /**
   * Check if an event represents a privilege escalation attempt
   */
  private isPrivilegeEscalationEvent(event: CorrelationEvent): boolean {
    // Category-based detection
    if (
      event.category === 'privilege_escalation' ||
      event.category === 'setuid' ||
      event.category === 'setgid'
    ) {
      return true;
    }

    // Rule-based detection
    if (
      event.ruleIds.some(
        (id) =>
          id.toLowerCase().includes('priv_esc') ||
          id.toLowerCase().includes('privilege') ||
          id.toLowerCase().includes('setuid') ||
          id.toLowerCase().includes('setgid')
      )
    ) {
      return true;
    }

    // Metadata-based detection (sudo, su, setuid, setgid, chmod +s)
    const processName = extractString(
      event.metadata,
      'processName',
      'process_name',
      'comm',
      'exe'
    );
    if (processName === 'sudo' || processName === 'su' || processName === 'pkexec') {
      return true;
    }

    const action = extractString(event.metadata, 'action', 'syscall');
    if (action === 'setuid' || action === 'setgid' || action === 'setreuid' || action === 'setregid') {
      return true;
    }

    const command = extractString(event.metadata, 'command', 'cmdline', 'commandLine');
    if (command && /chmod\s+[+u]s|chown\s+root/.test(command)) {
      return true;
    }

    return false;
  }

  /**
   * Severity Escalation: 3+ low-severity events from same source -> medium;
   * 3+ medium -> high
   */
  private detectSeverityEscalation(
    event: CorrelationEvent,
    now: number
  ): CorrelationPattern[] {
    if (!event.sourceIP) return [];

    const cutoff = now - this.windowMs;
    const sourceEvents = this.eventBuffer.filter(
      (e) => e.sourceIP === event.sourceIP && e.timestamp >= cutoff
    );

    const patterns: CorrelationPattern[] = [];

    // Count low-severity events
    const lowEvents = sourceEvents.filter((e) => e.severity === 'low');
    if (lowEvents.length >= SEVERITY_ESCALATION_THRESHOLD) {
      patterns.push({
        type: 'attack_chain',
        confidence: Math.min(100, 40 + lowEvents.length * 10),
        sourceIP: event.sourceIP,
        eventCount: lowEvents.length,
        eventIds: lowEvents.map((e) => e.id),
        description:
          `Severity escalation: ${lowEvents.length} low-severity events from ` +
          `${event.sourceIP} within ${this.windowMs / 1000}s suggest coordinated activity`,
        suggestedSeverity: 'medium',
      });
    }

    // Count medium-severity events
    const mediumEvents = sourceEvents.filter((e) => e.severity === 'medium');
    if (mediumEvents.length >= SEVERITY_ESCALATION_THRESHOLD) {
      patterns.push({
        type: 'attack_chain',
        confidence: Math.min(100, 50 + mediumEvents.length * 10),
        sourceIP: event.sourceIP,
        eventCount: mediumEvents.length,
        eventIds: mediumEvents.map((e) => e.id),
        description:
          `Severity escalation: ${mediumEvents.length} medium-severity events from ` +
          `${event.sourceIP} within ${this.windowMs / 1000}s suggest coordinated attack`,
        suggestedSeverity: 'high',
      });
    }

    return patterns;
  }
}
