/**
 * Narrowing helpers for JSON that arrives on the wire. Requests come from the
 * agent and events come from the provider; neither shape is trusted, so every
 * read goes through a guard instead of a cast.
 *
 * @module @panguard-ai/panguard-gateway/json
 */

/** A JSON object as received. Nothing about its fields is assumed. */
export type JsonObject = Readonly<Record<string, unknown>>;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function str(obj: JsonObject | undefined, key: string): string | undefined {
  const value = obj?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function num(obj: JsonObject | undefined, key: string): number | undefined {
  const value = obj?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function list(obj: JsonObject | undefined, key: string): readonly unknown[] | undefined {
  const value = obj?.[key];
  return Array.isArray(value) ? value : undefined;
}

export function obj(source: JsonObject | undefined, key: string): JsonObject | undefined {
  const value = source?.[key];
  return isObject(value) ? value : undefined;
}

/** Objects of an array, skipping anything else. */
export function objects(values: readonly unknown[] | undefined): readonly JsonObject[] {
  return (values ?? []).filter(isObject);
}

/** Parse JSON text, or undefined when it is not JSON. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * JSON.stringify, or undefined when the value cannot be serialized. JSON.parse
 * accepts nesting thousands of levels deep that JSON.stringify then rejects
 * with a RangeError, and such input can come from the model.
 */
export function stringifyJson(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
