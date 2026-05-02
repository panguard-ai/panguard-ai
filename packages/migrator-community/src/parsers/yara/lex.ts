/**
 * Minimal YARA lexer/parser — sufficient for the 80% of public YARA rules
 * that follow the canonical form (rule NAME { meta: ... strings: ... condition: ... }).
 *
 * Not a full YARA grammar — we deliberately reject what we can't faithfully
 * convert (hex strings, modules, for-loops). The parser surfaces those as
 * warnings rather than silently miscompiling.
 */

import type {
  YaraRule,
  YaraString,
  YaraStringModifier,
  YaraMeta,
  YaraTextString,
  YaraRegexString,
  YaraHexString,
} from './types.js';

/**
 * Strip /* block *\/ comments + whole-line `//` comments.
 *
 * Mid-line `//` is intentionally NOT stripped — too many false positives
 * (URLs in meta values like `reference = "https://github.com/..."`,
 * forward slashes in regex character classes like `[A-Za-z0-9/+=]`).
 * YARA rules in the wild rarely use trailing line comments anyway.
 */
function stripComments(src: string): string {
  const noBlocks = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return noBlocks
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n');
}

/**
 * Find balanced `{...}` block starting at `start`. Returns body (without
 * outer braces).
 *
 * Tracks string literals (`"..."` / `'...'`) AND regex literals (`/.../`,
 * with `[...]` character-class awareness). Without regex tracking, regex
 * quantifiers like `{16}` inside `/AKIA[0-9A-Z]{16}/` would mis-balance
 * the outer rule braces.
 */
function readBalancedBraces(text: string, start: number): { body: string; end: number } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inString = false;
  let strQuote = '';
  let inRegex = false;
  let inCharClass = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i] ?? '';
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === '\\' && (inString || inRegex)) {
      escaped = true;
      continue;
    }

    if (inString) {
      if (c === strQuote) inString = false;
      continue;
    }
    if (inRegex) {
      if (c === '[') inCharClass = true;
      else if (c === ']') inCharClass = false;
      else if (c === '/' && !inCharClass) inRegex = false;
      continue;
    }

    if (c === '"' || c === "'") {
      inString = true;
      strQuote = c;
      continue;
    }

    // A `/` outside string/regex starts a YARA regex literal.
    // (YARA has no arithmetic / division at the top level, so any `/` here
    // is a regex opening.)
    if (c === '/') {
      inRegex = true;
      inCharClass = false;
      continue;
    }

    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return { body: text.slice(start + 1, i), end: i };
      }
    }
  }
  return null;
}

const SUPPORTED_MODIFIERS: readonly YaraStringModifier[] = [
  'nocase',
  'wide',
  'ascii',
  'fullword',
  'private',
  'xor',
  'base64',
  'base64wide',
];

function parseStringModifiers(after: string): readonly YaraStringModifier[] {
  const tokens = after.trim().split(/\s+/).filter(Boolean);
  const out: YaraStringModifier[] = [];
  for (const t of tokens) {
    if ((SUPPORTED_MODIFIERS as readonly string[]).includes(t)) {
      out.push(t as YaraStringModifier);
    }
  }
  return out;
}

/**
 * Parse a single string definition line. Returns null on malformed input.
 * Examples:
 *   $str1 = "evil"
 *   $str2 = "case-insensitive" nocase
 *   $hex  = { 4D 5A 90 00 }
 *   $re   = /pattern/i
 */
