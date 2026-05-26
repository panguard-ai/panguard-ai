/**
 * PanGuard Manager — public package entry
 * PanGuard Manager — 公開的套件進入點
 *
 * @module @panguard-ai/panguard-manager
 */

export { AgentsStore } from './agents-store.js';
export type { AgentsStoreOptions } from './agents-store.js';
export { OperatorStore } from './operators-store.js';
export type {
  OperatorStoreOptions,
  SessionLookup,
  CreateSessionContext,
} from './operators-store.js';
export { EnrollmentTokenStore } from './enrollment-store.js';
export type {
  EnrollmentTokenStoreOptions,
  EnrollmentToken,
  IssueTokenOptions,
  ConsumeResult,
} from './enrollment-store.js';
export { FleetAggregator } from './aggregator.js';
export type { FleetAggregatorOptions } from './aggregator.js';
export { ManagerServer } from './server.js';
export type { ManagerServerOptions } from './server.js';
export { openDatabase } from './db/connection.js';
export type { OpenDatabaseOptions } from './db/connection.js';
export type {
  AgentRecord,
  AgentSnapshot,
  FleetSummary,
  RegisterBody,
  RelayEventBody,
  ApiResponse,
  Operator,
  OperatorRole,
} from './types.js';
