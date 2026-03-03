/**
 * Log parsers for syslog, auth.log, and journald formats
 * 日誌解析器 - 支援 syslog、auth.log 和 journald 格式
 *
 * Parses raw log lines into partial SecurityEvent objects.
 * 將原始日誌行解析為部分 SecurityEvent 物件。
 *
 * @module @panguard-ai/panguard-guard/collectors/log-parsers
 */

import type { SecurityEvent, EventSource, Severity } from '@panguard-ai/core';

let eventCounter = 0;

/** Generate a unique event ID / 產生唯一事件 ID */
function generateId(prefix: string): string {
  eventCounter++;
  return `${prefix}-${Date.now()}-${eventCounter}`;
}

/**
 * Syslog priority to severity mapping
 * Syslog 優先級到嚴重等級的映射
 *
 * Syslog priority = facility * 8 + severity
 * Severity: 0=Emergency, 1=Alert, 2=Critical, 3=Error, 4=Warning, 5=Notice, 6=Info, 7=Debug
 */
function syslogSeverityFromPriority(priority: number): Severity {
  const sevLevel = priority % 8;
  if (sevLevel <= 2) return 'critical';
  if (sevLevel === 3) return 'high';
  if (sevLevel === 4) return 'medium';
  if (sevLevel === 5) return 'low';
  return 'info';
}

/**
 * Month abbreviation to month number mapping / 月份縮寫到數字的映射
 */
const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Parse a syslog BSD/RFC 3164 timestamp into a Date
 * 解析 syslog BSD/RFC 3164 時間戳為 Date
 *
 * Format: "Mon DD HH:MM:SS" (e.g., "Jan  5 14:23:01")
 * Uses the current year since RFC 3164 omits it.
 */
function parseBsdTimestamp(month: string, day: string, time: string): Date {
  const now = new Date();
  const monthNum = MONTH_MAP[month];
  if (monthNum === undefined) return now;

  const [hours, minutes, seconds] = time.split(':').map(Number);
  const date = new Date(now.getFullYear(), monthNum, parseInt(day, 10));
  date.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);
  return date;
}

/**
 * Parse syslog RFC 3164 format / 解析 syslog RFC 3164 格式
 *
 * Format: <priority>Mon DD HH:MM:SS hostname program[pid]: message
 * Example: <34>Jan  5 14:23:01 myhost sshd[1234]: Failed password for root from 10.0.0.1
 */
export function parseSyslog3164(line: string): Partial<SecurityEvent> | null {
  if (!line || typeof line !== 'string') return null;

  // Match: optional <priority>, month day time, hostname, program[pid]: message
  const regex =
    /^(?:<(\d{1,3})>)?(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)$/;
  const match = line.match(regex);
  if (!match) return null;

  const [, priorityStr, month, day, time, hostname, program, pid, message] = match;
  const priority = priorityStr ? parseInt(priorityStr, 10) : 6 * 8 + 6; // default: local0.info
  const severity = syslogSeverityFromPriority(priority);
  const timestamp = parseBsdTimestamp(month!, day!, time!);

  return {
    id: generateId('syslog'),
    timestamp,
    source: 'syslog' as EventSource,
    severity,
    category: 'system',
    description: message ?? '',
    raw: line,
    host: hostname ?? 'unknown',
    metadata: {
      program: program ?? undefined,
      pid: pid ? parseInt(pid, 10) : undefined,
      facility: Math.floor(priority / 8),
      syslogSeverity: priority % 8,
      format: 'rfc3164',
    },
  };
}

/**
 * Parse syslog RFC 5424 format / 解析 syslog RFC 5424 格式
 *
 * Format: <priority>version timestamp hostname app-name procid msgid structured-data msg
 * Example: <165>1 2026-03-01T12:00:00.000Z myhost sshd 1234 - - Failed password
 */
