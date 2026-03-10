/**
 * Skill Behavioral Fingerprint
 * Skill 行為指紋追蹤器
 *
 * Tracks what each skill "normally does" across invocations, then detects
 * behavioral drift when a previously-trusted skill starts acting differently.
 *
 * Solves the "installed then turns malicious" scenario:
 * - First N invocations: build fingerprint (what APIs, what patterns, what scope)
 * - After fingerprint stabilizes: flag any deviation as anomaly
 *
 * 追蹤每個 skill 的「正常行為」，然後在行為偏移時偵測：
 * - 前 N 次呼叫：建立指紋
 * - 指紋穩定後：任何偏離都標記為異常
 *
 * @module agent-threat-rules/skill-fingerprint
 */

import { createHash } from 'node:crypto';
import type { AgentEvent } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Behavioral capabilities observed for a skill */
interface SkillCapabilities {
  /** Seen filesystem operations (read/write/delete) */
  readonly filesystemOps: ReadonlySet<string>;
  /** Seen network destinations (hostnames) */
  readonly networkTargets: ReadonlySet<string>;
  /** Seen environment variable accesses */
  readonly envAccesses: ReadonlySet<string>;
  /** Seen child process executions */
  readonly processExecs: ReadonlySet<string>;
  /** Seen output patterns (categories: data, error, redirect, exfiltration) */
  readonly outputPatterns: ReadonlySet<string>;
}

/** Immutable fingerprint snapshot */
export interface SkillFingerprint {
  readonly skillName: string;
  readonly invocationCount: number;
  readonly firstSeen: number;
  readonly lastSeen: number;
  readonly isStable: boolean;
  readonly capabilities: SkillCapabilities;
  /** Hash of capabilities for quick comparison */
  readonly capabilityHash: string;
}

/** Anomaly when behavior deviates from fingerprint */
export interface BehaviorAnomaly {
  readonly skillName: string;
  readonly anomalyType:
    | 'new_filesystem_op'
    | 'new_network_target'
    | 'new_env_access'
    | 'new_process_exec'
    | 'new_output_pattern'
    | 'capability_expansion';
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly newValue: string;
  readonly timestamp: number;
}

/** Internal mutable state for building fingerprints */
interface MutableFingerprint {
  skillName: string;
  invocationCount: number;
  firstSeen: number;
  lastSeen: number;
  filesystemOps: Set<string>;
  networkTargets: Set<string>;
  envAccesses: Set<string>;
  processExecs: Set<string>;
  outputPatterns: Set<string>;
  /** Capability hash at the point fingerprint was marked stable */
  stableHash: string | null;
  /** Number of consecutive invocations with no new capabilities */
  stableStreak: number;
}

// ---------------------------------------------------------------------------
// Pattern detectors (regex-based, no LLM needed)
// ---------------------------------------------------------------------------

const FS_WRITE_PATTERN = /(?:write(?:File)?|appendFile|fs\.write|truncate|mkdir|rmdir|unlink|rm\s+-)/i;
const FS_READ_PATTERN = /(?:read(?:File)?|readdir|stat|access|exists|glob|find\s)/i;
const FS_DELETE_PATTERN = /(?:unlink|rm\s+-rf|delete(?:File)?|removeDir|rmdir)/i;

