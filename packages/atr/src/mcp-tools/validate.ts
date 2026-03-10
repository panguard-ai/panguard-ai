/**
 * atr_validate_rule MCP tool - Validate ATR rule YAML
 * @module agent-threat-rules/mcp-tools/validate
 */

import yaml from 'js-yaml';
import { validateRule } from '../loader.js';

export interface ValidateInput {
  yaml_content: string;
}

export function handleValidate(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const yamlContent = args['yaml_content'];
  if (typeof yamlContent !== 'string' || yamlContent.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: "yaml_content" is required and must be a non-empty string.' }],
      isError: true,
    };
  }

  try {
    const parsed = yaml.load(yamlContent);
    if (!parsed || typeof parsed !== 'object') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ valid: false, errors: ['YAML parsed to a non-object value.'] }, null, 2) }],
      };
    }

    const result = validateRule(parsed);

    const response = {
      valid: result.valid,
      errors: result.errors,
      parsed_fields: {
        id: (parsed as Record<string, unknown>)['id'] ?? null,
        title: (parsed as Record<string, unknown>)['title'] ?? null,
        severity: (parsed as Record<string, unknown>)['severity'] ?? null,
        category: ((parsed as Record<string, unknown>)['tags'] as Record<string, unknown> | undefined)?.['category'] ?? null,
        status: (parsed as Record<string, unknown>)['status'] ?? null,
      },
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: 'text', text: JSON.stringify({ valid: false, errors: [`YAML parse error: ${msg}`] }, null, 2) }],
    };
  }
}