export function parseSyslog5424(line: string): Partial<SecurityEvent> | null {
  if (!line || typeof line !== 'string') return null;

  // Match RFC 5424: <pri>version SP timestamp SP hostname SP app-name SP procid SP msgid SP SD SP msg
  const regex =
    /^<(\d{1,3})>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$/;
  const match = line.match(regex);
  if (!match) return null;

  const [, priorityStr, _version, timestampStr, hostname, appName, procId, msgId, sd, message] =
    match;

  const priority = parseInt(priorityStr!, 10);
  const severity = syslogSeverityFromPriority(priority);

  let timestamp: Date;
  try {
    timestamp = new Date(timestampStr!);
    if (isNaN(timestamp.getTime())) {
      timestamp = new Date();
    }
  } catch {
    timestamp = new Date();
  }

  return {
    id: generateId('syslog5424'),
    timestamp,
    source: 'syslog' as EventSource,
    severity,
    category: 'system',
    description: message ?? '',
    raw: line,
    host: hostname === '-' ? 'unknown' : (hostname ?? 'unknown'),
    metadata: {
      program: appName === '-' ? undefined : appName,
      pid: procId === '-' ? undefined : parseInt(procId!, 10) || undefined,
      msgId: msgId === '-' ? undefined : msgId,
      structuredData: sd === '-' ? undefined : sd,
      facility: Math.floor(priority / 8),
      syslogSeverity: priority % 8,
      format: 'rfc5424',
    },
  };
}

/**
 * Parse auth.log format (SSH, sudo, su events) / 解析 auth.log 格式（SSH、sudo、su 事件）
 *
 * Detects security-relevant authentication events and maps them
 * to appropriate categories and actions.
 * 偵測安全相關的身份驗證事件並映射到適當的分類和動作。
 */
