/**
 * Onboarding Module
 * 安裝引導模組
 *
 * @module @openclaw/panguard-chat/onboarding
 */

export {
  SETUP_STEPS,
  getChannelConfigSteps,
  buildConfigFromAnswers,
  getWelcomeMessage,
  DEFAULT_PREFERENCES,
} from './setup-flow.js';
export type { SetupStep, SetupOption, SetupAnswers } from './setup-flow.js';
