/**
 * YARA rule shape — the subset W2 supports.
 *
 * YARA syntax (canonical form):
 *
 *   rule RuleName : tag1 tag2 {
 *     meta:
 *       description = "..."
 *       author = "..."
 *       date = "2024-01-15"
 *       threat_level = 3
 *     strings:
 *       $str1 = "evil_pattern"
 *       $str2 = "another" nocase
 *       $hex  = { 4D 5A 90 00 }     // hex pattern
 *       $re   = /regex_pattern/i
 *     condition:
 *       any of them
 *       // or: all of them
 *       // or: any of ($str*)
 *       // or: $str1 and $str2
 *   }
 *
 * Scope (W2 — what we support):
 *   - text string identifiers: $name = "value" with optional `nocase` modifier
 *   - regex string identifiers: $name = /pattern/ with optional `i` modifier
 *   - condition shapes:
 *       `any of them`        → combinator='any'
 *       `all of them`        → combinator='all'
 *       `any of ($str*)`     → combinator='any', set restricted to $str*
 *       `all of ($str*)`     → combinator='all', set restricted to $str*
 *       `$str1`              → single string
 *       `$str1 and $str2`    → AND of two strings (combinator='all', selectionKeys=both)
 *       `$str1 or $str2`     → OR (combinator='any')
 *
 * Out of scope (returns null + warning):
 *   - hex strings ({ 4D 5A ... }) — binary patterns, no text-scan analogue
 *   - count expressions (#str1 > 5)
 *   - offset/range (@str1 == 0x100, $str1 in (0..100))
 *   - external variables, modules (pe.imphash, hash.md5, math.entropy)
 *   - for-loops (for any i in (1..#str1))
 *   - rule references (`rule_name and not other_rule`)
 */

export type YaraStringModifier =
  | 'nocase'
  | 'wide'
  | 'ascii'
  | 'fullword'
  | 'i' // regex case-insensitive
  | 's' // regex single-line
  | 'private'
  | 'xor'
  | 'base64'
  | 'base64wide';

export interface YaraTextString {
  readonly kind: 'text';
  readonly name: string; // includes leading $
  readonly value: string;
  readonly modifiers: readonly YaraStringModifier[];
}

export interface YaraRegexString {
  readonly kind: 'regex';
  readonly name: string;
  readonly pattern: string;
  readonly flags: string; // e.g. 'i', 's', 'is'
  readonly modifiers: readonly YaraStringModifier[];
}

export interface YaraHexString {
  readonly kind: 'hex';
  readonly name: string;
  readonly hexBody: string; // raw hex body — W2 unsupported, recorded for audit only
}

export type YaraString = YaraTextString | YaraRegexString | YaraHexString;

export interface YaraMeta {
  readonly [key: string]: string | number | boolean;
}

export interface YaraRule {
  readonly name: string;
  readonly tags: readonly string[];
  readonly meta: YaraMeta;
  readonly strings: readonly YaraString[];
  readonly condition: string; // raw text of condition body
}

export interface YaraParseResult {
  readonly ir: import('../../ir/types.js').MigratorIR | null;
  readonly warnings: readonly string[];
}