export function parseAuthLog(line: string): Partial<SecurityEvent> | null {
  if (!line || typeof line !== 'string') return null;

  // First parse as syslog 3164 (auth.log uses BSD syslog format)
  // 首先解析為 syslog 3164（auth.log 使用 BSD syslog 格式）
  const baseParsed = parseSyslog3164(line);
  if (!baseParsed) return null;

  const message = baseParsed.description ?? '';
  const program = ((baseParsed.metadata?.['program'] as string) ?? '').toLowerCase();
  const metadata: Record<string, unknown> = { ...baseParsed.metadata };

  // ---- SSH patterns (program = sshd) ----
  // ---- SSH 模式（程式 = sshd）----

  // Successful SSH login / SSH 登入成功
  // Message: Accepted publickey|password for user from IP port PORT proto
  if (program === 'sshd') {
    const sshAccepted = message.match(
      /Accepted\s+(\S+)\s+for\s+(\S+)\s+from\s+(\S+)\s+port\s+(\d+)/i
    );
    if (sshAccepted) {
      const [, authMethod, user, sourceIP, port] = sshAccepted;
      return {
        ...baseParsed,
        source: 'authlog' as EventSource,
        severity: 'info',
        category: 'auth',
        description: `SSH login accepted: ${user} from ${sourceIP} via ${authMethod}`,
        metadata: {
          ...metadata,
          action: 'login_success',
          authMethod,
          user,
          sourceIP,
          sourcePort: parseInt(port!, 10),
        },
      };
    }

    // Failed SSH login / SSH 登入失敗
    // Message: Failed password for [invalid user] user from IP port PORT
    const sshFailed = message.match(
      /Failed\s+password\s+for\s+(?:invalid\s+user\s+)?(\S+)\s+from\s+(\S+)\s+port\s+(\d+)/i
    );
    if (sshFailed) {
      const [, user, sourceIP, port] = sshFailed;
      return {
        ...baseParsed,
        source: 'authlog' as EventSource,
        severity: 'medium',
        category: 'auth',
        description: `SSH login failed: ${user} from ${sourceIP}`,
        metadata: {
          ...metadata,
          action: 'login_failure',
          user,
          sourceIP,
          sourcePort: parseInt(port!, 10),
        },
      };
    }

    // Invalid user attempt / 無效使用者嘗試
    // Message: Invalid user USERNAME from IP port PORT
    const invalidUser = message.match(
      /Invalid\s+user\s+(\S+)\s+from\s+(\S+)(?:\s+port\s+(\d+))?/i
    );
    if (invalidUser) {
      const [, user, sourceIP, port] = invalidUser;
      return {
        ...baseParsed,
        source: 'authlog' as EventSource,
        severity: 'medium',
        category: 'auth',
        description: `SSH invalid user attempt: ${user} from ${sourceIP}`,
        metadata: {
          ...metadata,
          action: 'invalid_user',
          user,
          sourceIP,
          sourcePort: port ? parseInt(port, 10) : undefined,
        },
      };
    }
  }

  // ---- Sudo patterns (program = sudo) ----
  // ---- Sudo 模式（程式 = sudo）----

  // Sudo command execution / Sudo 指令執行
  // Message: username : TTY=... ; ... COMMAND=command
  if (program === 'sudo') {
    const sudoCmd = message.match(
      /(\S+)\s*:.*COMMAND=(.*)/i
    );
    if (sudoCmd) {
      const [, user, command] = sudoCmd;
      return {
        ...baseParsed,
        source: 'authlog' as EventSource,
        severity: 'medium',
        category: 'execution',
        description: `Privilege escalation: ${user} executed sudo command`,
        metadata: {
          ...metadata,
          action: 'privilege_escalation',
          user: user?.trim(),
          command: command?.trim(),
        },
      };
    }
  }

  // ---- Su patterns (program = su) ----
  // ---- Su 模式（程式 = su）----

  // Su session opened / Su 會話開啟
  // Message: ... session opened for user TARGET by USER(uid=...)
  if (program === 'su') {
    const suSession = message.match(
      /session\s+opened\s+for\s+user\s+(\S+)(?:\s+by\s+(\S+))?/i
    );
    if (suSession) {
      const [, targetUser, byUser] = suSession;
      return {
        ...baseParsed,
        source: 'authlog' as EventSource,
        severity: 'medium',
        category: 'auth',
        description: `Su session opened for ${targetUser}${byUser ? ` by ${byUser}` : ''}`,
        metadata: {
          ...metadata,
          action: 'su_session',
          targetUser,
          byUser: byUser ?? undefined,
        },
      };
    }
  }

  // If no specific auth pattern matched, return the base syslog parse
  // with authlog source if the line comes from an auth-related program
  // 如果沒有匹配到特定的認證模式，對來自認證相關程式的行回傳帶有 authlog 來源的基礎解析結果
  if (['sshd', 'sudo', 'su', 'login', 'pam', 'systemd-logind'].includes(program)) {
    return {
      ...baseParsed,
      source: 'authlog' as EventSource,
      category: 'auth',
    };
  }

  // Not an auth log line we recognize / 非認識的認證日誌行
  return null;
}

/**
 * Auto-detect format and parse a log line / 自動偵測格式並解析日誌行
 *
 * Tries parsers in order of specificity:
 * 1. Auth.log patterns (most specific)
 * 2. RFC 5424 syslog (versioned format)
 * 3. RFC 3164 syslog (BSD format)
 *
 * 按特異性順序嘗試解析器：
 * 1. Auth.log 模式（最具特異性）
 * 2. RFC 5424 syslog（版本化格式）
 * 3. RFC 3164 syslog（BSD 格式）
 */
export function parseLogLine(line: string): Partial<SecurityEvent> | null {
  if (!line || typeof line !== 'string') return null;

  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  // Try auth.log first (it is the most specific and useful)
  // 先嘗試 auth.log（最具特異性且最有用）
  const authResult = parseAuthLog(trimmed);
  if (authResult) return authResult;

  // Try RFC 5424 (identifiable by <pri>version format)
  // 嘗試 RFC 5424（可透過 <pri>版本 格式識別）
  if (/^<\d{1,3}>\d+\s/.test(trimmed)) {
    const rfc5424Result = parseSyslog5424(trimmed);
    if (rfc5424Result) return rfc5424Result;
  }

  // Try RFC 3164 (BSD syslog)
  // 嘗試 RFC 3164（BSD syslog）
  const rfc3164Result = parseSyslog3164(trimmed);
  if (rfc3164Result) return rfc3164Result;

  return null;
}