const NETWORK_PATTERN = /(?:https?:\/\/|fetch|curl|wget|axios|http\.request|net\.connect|socket)[\s('"]*([a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,}))/i;

const ENV_PATTERN = /(?:process\.env|os\.environ|getenv|System\.getenv)\[?['"(]?([A-Z_][A-Z0-9_]*)/i;
const ENV_INLINE_PATTERN = /\$\{?([A-Z_][A-Z0-9_]{2,})\}?/g;

const EXEC_PATTERN = /(?:child_process|spawn|exec(?:File)?|system\(|popen|subprocess|shell_exec|os\.system)\s*\(\s*['"(]?([^\s'")\]]{1,80})/i;

const EXFIL_PATTERN = /(?:base64|btoa|encode|compress|deflate|gzip).*(?:http|fetch|curl|send|post|upload)/i;
const REDIRECT_PATTERN = /(?:redirect|forward|proxy|tunnel)\s+(?:to\s+)?(?:https?:\/\/)/i;

/** Classify a text content into behavioral capabilities */
function extractCapabilities(text: string): {
  filesystemOps: string[];
  networkTargets: string[];
  envAccesses: string[];
  processExecs: string[];
  outputPatterns: string[];
} {
  const result = {
    filesystemOps: [] as string[],
    networkTargets: [] as string[],
    envAccesses: [] as string[],
    processExecs: [] as string[],
    outputPatterns: [] as string[],
  };

  if (!text || text.length === 0) return result;

  // Limit analysis to first 10KB to prevent ReDoS
  const safeText = text.slice(0, 10_240);

  // Filesystem
  if (FS_WRITE_PATTERN.test(safeText)) result.filesystemOps.push('write');
  if (FS_READ_PATTERN.test(safeText)) result.filesystemOps.push('read');
  if (FS_DELETE_PATTERN.test(safeText)) result.filesystemOps.push('delete');

  // Network targets
  const netMatch = safeText.match(NETWORK_PATTERN);
  if (netMatch?.[1]) result.networkTargets.push(netMatch[1]);

  // Environment variable accesses
  const envMatch = safeText.match(ENV_PATTERN);
  if (envMatch?.[1]) result.envAccesses.push(envMatch[1]);
  // Also check inline env vars like $HOME, ${API_KEY}
  for (const m of safeText.matchAll(ENV_INLINE_PATTERN)) {
    if (m[1] && !result.envAccesses.includes(m[1])) {
      result.envAccesses.push(m[1]);
    }
  }

  // Process executions
  const execMatch = safeText.match(EXEC_PATTERN);
  if (execMatch?.[1]) result.processExecs.push(execMatch[1]);

  // Output patterns
  if (EXFIL_PATTERN.test(safeText)) result.outputPatterns.push('exfiltration');
  if (REDIRECT_PATTERN.test(safeText)) result.outputPatterns.push('redirect');

  return result;
}

// ---------------------------------------------------------------------------
// Fingerprint Store
// ---------------------------------------------------------------------------

/** Default invocations needed before fingerprint is considered stable */
const DEFAULT_STABILITY_THRESHOLD = 10;

/** Consecutive invocations with no new capabilities to mark stable */
const DEFAULT_STABLE_STREAK = 5;

/** Maximum number of skills to track */
const MAX_SKILLS = 5_000;

export interface SkillFingerprintConfig {
  /** Minimum invocations before fingerprint can stabilize (default: 10) */
  stabilityThreshold?: number;
  /** Consecutive clean invocations to mark stable (default: 5) */
  stableStreak?: number;
}

export class SkillFingerprintStore {
  private readonly fingerprints = new Map<string, MutableFingerprint>();
  private readonly stabilityThreshold: number;
  private readonly stableStreak: number;

  constructor(config?: SkillFingerprintConfig) {
    this.stabilityThreshold = config?.stabilityThreshold ?? DEFAULT_STABILITY_THRESHOLD;
    this.stableStreak = config?.stableStreak ?? DEFAULT_STABLE_STREAK;
  }

  /**
   * Record a skill invocation and detect behavioral anomalies.
   * Returns anomalies if the fingerprint was stable and new capabilities appeared.
   *
   * 記錄 skill 呼叫並偵測行為異常。
   * 如果指紋已穩定且出現新能力，回傳異常列表。
   */
  recordInvocation(
    skillName: string,
    event: AgentEvent
  ): readonly BehaviorAnomaly[] {
    const now = Date.now();
    const fp = this.getOrCreate(skillName, now);
    fp.invocationCount++;
    fp.lastSeen = now;

    // Extract capabilities from event content + fields
    const content = [
      event.content ?? '',
      event.fields?.['tool_args'] ?? '',
      event.fields?.['tool_response'] ?? '',
    ].join('\n');

    const caps = extractCapabilities(content);

    // Check for anomalies (only if fingerprint is stable)
    const anomalies: BehaviorAnomaly[] = [];
    const isStable = fp.stableHash !== null;

    if (isStable) {
      // Detect NEW capabilities not in the stable fingerprint
      for (const op of caps.filesystemOps) {
        if (!fp.filesystemOps.has(op)) {
          anomalies.push({
            skillName,
            anomalyType: 'new_filesystem_op',
            description: `Skill "${skillName}" performing new filesystem operation: ${op} (not in baseline)`,
            severity: op === 'delete' ? 'critical' : op === 'write' ? 'high' : 'medium',
            newValue: op,
            timestamp: now,
          });
        }
      }

      for (const target of caps.networkTargets) {
        if (!fp.networkTargets.has(target)) {
          anomalies.push({
            skillName,
            anomalyType: 'new_network_target',
            description: `Skill "${skillName}" contacting new network target: ${target}`,
            severity: 'high',
            newValue: target,
            timestamp: now,
          });
        }
      }

      for (const env of caps.envAccesses) {
        if (!fp.envAccesses.has(env)) {
          const isSensitive = /(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/i.test(env);
          anomalies.push({
            skillName,
            anomalyType: 'new_env_access',
            description: `Skill "${skillName}" accessing new env var: ${env}`,
            severity: isSensitive ? 'critical' : 'medium',
            newValue: env,
            timestamp: now,
          });
        }
      }

      for (const proc of caps.processExecs) {
        if (!fp.processExecs.has(proc)) {
          anomalies.push({
            skillName,
            anomalyType: 'new_process_exec',
            description: `Skill "${skillName}" executing new process: ${proc}`,
            severity: 'critical',
            newValue: proc,
            timestamp: now,
          });
        }
      }

      for (const pat of caps.outputPatterns) {
        if (!fp.outputPatterns.has(pat)) {
          anomalies.push({
            skillName,
            anomalyType: 'new_output_pattern',
            description: `Skill "${skillName}" exhibiting new pattern: ${pat}`,
            severity: pat === 'exfiltration' ? 'critical' : 'high',
            newValue: pat,
            timestamp: now,
          });
        }
      }
    }

    // Update fingerprint with observed capabilities
    let newCapsSeen = false;
    for (const op of caps.filesystemOps) {
      if (!fp.filesystemOps.has(op)) { fp.filesystemOps.add(op); newCapsSeen = true; }
    }
    for (const t of caps.networkTargets) {
      if (!fp.networkTargets.has(t)) { fp.networkTargets.add(t); newCapsSeen = true; }
    }
    for (const e of caps.envAccesses) {
      if (!fp.envAccesses.has(e)) { fp.envAccesses.add(e); newCapsSeen = true; }
    }
    for (const p of caps.processExecs) {
      if (!fp.processExecs.has(p)) { fp.processExecs.add(p); newCapsSeen = true; }
    }
    for (const o of caps.outputPatterns) {
      if (!fp.outputPatterns.has(o)) { fp.outputPatterns.add(o); newCapsSeen = true; }
    }

    // Track stability
    if (!isStable) {
      if (newCapsSeen) {
        fp.stableStreak = 0;
      } else {
        fp.stableStreak++;
      }

      // Mark stable when threshold met
      if (
        fp.invocationCount >= this.stabilityThreshold &&
        fp.stableStreak >= this.stableStreak
      ) {
        fp.stableHash = this.computeCapabilityHash(fp);
      }
    }

    return anomalies;
  }

  /**
   * Get an immutable fingerprint snapshot for a skill.
   * 取得某 skill 的不可變指紋快照。
   */
  getFingerprint(skillName: string): SkillFingerprint | undefined {
    const fp = this.fingerprints.get(skillName);
    if (!fp) return undefined;

    return {
      skillName: fp.skillName,
      invocationCount: fp.invocationCount,
      firstSeen: fp.firstSeen,
      lastSeen: fp.lastSeen,
      isStable: fp.stableHash !== null,
      capabilities: {
        filesystemOps: new Set(fp.filesystemOps),
        networkTargets: new Set(fp.networkTargets),
        envAccesses: new Set(fp.envAccesses),
        processExecs: new Set(fp.processExecs),
        outputPatterns: new Set(fp.outputPatterns),
      },
      capabilityHash: fp.stableHash ?? this.computeCapabilityHash(fp),
    };
  }

  /** Get all tracked skill names */
  getTrackedSkills(): string[] {
    return [...this.fingerprints.keys()];
  }

  /** Get count of stable fingerprints */
  getStableCount(): number {
    let count = 0;
    for (const fp of this.fingerprints.values()) {
      if (fp.stableHash !== null) count++;
    }
    return count;
  }

  /** Get total tracked skills */
  getTrackedCount(): number {
    return this.fingerprints.size;
  }

  /**
   * Reset a skill's fingerprint (e.g., after a legitimate update).
   * 重置 skill 指紋（例如合法更新後）。
   */
  resetFingerprint(skillName: string): void {
    this.fingerprints.delete(skillName);
  }

  /**
   * Evict fingerprints not seen since cutoffMs ago.
   * 清除超過 cutoffMs 未活動的指紋。
   */
  cleanup(cutoffMs: number): number {
    const cutoff = Date.now() - cutoffMs;
    let evicted = 0;
    for (const [name, fp] of this.fingerprints) {
      if (fp.lastSeen < cutoff) {
        this.fingerprints.delete(name);
        evicted++;
      }
    }
    return evicted;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private getOrCreate(skillName: string, now: number): MutableFingerprint {
    const existing = this.fingerprints.get(skillName);
    if (existing) return existing;

    // Evict oldest if at capacity
    if (this.fingerprints.size >= MAX_SKILLS) {
      let oldestName: string | undefined;
      let oldestTime = Infinity;
      for (const [name, fp] of this.fingerprints) {
        if (fp.lastSeen < oldestTime) {
          oldestTime = fp.lastSeen;
          oldestName = name;
        }
      }
      if (oldestName) this.fingerprints.delete(oldestName);
    }

    const fp: MutableFingerprint = {
      skillName,
      invocationCount: 0,
      firstSeen: now,
      lastSeen: now,
      filesystemOps: new Set(),
      networkTargets: new Set(),
      envAccesses: new Set(),
      processExecs: new Set(),
      outputPatterns: new Set(),
      stableHash: null,
      stableStreak: 0,
    };
    this.fingerprints.set(skillName, fp);
    return fp;
  }

  private computeCapabilityHash(fp: MutableFingerprint): string {
    const parts = [
      [...fp.filesystemOps].sort().join(','),
      [...fp.networkTargets].sort().join(','),
      [...fp.envAccesses].sort().join(','),
      [...fp.processExecs].sort().join(','),
      [...fp.outputPatterns].sort().join(','),
    ];
    return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
  }
}
