/**
 * Structured JSON logger for Panguard AI
 * Panguard 安全平台結構化 JSON 日誌記錄器
 *
 * @module @panguard-ai/core/utils/logger
 */

import type { LogEntry } from '../types.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Read initial level from env var so ALL modules respect it, even across pnpm workspace boundaries
let currentLevel: LogLevel = (process.env['PANGUARD_LOG_LEVEL'] as LogLevel) || 'info';

/**
 * Set the minimum log level (also sets env var for child modules)
 * 設定最低日誌等級（同時設定環境變數讓子模組讀取）
 *
 * @param level - Minimum log level / 最低日誌等級
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
  process.env['PANGUARD_LOG_LEVEL'] = level;
}

/**
 * Create a structured log entry and output to stderr
 * 建立結構化日誌條目並輸出到 stderr
 *
 * @param level - Log level / 日誌等級
 * @param message - Log message / 日誌訊息
 * @param module - Module name / 模組名稱
 * @param context - Additional context / 額外上下文
 */
function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  module: string,
  context?: Record<string, unknown>
): void {
  // Check env var on every call — handles cross-package instances in pnpm workspaces
  const envLevel = process.env['PANGUARD_LOG_LEVEL'] as LogLevel | undefined;
  const effectiveLevel = envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : currentLevel;
  if (LOG_LEVELS[level] < LOG_LEVELS[effectiveLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    module,
    ...(context ? { context } : {}),
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    // Use stderr to avoid polluting stdout for info/debug
    process.stderr.write(output + '\n');
  }
}

/**
 * Logger interface with module-scoped methods
 * 具有模組範圍方法的日誌記錄器介面
 */
export interface Logger {
  /** Log debug message / 記錄除錯訊息 */
  debug: (message: string, context?: Record<string, unknown>) => void;
  /** Log info message / 記錄資訊訊息 */
  info: (message: string, context?: Record<string, unknown>) => void;
  /** Log warning message / 記錄警告訊息 */
  warn: (message: string, context?: Record<string, unknown>) => void;
  /** Log error message / 記錄錯誤訊息 */
  error: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Create a logger scoped to a specific module
 * 建立範圍限定於特定模組的日誌記錄器
 *
 * @param module - Module name / 模組名稱
 * @returns Logger instance / 日誌記錄器實例
 */
export function createLogger(module: string): Logger {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      log('debug', message, module, context),
    info: (message: string, context?: Record<string, unknown>) =>
      log('info', message, module, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      log('warn', message, module, context),
    error: (message: string, context?: Record<string, unknown>) =>
      log('error', message, module, context),
  };
}
