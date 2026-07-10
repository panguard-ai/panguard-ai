/**
 * Value-level secret scrubbing for durable audit payloads.
 *
 * The config redactor (redact.ts) matches KEY NAMES — right for a config object,
 * wrong for audit records whose secrets live in FREE-TEXT values: a git-watcher
 * finding can embed the very AWS key / private-key block / DB URL it matched, and
 * command/log monitors capture raw command lines. Those land in event.content and
 * verdict evidence under innocuous keys, so key-name redaction misses them, and
 * once appended they are hash-chained in place and can reach an export.
 *
 * This scrubber walks every string VALUE and masks substrings matching the same
 * secret classes the monitors detect (AWS/GitHub/Anthropic/OpenAI/Stripe keys,
 * PRIVATE KEY blocks, DB connection URLs). Immutable: returns a deep clone, never
 * mutates the input.
 *
 * @module @panguard-ai/panguard-guard/agent/scrub-secrets
 */

/** Placeholder substituted for any masked secret value. */
export const SECRET_MASK = '[secret-redacted]';

/**
 * High-signal secret VALUE patterns, mirroring the git-watcher DIFF_SECRET_PATTERNS
 * classes plus generic bearer/basic tokens. Each is `g`-flagged so every match in a
 * value is masked (a diff line can carry more than one). Ordered private-key first
 * so a multi-line key block is masked as a whole before narrower rules run.
 */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  /AKIA[0-9A-Z]{16}/g,
  /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /sk_live_[0-9a-zA-Z]{24,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /(?:mongodb|postgres|postgresql|mysql|redis):\/\/[^\s'"]{10,}/gi,
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]{20,}=*/g,
];

/** Mask every known secret pattern in a single string. */
function scrubString(value: string): string {
  let out = value;
  for (const re of SECRET_VALUE_PATTERNS) {
    out = out.replace(re, SECRET_MASK);
  }
  return out;
}

/**
 * Return a deep clone of `value` with every secret-looking substring in any string
 * field masked. Non-string primitives pass through; arrays and PLAIN objects recurse.
 * Never mutates the input.
 *
 * CRITICAL: non-plain objects (Date, Buffer, Map, RegExp, class instances) are passed
 * through UNCHANGED, not walked as `{}`. An audit ReportRecord carries a Date
 * (event.timestamp is `Date` in core's SecurityEvent); rebuilding it from Object.keys
 * would drop it to an empty object and CORRUPT the tamper-evident record before it is
 * hash-chained. Passing such objects through keeps JSON.stringify serialization
 * identical to the non-scrubbed path (Date -> ISO string via toJSON, etc.).
 */
export function scrubSecretValues<T>(value: T): T {
  return scrubDeep(value) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function scrubDeep(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      out[key] = scrubDeep(value[key]);
    }
    return out;
  }
  // Primitives and non-plain objects (Date/Buffer/etc.) pass through unchanged so
  // serialization stays identical to the pre-scrub path.
  return value;
}
