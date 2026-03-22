/**
 * String-based SKILL.md manifest parser.
 *
 * Parses YAML frontmatter from raw content string.
 * No filesystem dependencies - caller is responsible for reading the file.
 */

import yaml from 'js-yaml';
import type { SkillManifest, SkillMetadata } from './types.js';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse SKILL.md content string and extract manifest + instructions.
 *
 * @param content - Raw SKILL.md content
 * @param fallbackName - Name to use if no name field in frontmatter (e.g. directory name)
 */
export function parseManifestFromString(
  content: string,
  fallbackName: string = 'unknown'
): SkillManifest {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    // No frontmatter - treat entire content as instructions
    return {
      name: fallbackName,
      description: '',
      instructions: content,
    };
  }

  const [, frontmatterRaw, instructions] = match;

  let parsed: Record<string, unknown>;
  try {
    parsed =
      (yaml.load(frontmatterRaw ?? '', { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>) ??
      {};
  } catch {
    return {
      name: fallbackName,
      description: '',
      instructions: instructions ?? content,
    };
  }

  // Parse metadata - can be a JSON string or an object
  let metadata: SkillMetadata | undefined;
  if (typeof parsed['metadata'] === 'string') {
    try {
      metadata = JSON.parse(parsed['metadata']) as SkillMetadata;
    } catch {
      metadata = undefined;
    }
  } else if (typeof parsed['metadata'] === 'object' && parsed['metadata'] !== null) {
    metadata = parsed['metadata'] as SkillMetadata;
  }

  return {
    name: (parsed['name'] as string) ?? fallbackName,
    description: (parsed['description'] as string) ?? '',
    license: parsed['license'] as string | undefined,
    homepage: parsed['homepage'] as string | undefined,
    userInvocable: parsed['user-invocable'] as boolean | undefined,
    disableModelInvocation: parsed['disable-model-invocation'] as boolean | undefined,
    commandDispatch: parsed['command-dispatch'] as string | undefined,
    commandTool: parsed['command-tool'] as string | undefined,
    metadata,
    'allowed-tools': parsed['allowed-tools'] as readonly string[] | undefined,
    instructions: instructions ?? '',
  };
}

/**
 * Quick skill name extraction from raw content (no full parse).
 */
export function parseSkillName(content: string): string | null {
  const match = content.match(/^---\n[\s\S]*?^name:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}
