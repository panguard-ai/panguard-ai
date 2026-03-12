/**
 * SOAR Playbook Parser - YAML parsing and validation
 * SOAR 劇本解析器 - YAML 解析與驗證
 *
 * Parses YAML playbook files and validates their structure
 * against the playbook schema. Provides directory-level loading.
 *
 * @module @panguard-ai/panguard-guard/playbook/parser
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { createLogger } from '@panguard-ai/core';
import type { Playbook, PlaybookAction } from './schema.js';
import { VALID_RESPONSE_ACTIONS, VALID_SEVERITIES, VALID_CORRELATION_PATTERNS } from './schema.js';

const logger = createLogger('panguard-guard:playbook-parser');

/** Duration string regex: number followed by s/m/h/d / 持續時間字串正則 */
const DURATION_REGEX = /^\d+[smhd]$/;

/**
 * Parse a YAML playbook string into a Playbook object.
 * 解析 YAML 劇本字串為 Playbook 物件。
 *
 * @param yamlContent - Raw YAML string / 原始 YAML 字串
 * @returns Parsed Playbook object / 解析後的 Playbook 物件
 * @throws Error if YAML is invalid / YAML 無效時拋出錯誤
 */
export function parsePlaybook(yamlContent: string): Playbook {
  const parsed = yaml.load(yamlContent);

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: content must be a non-null object');
  }

  return parsed as Playbook;
}

/**
 * Validation result for a playbook.
 * 劇本的驗證結果。
 */
export interface ValidationResult {
  /** Whether the playbook is valid / 劇本是否有效 */
  valid: boolean;
  /** List of validation errors / 驗證錯誤列表 */
  errors: string[];
}

/**
 * Validate a parsed playbook against the schema.
 * 驗證已解析的劇本是否符合架構。
 *
 * @param playbook - Playbook to validate / 要驗證的劇本
 * @returns Validation result with errors / 含錯誤的驗證結果
 */
export function validatePlaybook(playbook: Playbook): ValidationResult {
  const errors: string[] = [];

  // Name validation / 名稱驗證
  if (!playbook.name || typeof playbook.name !== 'string' || playbook.name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
  }

  // Trigger validation / 觸發條件驗證
  if (!playbook.trigger || typeof playbook.trigger !== 'object') {
    errors.push('trigger is required and must be an object');
  } else {
    const { pattern, minConfidence, minSeverity, category, mitreTechnique } = playbook.trigger;
    const hasCondition =
      pattern !== undefined ||
      minSeverity !== undefined ||
      category !== undefined ||
      mitreTechnique !== undefined;

    if (!hasCondition) {
      errors.push(
        'trigger must have at least one condition (pattern, minSeverity, category, or mitreTechnique)'
      );
    }

    if (pattern !== undefined && !VALID_CORRELATION_PATTERNS.has(pattern)) {
      errors.push(`trigger.pattern "${pattern}" is not a valid correlation pattern type`);
    }

    if (minConfidence !== undefined) {
      if (typeof minConfidence !== 'number' || minConfidence < 0 || minConfidence > 100) {
        errors.push('trigger.minConfidence must be a number between 0 and 100');
      }
    }

    if (minSeverity !== undefined && !VALID_SEVERITIES.has(minSeverity)) {
      errors.push(`trigger.minSeverity "${minSeverity}" is not a valid severity level`);
    }
  }

  // Actions validation / 動作驗證
  if (!Array.isArray(playbook.actions) || playbook.actions.length === 0) {
    errors.push('actions must be a non-empty array');
  } else {
    validateActions(playbook.actions, 'actions', errors);
  }

  // Escalation validation / 升級驗證
  if (playbook.escalation !== undefined) {
    if (typeof playbook.escalation !== 'object' || playbook.escalation === null) {
      errors.push('escalation must be an object');
    } else {
      const { after, within, actions: escActions } = playbook.escalation;

      if (typeof after !== 'number' || !Number.isInteger(after) || after <= 0) {
        errors.push('escalation.after must be a positive integer');
      }

      if (within !== undefined) {
        if (typeof within !== 'string' || !DURATION_REGEX.test(within)) {
          errors.push(
            'escalation.within must be a valid duration string (e.g., "1h", "24h", "30m")'
          );
        }
      }

      if (!Array.isArray(escActions) || escActions.length === 0) {
        errors.push('escalation.actions must be a non-empty array');
      } else {
        validateActions(escActions, 'escalation.actions', errors);
      }
    }
  }

  // Priority validation / 優先級驗證
  if (playbook.priority !== undefined && typeof playbook.priority !== 'number') {
    errors.push('priority must be a number');
  }

  // Enabled validation / 啟用驗證
  if (playbook.enabled !== undefined && typeof playbook.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an array of playbook actions.
 * 驗證一組劇本動作。
 */
function validateActions(actions: PlaybookAction[], prefix: string, errors: string[]): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action || typeof action !== 'object') {
      errors.push(`${prefix}[${i}] must be an object`);
      continue;
    }
    if (!VALID_RESPONSE_ACTIONS.has(action.type)) {
      errors.push(`${prefix}[${i}].type "${action.type}" is not a valid response action`);
    }
  }
}

/**
 * Load all playbooks from a directory.
 * 從目錄載入所有劇本。
 *
 * Reads all .yaml and .yml files, parses and validates each.
 * Invalid files are skipped with a warning log.
 *
 * @param dir - Directory path / 目錄路徑
 * @returns Array of valid playbooks / 有效劇本的陣列
 */
export function loadPlaybooksFromDir(dir: string): Playbook[] {
  const playbooks: Playbook[] = [];

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to read playbook directory "${dir}": ${msg}`);
    return playbooks;
  }

  const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  for (const file of yamlFiles) {
    const filePath = join(dir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const playbook = parsePlaybook(content);
      const validation = validatePlaybook(playbook);

      if (validation.valid) {
        playbooks.push(playbook);
        logger.info(`Loaded playbook: ${playbook.name} from ${file}`);
      } else {
        logger.warn(`Skipping invalid playbook "${file}": ${validation.errors.join('; ')}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Skipping unreadable playbook "${file}": ${msg}`);
    }
  }

  return playbooks;
}
