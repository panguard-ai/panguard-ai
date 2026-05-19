/**
 * PanGuard Manager — public package entry
 * PanGuard Manager — 公開的套件進入點
 *
 * @module @panguard-ai/panguard-manager
 */

export { AgentsRegistry } from './agents-registry.js';
export type { AgentsRegistryOptions } from './agents-registry.js';
export { FleetAggregator } from './aggregator.js';
export type { FleetAggregatorOptions } from './aggregator.js';
export { ManagerServer } from './server.js';
export type { ManagerServerOptions } from './server.js';
export type {
  AgentRecord,
  AgentSnapshot,
  FleetSummary,
  RegisterBody,
  RelayEventBody,
  ApiResponse,
} from './types.js';
