/**
 * Map Guard's `monitors` settings onto the core MonitorEngine configuration.
 *
 * Guard used to hand MonitorEngine only the poll intervals, so the on/off flags
 * in the config file were ignored and the engine fell back to its own defaults.
 * Every flag is forwarded explicitly here so a config file (or the default of
 * "off") is what actually decides which host monitors run.
 */

import type { MonitorConfig } from '@panguard-ai/core';
import type { GuardConfig } from './types.js';

export function toMonitorEngineConfig(monitors: GuardConfig['monitors']): Partial<MonitorConfig> {
  return {
    logMonitor: monitors.logMonitor,
    networkMonitor: monitors.networkMonitor,
    processMonitor: monitors.processMonitor,
    fileMonitor: monitors.fileMonitor,
    networkPollInterval: monitors.networkPollInterval,
    processPollInterval: monitors.processPollInterval,
  };
}
