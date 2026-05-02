/**
 * Wrap `agent-threat-rules` `validateRule()` at the output boundary.
 *
 * Every converted rule MUST pass this before being written to disk or returned
 * to the CLI. If validation fails, we surface the error list to the caller —
 * the transformer is wrong, not the validator.
 *
 * Strategy in W1: import from the npm package. If the package isn't installed
 * (e.g. CI without network), fall back to a minimal local validator with the
 * same name + signature so unit tests don't require network. The fallback's
 * stricter than necessary — that's fine; W1 transformer should produce conservative output.
 */

interface ValidateResult {
  valid: boolean;
  errors: string[];
}

let cachedValidator: ((rule: unknown) => ValidateResult) | null = null;

async function loadValidator(): Promise<(rule: unknown) => ValidateResult> {
  if (cachedValidator !== null) return cachedValidator;
  try {
    const mod = (await import('agent-threat-rules')) as unknown as {
      validateRule?: (rule: unknown) => ValidateResult;
    };
    if (typeof mod.validateRule === 'function') {
      cachedValidator = mod.validateRule;
      return cachedValidator;
    }
  } catch {
    // fall through to local fallback
  }
  cachedValidator = localFallbackValidate;
  return cachedValidator;
}

/**
 * Local fallback validator. Mirrors agent-threat-rules `validateRule()` truthy-check
 * semantics so behaviour matches when the upstream package is unavailable
 * (offline CI, fallback path).
 *
 * Exported for unit tests so we can assert parity against upstream.
 */
export function localFallbackValidate(rule: unknown): ValidateResult {
  const errors: string[] = [];
  const r = rule as Record<string, unknown>;
  const required = [
    'title',
    'id',
    'status',
    'description',
    'author',
    'date',
    'severity',
    'tags',
    'agent_source',
    'detection',
    'response',
  ];
  for (const f of required) {
    // Upstream uses `!r[field]` (falsy). Match that — zero/false/empty-array all flag.
    if (!r[f]) {
      errors.push(`Missing required field: ${f}`);
    }
  }
  if (typeof r['id'] === 'string' && !/^ATR-\d{4}-\d{5}$/.test(r['id'])) {
    errors.push(`Invalid id format: ${String(r['id'])} (expected ATR-YYYY-NNNNN)`);
  }
  return { valid: errors.length === 0, errors };
}

export async function validateAtrOutput(rule: unknown): Promise<ValidateResult> {
  const v = await loadValidator();
  return v(rule);
}
