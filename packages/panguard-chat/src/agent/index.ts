/**
 * Chat Agent Module
 * Chat Agent 模組
 *
 * @module @openclaw/panguard-chat/agent
 */

export { ChatAgent } from './chat-agent.js';
export { buildSystemPrompt, getUserTypeInstructions } from './prompts.js';
export {
  formatAlert,
  formatSummary,
  formatLearningProgress,
  formatConfirmation,
  formatPeacefulReport,
} from './formatter.js';
