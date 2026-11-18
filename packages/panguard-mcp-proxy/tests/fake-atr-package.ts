/**
 * A stand-in agent-threat-rules package for tests of the worker path: a bundled
 * rules directory of JSON rules and an engine module with the same surface the
 * worker uses. An event whose content holds BLOCKING_MARKER keeps the engine
 * busy until its worker is terminated; any other event matches each rule whose
 * `contains` text its content holds.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Content that keeps the fake engine busy. */
export const BLOCKING_MARKER = 'block-the-engine';

const FAKE_ENGINE = `
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export class ATREngine {
  constructor({ rulesDir }) { this.rulesDir = rulesDir; this.rules = []; }
  async loadRules() {
    this.rules = readdirSync(this.rulesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(this.rulesDir, f), 'utf8')));
    return this.rules.length;
  }
  getRules() { return this.rules; }
  addRule(rule) { this.rules.push(rule); }
  evaluate(event) {
    if (event.content.includes(${JSON.stringify(BLOCKING_MARKER)})) for (;;) {}
    return this.rules
      .filter((r) => event.content.includes(r.contains))
      .map((rule) => ({ rule, confidence: 90 }));
  }
}
`;

export interface FakeRule {
  readonly id: string;
  readonly contains: string;
  readonly severity?: string;
  readonly maturity?: string;
}

/** Write rules as JSON files into `dir`. */
export function writeFakeRules(dir: string, rules: readonly FakeRule[]): string {
  mkdirSync(dir, { recursive: true });
  for (const rule of rules) {
    const body = {
      title: `Fake rule ${rule.id}`,
      severity: 'critical',
      maturity: 'stable',
      tags: { scan_target: 'mcp' },
      ...rule,
    };
    writeFileSync(join(dir, `${rule.id}.json`), JSON.stringify(body));
  }
  return dir;
}

/** Create the fake package under `dir`, with `bundled` as its bundled rules; returns `dir`. */
export function writeFakeAtrPackage(dir: string, bundled: readonly FakeRule[]): string {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'fake-atr', main: 'engine.mjs' })
  );
  writeFileSync(join(dir, 'engine.mjs'), FAKE_ENGINE);
  writeFakeRules(join(dir, 'rules'), bundled);
  return dir;
}
