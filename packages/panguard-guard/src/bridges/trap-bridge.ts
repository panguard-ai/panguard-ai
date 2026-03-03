/**
 * Trap -> Guard Bridge
 * 蜜罐 -> 守護引擎橋接
 *
 * Converts TrapSession data into SecurityEvent format
 * so honeypot detections flow into the Guard 4-agent pipeline.
 *
 * 將 TrapSession 資料轉換為 SecurityEvent 格式，
 * 使蜜罐偵測結果流入 Guard 四代理管線。
 *
 * @module @panguard-ai/panguard-guard/bridges/trap-bridge
 */

import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import type { SecurityEvent, Severity } from '@panguard-ai/core';
import type { TrapSession } from '@panguard-ai/panguard-trap';

/**
 * Convert a TrapSession into a SecurityEvent for the Guard pipeline
 * 將 TrapSession 轉換為 Guard pipeline 用的 SecurityEvent
 */
export function trapSessionToSecurityEvent(session: TrapSession): SecurityEvent {
  const severity = computeSeverity(session);
  const category = computeCategory(session);
  const description = buildDescription(session);

  return {
    id: `honeypot-${randomUUID()}`,
    timestamp: session.startTime,
    source: 'honeypot',
    severity,
    category,
    description,
    raw: session,
    host: hostname(),
    metadata: {
      sessionId: session.sessionId,
      serviceType: session.serviceType,
      sourceIP: session.sourceIP,
      sourcePort: session.sourcePort,
      credentialAttempts: session.credentials.length,
      commandCount: session.commands.length,
      mitreTechniques: session.mitreTechniques,
      durationMs: session.durationMs ?? 0,
    },
  };
}

/**
 * Compute severity based on session content
 * 根據連線內容計算嚴重度
 */
function computeSeverity(session: TrapSession): Severity {
  // Commands executed = attacker got shell access -> critical
  if (session.commands.length > 0) return 'critical';

  // Credential brute force with many attempts -> high
  if (session.credentials.length >= 5) return 'high';

  // Any credential attempt -> medium
  if (session.credentials.length > 0) return 'medium';

  // Just connection/scan -> low
  return 'low';
}

/**
 * Compute MITRE-style category
 * 計算 MITRE 風格分類
 */
function computeCategory(session: TrapSession): string {
  if (session.commands.length > 0) return 'execution';
  if (session.credentials.length >= 5) return 'credential_access';
  if (session.credentials.length > 0) return 'initial_access';
  return 'reconnaissance';
}

/**
 * Build human-readable description
 * 建立人類可讀描述
 */
function buildDescription(session: TrapSession): string {
  const parts: string[] = [
    `Honeypot ${session.serviceType} session from ${session.sourceIP}:${session.sourcePort}`,
  ];

  if (session.credentials.length > 0) {
    parts.push(`${session.credentials.length} credential attempt(s)`);
  }
  if (session.commands.length > 0) {
    parts.push(`${session.commands.length} command(s) executed`);
  }
  if (session.mitreTechniques.length > 0) {
    parts.push(`MITRE: ${session.mitreTechniques.join(', ')}`);
  }
  if (session.durationMs) {
    parts.push(`duration ${session.durationMs}ms`);
  }

  return parts.join(' | ');
}
