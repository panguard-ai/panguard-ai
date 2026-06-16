/**
 * Secret redaction for any config object before it is printed, logged, or sent
 * to a browser. Key-name matching (not value matching) survives config-shape
 * drift — a new secret-bearing field is caught automatically as long as its key
 * name looks secret-ish.
 *
 * @module @panguard-ai/panguard-guard/redact
 */

/**
 * Matches object KEY names that carry secrets. Case-insensitive. Covers the
 * fields that actually appear in Guard config today (ai.apiKey,
 * threatCloudApiKey, licenseKey, notification botToken / webhook secret / smtp
 * pass) plus generic secret-ish names so future fields are redacted by default.
 */
export const SECRET_KEY_RE =
  /(api[-_]?key|license[-_]?key|signing[-_]?key|private[-_]?key|token|secret|password|passphrase|credential|\bpass\b)/i;

/** Placeholder substituted for any redacted secret value. */
export const REDACTED = '[redacted]';

/**
 * Return a deep clone of `value` with every secret-named string field replaced
 * by `[redacted]`. Non-string and empty values are left untouched (so the
 * reader can still tell whether a channel is configured). Never mutates the
 * input.
 */
export function redactSecrets<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (k, v) =>
      SECRET_KEY_RE.test(k) && typeof v === 'string' && v ? REDACTED : v
    )
  ) as T;
}
