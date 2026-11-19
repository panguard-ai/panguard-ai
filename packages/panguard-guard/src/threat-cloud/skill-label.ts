/**
 * Skill label sanitiser for Threat Cloud payloads.
 *
 * A skill name that is a manifest or registry name (including `@scope/name`) is
 * sent as is. A value that looks like a filesystem path is reduced to its final
 * segment so no local directory tree, home directory or
 * username leaves the machine. The result is capped in length.
 *
 * @module @panguard-ai/panguard-guard/threat-cloud/skill-label
 */

const MAX_LABEL_LENGTH = 80;

/** Leading /, ~ or a drive letter, or any backslash: clearly a filesystem path. */
const PATH_PREFIX = /^[\\/~]|^[A-Za-z]:|\\/;

function lastSegment(value: string): string {
  const parts = value.split(/[\\/]+/).filter((p) => p.length > 0);
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : '';
}

function separatorCount(value: string): number {
  return (value.match(/[\\/]/g) ?? []).length;
}

/**
 * Package-style names (`@scope/name`, `owner/name`) have exactly one separator
 * and are kept as is. Only real filesystem paths (leading separator, ~, drive
 * letter, backslashes, or more than one separator) are reduced to the last
 * segment.
 */
export function sanitizeSkillLabel(name: string): string {
  const trimmed = name.trim();
  const isPath = PATH_PREFIX.test(trimmed) || separatorCount(trimmed) > 1;
  const label = isPath ? lastSegment(trimmed) : trimmed;
  return label.slice(0, MAX_LABEL_LENGTH);
}
