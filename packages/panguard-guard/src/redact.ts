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
 * `webhookUrl` is included because a Slack/Discord webhook URL is itself the
 * credential — anyone holding it can post as the workspace.
 */
export const SECRET_KEY_RE =
  /(api[-_]?key|license[-_]?key|signing[-_]?key|private[-_]?key|webhook[-_]?url|token|secret|password|passphrase|credential|\bpass\b)/i;

/**
 * Matches string VALUES that are themselves a credential even when the key name
 * is innocuous (e.g. a `url` field inside a notification/webhook sub-object).
 * Covers Slack and Discord incoming-webhook URLs, whose path embeds the secret.
 */
export const SECRET_VALUE_RE =
  /^https:\/\/(hooks\.slack\.com\/|discord(?:app)?\.com\/api\/webhooks\/)/i;

/** Placeholder substituted for any redacted secret value. */
export const REDACTED = '[redacted]';

/**
 * Return a deep clone of `value` with every secret-named string field replaced
 * by `[redacted]`. A string is also redacted when its VALUE looks like a
 * webhook credential (Slack/Discord), so a literally-named `url` field inside a
 * webhook config does not leak. Non-string and empty values are left untouched
 * (so the reader can still tell whether a channel is configured). Never mutates
 * the input.
 */
export function redactSecrets<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (k, v) =>
      typeof v === 'string' && v && (SECRET_KEY_RE.test(k) || SECRET_VALUE_RE.test(v))
        ? REDACTED
        : v
    )
  ) as T;
}
