/**
 * Rules module - Legacy Sigma RuleEngine removed
 *
 * The project now uses ATR Engine exclusively for detection.
 * This module is kept for the version export only.
 *
 * @module @panguard-ai/core/rules
 */

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../../package.json') as { version: string };

/** Rules module version */
export const RULES_VERSION: string = _pkg.version;
