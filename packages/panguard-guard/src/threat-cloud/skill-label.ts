/**
 * Skill label sanitiser for Threat Cloud payloads.
 *
 * A skill name that is a manifest or registry name is sent as is. A value that
 * looks like a filesystem path (POSIX, Windows drive, UNC or home-relative) is
 * reduced to its final segment so no local directory tree, home directory or
 * username leaves the machine. The result is capped in length.
 *
 * @module @panguard-ai/panguard-guard/threat-cloud/skill-label
 */

const MAX_LABEL_LENGTH = 80;

const PATH_LIKE = /[\\/]|^~|^[A-Za-z]:/;

function lastSegment(value: string): string {
  const parts = value.split(/[\\/]+/).filter((p) => p.length > 0);
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : '';
}

export function sanitizeSkillLabel(name: string): string {
  const trimmed = name.trim();
  const label = PATH_LIKE.test(trimmed) ? lastSegment(trimmed) : trimmed;
  return label.slice(0, MAX_LABEL_LENGTH);
}
