/**
 * MCP Config Module - Platform detection and config injection
 * MCP 設定模組 - 平台偵測與設定注入
 *
 * @module @panguard-ai/panguard-mcp/config
 */

export { detectPlatforms, getConfigPath } from './platform-detector.js';
export type { PlatformId, DetectedPlatform } from './platform-detector.js';
export {
  injectMCPConfig,
  removeMCPConfig,
  injectAll,
  getInstallCommand,
  injectProxy,
  removeProxy,
} from './mcp-injector.js';
export type {
  InjectionResult,
  ProxyInjectionResult,
  ProxyInjectionSummary,
} from './mcp-injector.js';
export {
  parseMCPServers,
  resolveSkillDir,
  discoverAllSkills,
  removeServer,
} from './mcp-config-reader.js';
export type { MCPServerEntry } from './mcp-config-reader.js';
