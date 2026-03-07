/**
 * YARA Rule Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { YaraRuleGenerator } from '../../src/threat-intel/yara-rule-generator.js';
import type { ExtractionResult, ExtractedAttackPattern } from '../../src/threat-intel/types.js';

function makePattern(overrides: Partial<ExtractedAttackPattern> = {}): ExtractedAttackPattern {
  return {
    attackType: 'Code Injection',
    endpointPatterns: [],
    payloadSignatures: ['eval(', 'exec('],
    cweIds: ['CWE-94'],
    mitreTechniques: ['T1059'],
    logSourceCategory: 'webserver',
    logSourceProduct: 'any',
    confidence: 75,
    description: 'Code injection attack detected',
    ...overrides,
  };
}

function makeExtraction(patterns: ExtractedAttackPattern[] = [makePattern()]): ExtractionResult {
  return {
    reportId: '2701701',
    reportTitle: 'Injection in path parameter of Ingress-nginx',
    reportUrl: 'https://hackerone.com/reports/2701701',
    patterns,
    extractedAt: new Date().toISOString(),
    model: 'heuristic',
  };
}

describe('YaraRuleGenerator', () => {
  const generator = new YaraRuleGenerator();

  it('generates a valid YARA rule for Code Injection', () => {
    const rules = generator.generate(makeExtraction());
    expect(rules).toHaveLength(1);

    const rule = rules[0];
    expect(rule.attackType).toBe('Code Injection');
    expect(rule.confidence).toBe(75);
    expect(rule.status).toBe('experimental');
    expect(rule.sourceReportId).toBe('2701701');
    expect(rule.id).toContain('panguard_code_injection_');

    // Validate YARA syntax structure
    expect(rule.ruleContent).toContain('rule panguard_code_injection_');
    expect(rule.ruleContent).toContain('meta:');
    expect(rule.ruleContent).toContain('strings:');
    expect(rule.ruleContent).toContain('condition:');
    expect(rule.ruleContent).toContain('}');
  });

  it('includes meta fields', () => {
    const rules = generator.generate(makeExtraction());
    const content = rules[0].ruleContent;

    expect(content).toContain('author = "Panguard Threat Intel (auto-generated)"');
    expect(content).toContain('reference = "https://hackerone.com/reports/2701701"');
    expect(content).toContain('cwe = "CWE-94"');
    expect(content).toContain('mitre = "T1059"');
    expect(content).toContain('confidence = 75');
  });

  it('generates nocase text strings', () => {
    const rules = generator.generate(makeExtraction());
    const content = rules[0].ruleContent;

    expect(content).toContain('$eval_call = "eval(" nocase');
    expect(content).toContain('$exec_call = "exec(" nocase');
    expect(content).toContain('$system_call = "system(" nocase');
  });

  it('generates XSS YARA rules', () => {
    const pattern = makePattern({ attackType: 'XSS', cweIds: ['CWE-79'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$script_tag = "<script" nocase');
    expect(rules[0].ruleContent).toContain('$javascript_proto = "javascript:" nocase');
  });

  it('generates SQLi YARA rules', () => {
    const pattern = makePattern({ attackType: 'SQLi', cweIds: ['CWE-89'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$union_select = "UNION SELECT" nocase');
    expect(rules[0].ruleContent).toContain('$sleep_func = "SLEEP(" nocase');
  });

  it('generates Path Traversal YARA rules', () => {
    const pattern = makePattern({ attackType: 'Path Traversal', cweIds: ['CWE-22'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$dot_dot_slash = "../" nocase');
    expect(rules[0].ruleContent).toContain('$etc_passwd = "/etc/passwd" nocase');
  });

  it('generates XXE YARA rules with regex strings', () => {
    const pattern = makePattern({ attackType: 'XXE', cweIds: ['CWE-611'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$entity_decl = "<!ENTITY" nocase');
    expect(rules[0].ruleContent).toMatch(/\$parameter_entity = \/.*\/ nocase/);
  });

  it('generates SSRF YARA rules', () => {
    const pattern = makePattern({ attackType: 'SSRF', cweIds: ['CWE-918'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$localhost = "127.0.0.1" nocase');
    expect(rules[0].ruleContent).toContain('$metadata_aws = "169.254.169.254" nocase');
  });

  it('generates Deserialization YARA rules with hex strings', () => {
    const pattern = makePattern({ attackType: 'Deserialization', cweIds: ['CWE-502'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$java_serial = { ac ed 00 05 }');
    expect(rules[0].ruleContent).toContain('$java_base64 = "rO0AB" nocase');
  });

  it('generates File Upload / webshell YARA rules', () => {
    const pattern = makePattern({ attackType: 'File Upload', cweIds: ['CWE-434'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$php_tag = "<?php" nocase');
    expect(rules[0].ruleContent).toContain('$webshell_passthru = "passthru(" nocase');
  });

  it('generates Command Injection YARA rules', () => {
    const pattern = makePattern({ attackType: 'Command Injection', cweIds: ['CWE-78'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$cmd_pipe = "/bin/sh -c" nocase');
  });

  it('generates Auth Bypass YARA rules', () => {
    const pattern = makePattern({ attackType: 'Auth Bypass', cweIds: ['CWE-287'] });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules).toHaveLength(1);
    expect(rules[0].ruleContent).toContain('$forwarded_for = "X-Forwarded-For:" nocase');
  });

  it('skips unknown attack types without YARA strings', () => {
    const pattern = makePattern({ attackType: 'Unknown' });
    const rules = generator.generate(makeExtraction([pattern]));
    expect(rules).toHaveLength(0);
  });

  it('uses stricter condition for low confidence', () => {
    const pattern = makePattern({ confidence: 50 });
    const rules = generator.generate(makeExtraction([pattern]));

    // Low confidence = need 3 of them (ceil(6/2))
    expect(rules[0].ruleContent).toContain('3 of them');
  });

  it('uses relaxed condition for high confidence', () => {
    const pattern = makePattern({ confidence: 80 });
    const rules = generator.generate(makeExtraction([pattern]));

    expect(rules[0].ruleContent).toContain('2 of them');
  });

  it('sets draft status for low confidence rules', () => {
    const pattern = makePattern({ confidence: 50 });
    const rules = generator.generate(makeExtraction([pattern]));
    expect(rules[0].status).toBe('draft');
  });

  it('handles multiple patterns from one extraction', () => {
    const patterns = [
      makePattern({ attackType: 'XSS' }),
      makePattern({ attackType: 'SQLi' }),
    ];
    const rules = generator.generate(makeExtraction(patterns));
    expect(rules).toHaveLength(2);
    expect(rules[0].attackType).toBe('XSS');
    expect(rules[1].attackType).toBe('SQLi');
  });

  it('escapes special characters in meta strings', () => {
    const extraction = makeExtraction();
    extraction.reportTitle = 'Test "with quotes" and \\backslash';
    const rules = generator.generate(extraction);
    expect(rules[0].ruleContent).toContain('Test \\"with quotes\\" and \\\\backslash');
  });

  it('includes report URL in meta reference', () => {
    const rules = generator.generate(makeExtraction());
    expect(rules[0].ruleContent).toContain('reference = "https://hackerone.com/reports/2701701"');
    expect(rules[0].sourceReportUrl).toBe('https://hackerone.com/reports/2701701');
  });
});
