/**
 * ATR Rule Scaffolder - Generates ATR rule YAML scaffolds from structured input
 * @module agent-threat-rules/rule-scaffolder
 */

import yaml from 'js-yaml';
import type {
  ATRCategory,
  ATRSeverity,
  ATRSourceType,
  ATRAction,
  ATRArrayCondition,
} from './types.js';

export interface ScaffoldInput {
  title: string;
  category: ATRCategory;
  severity?: ATRSeverity;
  attackDescription: string;
  examplePayloads: string[];
  agentSourceType?: ATRSourceType;
  owaspRefs?: string[];
  mitreRefs?: string[];
}

export interface ScaffoldResult {
  yaml: string;
  id: string;
  warnings: string[];
}

export interface ScaffoldOptions {
  author?: string;
  schemaVersion?: string;
}

const CATEGORY_TO_SOURCE_TYPE: Readonly<Record<ATRCategory, ATRSourceType>> = {
  'prompt-injection': 'llm_io',
  'tool-poisoning': 'tool_call',
  'context-exfiltration': 'context_window',
  'agent-manipulation': 'multi_agent_comm',
  'privilege-escalation': 'agent_behavior',
  'excessive-autonomy': 'agent_behavior',
  'data-poisoning': 'llm_io',
  'model-abuse': 'llm_io',
  'skill-compromise': 'skill_lifecycle',
};

const CATEGORY_TO_FIELD: Readonly<Record<ATRCategory, string>> = {
  'prompt-injection': 'user_input',
  'tool-poisoning': 'tool_response',
  'context-exfiltration': 'agent_output',
  'agent-manipulation': 'agent_message',
  'privilege-escalation': 'agent_action',
  'excessive-autonomy': 'agent_action',
  'data-poisoning': 'training_input',
  'model-abuse': 'user_input',
  'skill-compromise': 'skill_manifest',
};

const SEVERITY_TO_ACTIONS: Readonly<Record<ATRSeverity, readonly ATRAction[]>> = {
  critical: ['block_input', 'alert', 'escalate'],
  high: ['block_input', 'alert'],
  medium: ['alert', 'snapshot'],
  low: ['alert'],
  informational: ['alert'],
};

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(str: string): string {
  return str.replace(REGEX_SPECIAL_CHARS, '\\$&');
}

/**
 * Build a case-insensitive regex pattern from a payload string.
 * Extracts significant keywords (length > 3) and creates lookahead assertions,
 * falling back to a simple escaped match for short payloads.
 */
function buildRegexPattern(payload: string): string {
  const trimmed = payload.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 3);

  if (words.length === 0) {
    return `(?i).*${escapeRegex(trimmed)}.*`;
  }

  const keywords = words.slice(0, 4);
  return `(?i)${keywords.map((k) => `(?=.*${escapeRegex(k)})`).join('')}`;
}

function generateId(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `ATR-${year}-${seq}`;
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export class RuleScaffolder {
  private readonly options: Required<ScaffoldOptions>;

  constructor(options: ScaffoldOptions = {}) {
    this.options = {
      author: options.author ?? 'ATR Community (auto-scaffolded)',
      schemaVersion: options.schemaVersion ?? '0.1',
    };
  }

  /**
   * Generate a complete ATR YAML rule from structured input.
   * Returns a ScaffoldResult with the YAML string, generated ID, and any warnings.
   */
  scaffold(input: ScaffoldInput): ScaffoldResult {
    const warnings = this.validateInput(input);

    const severity = input.severity ?? 'medium';
    const sourceType = input.agentSourceType ?? CATEGORY_TO_SOURCE_TYPE[input.category];
    const field = CATEGORY_TO_FIELD[input.category];
    const id = generateId();
    const date = getCurrentDate();

    const conditions: ATRArrayCondition[] = input.examplePayloads.map(
      (payload, idx) => ({
        field,
        operator: 'regex',
        value: buildRegexPattern(payload),
        description: `Pattern ${idx + 1}: detects "${payload.trim()}"`,
      }),
    );

    const truePositives = input.examplePayloads.map((payload) => ({
      input: payload.trim(),
      expected: 'trigger' as const,
    }));

    const trueNegatives = [
      {
        input: 'TODO: Add benign input that should not trigger this rule',
        expected: 'no_trigger' as const,
      },
    ];

    const references: Record<string, string[]> = {};
    if (input.owaspRefs && input.owaspRefs.length > 0) {
      references.owasp_llm = [...input.owaspRefs];
    }
    if (input.mitreRefs && input.mitreRefs.length > 0) {
      references.mitre_atlas = [...input.mitreRefs];
    }

    const conditionExpr = conditions.length > 1 ? 'any' : 'all';

    const rule: Record<string, unknown> = {
      title: input.title,
      id,
      schema_version: this.options.schemaVersion,
      status: 'draft',
      description: input.attackDescription,
      author: this.options.author,
      date,
      severity,
      detection_tier: 'pattern',
      maturity: 'draft',
      ...(Object.keys(references).length > 0 ? { references } : {}),
      tags: {
        category: input.category,
        confidence: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
      },
      agent_source: {
        type: sourceType,
      },
      detection: {
        conditions,
        condition: conditionExpr,
        false_positives: [
          'TODO: Document known false positive scenarios',
        ],
      },
      response: {
        actions: [...SEVERITY_TO_ACTIONS[severity]],
        message_template: `Potential ${input.category} detected: {{matched_patterns}}`,
      },
      test_cases: {
        true_positives: truePositives,
        true_negatives: trueNegatives,
      },
    };

    const yamlStr = yaml.dump(rule, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
    });

    return { yaml: yamlStr, id, warnings };
  }

  /**
   * Validate scaffold input, throwing on invalid required fields
   * and returning warnings for non-critical issues.
   */
  private validateInput(input: ScaffoldInput): string[] {
    const warnings: string[] = [];

    if (!input.title || input.title.trim().length === 0) {
      throw new Error('ScaffoldInput.title is required and must be non-empty');
    }
    if (!input.category) {
      throw new Error('ScaffoldInput.category is required');
    }
    if (!input.attackDescription || input.attackDescription.trim().length === 0) {
      throw new Error('ScaffoldInput.attackDescription is required and must be non-empty');
    }
    if (!input.examplePayloads || input.examplePayloads.length === 0) {
      throw new Error('ScaffoldInput.examplePayloads must contain at least one payload');
    }

    if (input.examplePayloads.length < 3) {
      warnings.push(
        'Fewer than 3 example payloads - consider adding more for better pattern coverage.',
      );
    }

    return warnings;
  }
}
