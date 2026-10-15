import { STATS } from './stats';

/**
 * Figures that message copy (messages/*.json) takes from stats.ts instead of
 * hardcoding them, so the ATR Stats Sync Bot's updates reach every page. Write
 * the token literally in a message, e.g. "%ATR_RULES% ATR rules".
 */
export const MESSAGE_TOKENS: Readonly<Record<string, string>> = {
  '%ATR_RULES%': STATS.totalRulesDisplay,
  '%ATR_PATTERNS%': STATS.atrPatterns.toLocaleString('en-US'),
};

const TOKEN_PATTERN = /%[A-Z][A-Z_]*%/g;

function fillString(value: string): string {
  return value.replace(TOKEN_PATTERN, (token) => MESSAGE_TOKENS[token] ?? token);
}

/** Returns a copy of `messages` with every known token filled in; the input is not modified. */
export function fillMessageTokens<T>(messages: T): T {
  if (typeof messages === 'string') return fillString(messages) as T;
  if (Array.isArray(messages)) return messages.map((item) => fillMessageTokens(item)) as T;
  if (messages !== null && typeof messages === 'object') {
    return Object.fromEntries(
      Object.entries(messages).map(([key, value]) => [key, fillMessageTokens(value)])
    ) as T;
  }
  return messages;
}