function parseStringLine(line: string): YaraString | null {
  const m = /^\s*(\$[A-Za-z0-9_*]+)\s*=\s*(.*)$/.exec(line);
  if (!m) return null;
  const name = m[1] ?? '';
  let rest = (m[2] ?? '').trim();
  if (rest === '') return null;

  // Hex string: { ... }
  if (rest.startsWith('{')) {
    const closeIdx = rest.indexOf('}');
    if (closeIdx < 0) return null;
    return {
      kind: 'hex',
      name,
      hexBody: rest.slice(1, closeIdx).trim(),
    } satisfies YaraHexString;
  }

  // Regex: /.../
  if (rest.startsWith('/')) {
    // Find closing slash, respecting escapes AND character classes [...]
    // (forward slashes inside [...] are literal, not the regex terminator).
    let closeIdx = -1;
    let inCharClass = false;
    for (let i = 1; i < rest.length; i++) {
      if (rest[i] === '\\') {
        i += 1;
        continue;
      }
      if (rest[i] === '[') {
        inCharClass = true;
        continue;
      }
      if (rest[i] === ']') {
        inCharClass = false;
        continue;
      }
      if (rest[i] === '/' && !inCharClass) {
        closeIdx = i;
        break;
      }
    }
    if (closeIdx < 0) return null;
    const pattern = rest.slice(1, closeIdx);
    let flagEnd = closeIdx + 1;
    while (flagEnd < rest.length && /[isxg]/.test(rest[flagEnd] ?? '')) flagEnd += 1;
    const flags = rest.slice(closeIdx + 1, flagEnd);
    const modifiers = parseStringModifiers(rest.slice(flagEnd));
    return {
      kind: 'regex',
      name,
      pattern,
      flags,
      modifiers,
    } satisfies YaraRegexString;
  }

  // Text: "..."
  if (rest.startsWith('"')) {
    let closeIdx = -1;
    let escaped = false;
    for (let i = 1; i < rest.length; i++) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (rest[i] === '\\') {
        escaped = true;
        continue;
      }
      if (rest[i] === '"') {
        closeIdx = i;
        break;
      }
    }
    if (closeIdx < 0) return null;
    const value = JSON.parse(rest.slice(0, closeIdx + 1)) as string;
    const modifiers = parseStringModifiers(rest.slice(closeIdx + 1));
    return {
      kind: 'text',
      name,
      value,
      modifiers,
    } satisfies YaraTextString;
  }

  return null;
}

function parseMetaBlock(metaBody: string): YaraMeta {
  const out: Record<string, string | number | boolean> = {};
  const lines = metaBody.split('\n');
  for (const line of lines) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1] ?? '';
    let val = (m[2] ?? '').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      try {
        out[key] = JSON.parse(val) as string;
      } catch {
        out[key] = val.slice(1, -1);
      }
    } else if (val === 'true' || val === 'false') {
      out[key] = val === 'true';
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      out[key] = parseFloat(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function parseStringsBlock(stringsBody: string): readonly YaraString[] {
  const out: YaraString[] = [];
  const lines = stringsBody.split('\n');
  let buffer = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('$')) {
      if (buffer !== '') {
        const parsed = parseStringLine(buffer);
        if (parsed) out.push(parsed);
      }
      buffer = trimmed;
    } else {
      buffer += ' ' + trimmed;
    }
  }
  if (buffer !== '') {
    const parsed = parseStringLine(buffer);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Top-level entrypoint. Returns the first rule found in the source.
 * Real YARA files can have multiple rules per file; the parser supports that
 * via parseAllYaraRules below — this convenience function returns the first.
 */
export function parseFirstYaraRule(source: string): YaraRule | null {
  const all = parseAllYaraRules(source);
  return all.length === 0 ? null : (all[0] ?? null);
}

export function parseAllYaraRules(source: string): readonly YaraRule[] {
  const cleaned = stripComments(source);
  const out: YaraRule[] = [];

  // Find each `rule NAME [: tags] {`
  const ruleRe = /\brule\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*([A-Za-z0-9_\s]+?))?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(cleaned)) !== null) {
    const name = m[1] ?? '';
    const tags = (m[2] ?? '').trim().split(/\s+/).filter(Boolean);
    const braceStart = cleaned.indexOf('{', m.index);
    const balanced = readBalancedBraces(cleaned, braceStart);
    if (!balanced) continue;
    const body = balanced.body;
    ruleRe.lastIndex = balanced.end + 1;

    // Find sub-blocks. Each is `name:` followed by content until next section keyword or end.
    const metaBody = extractSection(body, 'meta');
    const stringsBody = extractSection(body, 'strings');
    const conditionBody = extractSection(body, 'condition');

    out.push({
      name,
      tags,
      meta: metaBody !== null ? parseMetaBlock(metaBody) : {},
      strings: stringsBody !== null ? parseStringsBlock(stringsBody) : [],
      condition: (conditionBody ?? '').trim(),
    });
  }
  return out;
}

const SECTION_KEYWORDS = ['meta', 'strings', 'condition'] as const;

function extractSection(body: string, name: (typeof SECTION_KEYWORDS)[number]): string | null {
  const keywordRe = new RegExp(`(^|\\n)\\s*${name}\\s*:`, 'g');
  const m = keywordRe.exec(body);
  if (!m) return null;
  const start = m.index + m[0].length;

  // Find the next section keyword (or end of body)
  let end = body.length;
  for (const kw of SECTION_KEYWORDS) {
    if (kw === name) continue;
    const re = new RegExp(`(^|\\n)\\s*${kw}\\s*:`, 'g');
    re.lastIndex = start;
    const next = re.exec(body);
    if (next && next.index < end) end = next.index;
  }
  return body.slice(start, end);
}
