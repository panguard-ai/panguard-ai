/**
 * Log collectors - file tailing, syslog, and journald integration
 * 日誌收集器 - 檔案追蹤、syslog 和 journald 整合
 *
 * @module @panguard-ai/panguard-guard/collectors
 */

// LogCollector / 日誌收集器
export { LogCollector } from './log-collector.js';
export type { LogCollectorConfig } from './log-collector.js';

// Log parsers / 日誌解析器
export { parseSyslog3164, parseSyslog5424, parseAuthLog, parseLogLine } from './log-parsers.js';
