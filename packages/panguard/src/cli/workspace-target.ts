/**
 * Privacy-safe `target` value for workspace sync events.
 *
 * A scanned local path reveals the user's directory layout and often the user
 * name, so only its final segment (basename) is sent. A URL keeps scheme, host
 * and pathname but loses userinfo (credentials), query and fragment. A prefixed
 * remote identifier such as `github:owner/repo/SKILL.md` or `clawhub:name` is a
 * registry reference, not a local path, and is kept as is. The content hash
 * (`target_hash`) is sent separately and is unaffected.
 */

const URL_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;
/** `scheme:rest` with a scheme of 2+ letters (so `C:\dir` is not one) and no `//` or slash right after. */
const REMOTE_ID = /^[A-Za-z][A-Za-z0-9+.-]+:(?![\\/])[^\s?#]+/;
const MAX_TARGET_LENGTH = 200;

function sanitizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return null;
  }
}

function basenameOf(raw: string): string {
  const parts = raw.split(/[\\/]+/).filter((p) => p.length > 0);
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : '';
}

export function sanitizeSyncTarget(raw: string): string {
  const trimmed = raw.trim();
  const remote = REMOTE_ID.exec(trimmed)?.[0];
  const cleaned = URL_SCHEME.test(trimmed)
    ? (sanitizeUrl(trimmed) ?? basenameOf(trimmed))
    : (remote ?? basenameOf(trimmed));
  return (cleaned || 'unknown').slice(0, MAX_TARGET_LENGTH);
}
