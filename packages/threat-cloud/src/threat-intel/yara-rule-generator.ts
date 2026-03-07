/**
 * YARA Rule Generator from Extracted Attack Patterns
 * 從萃取的攻擊模式生成 YARA 偵測規則
 *
 * Generates YARA rules for file/memory scanning to detect exploit payloads,
 * webshells, and malicious patterns. Complements Sigma rules (log-based).
 *
 * @module @panguard-ai/threat-cloud/threat-intel/yara-rule-generator
 */

import { randomUUID } from 'node:crypto';
import type { ExtractedAttackPattern, ExtractionResult, GeneratedYaraRule } from './types.js';

/** Attack type → YARA string definitions */
const YARA_STRINGS: Record<string, Array<{ name: string; value: string; type: 'text' | 'hex' | 'regex' }>> = {
  'Code Injection': [
    { name: 'eval_call', value: 'eval(', type: 'text' },
    { name: 'exec_call', value: 'exec(', type: 'text' },
    { name: 'system_call', value: 'system(', type: 'text' },
    { name: 'spawn_call', value: 'spawn(', type: 'text' },
    { name: 'runtime_exec', value: 'Runtime.getRuntime()', type: 'text' },
    { name: 'python_import', value: '__import__', type: 'text' },
  ],
  'Command Injection': [
    { name: 'cmd_pipe', value: '/bin/sh -c', type: 'text' },
    { name: 'cmd_bash', value: '/bin/bash -c', type: 'text' },
    { name: 'cmd_powershell', value: 'powershell.exe', type: 'text' },
    { name: 'cmd_exec', value: 'cmd.exe /c', type: 'text' },
    { name: 'backtick_exec', value: /`[^`]{2,40}`/.source, type: 'regex' },
  ],
  'XSS': [
    { name: 'script_tag', value: '<script', type: 'text' },
    { name: 'javascript_proto', value: 'javascript:', type: 'text' },
    { name: 'onerror_handler', value: 'onerror=', type: 'text' },
    { name: 'onload_handler', value: 'onload=', type: 'text' },
    { name: 'document_cookie', value: 'document.cookie', type: 'text' },
    { name: 'svg_tag', value: '<svg/onload=', type: 'text' },
  ],
  'SQLi': [
    { name: 'union_select', value: 'UNION SELECT', type: 'text' },
    { name: 'or_true', value: "' OR '1'='1", type: 'text' },
    { name: 'comment_dash', value: "1=1--", type: 'text' },
    { name: 'sleep_func', value: 'SLEEP(', type: 'text' },
    { name: 'benchmark_func', value: 'BENCHMARK(', type: 'text' },
    { name: 'waitfor_delay', value: 'WAITFOR DELAY', type: 'text' },
  ],
  'Path Traversal': [
    { name: 'dot_dot_slash', value: '../', type: 'text' },
    { name: 'encoded_traversal', value: '%2e%2e%2f', type: 'text' },
    { name: 'double_encoded', value: '..%252f', type: 'text' },
    { name: 'etc_passwd', value: '/etc/passwd', type: 'text' },
    { name: 'etc_shadow', value: '/etc/shadow', type: 'text' },
    { name: 'null_byte', value: '%00', type: 'text' },
  ],
  'XXE': [
    { name: 'entity_decl', value: '<!ENTITY', type: 'text' },
    { name: 'doctype_decl', value: '<!DOCTYPE', type: 'text' },
    { name: 'system_file', value: 'SYSTEM "file:', type: 'text' },
    { name: 'system_http', value: 'SYSTEM "http:', type: 'text' },
    { name: 'parameter_entity', value: /<!ENTITY\s+%\s+\w+/.source, type: 'regex' },
  ],
  'SSRF': [
    { name: 'localhost', value: '127.0.0.1', type: 'text' },
    { name: 'metadata_aws', value: '169.254.169.254', type: 'text' },
    { name: 'metadata_gcp', value: 'metadata.google.internal', type: 'text' },
    { name: 'internal_10', value: '10.0.0.', type: 'text' },
    { name: 'internal_172', value: '172.16.', type: 'text' },
    { name: 'internal_192', value: '192.168.', type: 'text' },
  ],
  'Deserialization': [
    { name: 'java_serial', value: 'aced0005', type: 'hex' },
    { name: 'java_base64', value: 'rO0AB', type: 'text' },
    { name: 'php_serial', value: /O:\d+:"/.source, type: 'regex' },
    { name: 'python_pickle', value: '__reduce__', type: 'text' },
    { name: 'pickle_loads', value: 'pickle.loads', type: 'text' },
  ],
  'File Upload': [
    { name: 'php_tag', value: '<?php', type: 'text' },
    { name: 'php_short', value: '<?=', type: 'text' },
    { name: 'jsp_tag', value: '<%@', type: 'text' },
    { name: 'asp_tag', value: '<%eval', type: 'text' },
    { name: 'webshell_passthru', value: 'passthru(', type: 'text' },
    { name: 'webshell_shell_exec', value: 'shell_exec(', type: 'text' },
  ],
  'Auth Bypass': [
    { name: 'forwarded_for', value: 'X-Forwarded-For:', type: 'text' },
    { name: 'original_url', value: 'X-Original-URL:', type: 'text' },
    { name: 'rewrite_url', value: 'X-Rewrite-URL:', type: 'text' },
    { name: 'admin_path', value: '/admin/', type: 'text' },
    { name: 'internal_path', value: '/internal/', type: 'text' },
  ],
  'Information Disclosure': [
    { name: 'env_file', value: '.env', type: 'text' },
    { name: 'git_dir', value: '.git/config', type: 'text' },
    { name: 'phpinfo', value: 'phpinfo()', type: 'text' },
    { name: 'actuator', value: '/actuator/', type: 'text' },
    { name: 'debug_endpoint', value: '/debug/', type: 'text' },
  ],
};

/** Attack type → YARA meta description */
const ATTACK_DESCRIPTIONS: Record<string, string> = {
  'Code Injection': 'Detects code injection payloads in files or network captures',
  'Command Injection': 'Detects OS command injection patterns',
  'XSS': 'Detects cross-site scripting payloads',
  'SQLi': 'Detects SQL injection attack patterns',
  'Path Traversal': 'Detects directory traversal attack patterns',
  'XXE': 'Detects XML External Entity injection payloads',
  'SSRF': 'Detects SSRF payload patterns targeting internal networks',
  'Deserialization': 'Detects insecure deserialization payloads (Java, PHP, Python)',
  'File Upload': 'Detects malicious file upload payloads and webshells',
  'Auth Bypass': 'Detects authentication bypass header manipulation',
  'Information Disclosure': 'Detects information disclosure patterns',
};

export class YaraRuleGenerator {
  /**
   * Generate YARA rules from an extraction result.
   * Each pattern with known signatures produces one rule.
   */
  generate(extraction: ExtractionResult): GeneratedYaraRule[] {
    return extraction.patterns
      .filter((p) => this.hasYaraStrings(p))
      .map((pattern) => this.patternToRule(pattern, extraction));
  }

  /** Check if we have YARA strings for this attack type */
  private hasYaraStrings(pattern: ExtractedAttackPattern): boolean {
    return YARA_STRINGS[pattern.attackType] !== undefined;
  }

  /** Convert a single extracted pattern to a YARA rule */
  private patternToRule(
    pattern: ExtractedAttackPattern,
    extraction: ExtractionResult
  ): GeneratedYaraRule {
    const safeName = this.toRuleName(pattern.attackType, extraction.reportId);
    const status = pattern.confidence >= 70 ? 'experimental' : 'draft';
    const ruleContent = this.buildRule(safeName, pattern, extraction);

    return {
      id: safeName,
      ruleContent,
      sourceReportId: extraction.reportId,
      sourceReportUrl: extraction.reportUrl,
      attackType: pattern.attackType,
      confidence: pattern.confidence,
      status,
      generatedAt: new Date().toISOString(),
      reviewed: false,
      reviewDecision: 'pending',
    };
  }

  /** Build a YARA rule name from attack type and report ID */
  private toRuleName(attackType: string, reportId: string): string {
    const safe = attackType
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const shortId = reportId.slice(0, 8);
    return `panguard_${safe}_${shortId}`;
  }

  /** Build the full YARA rule content */
  private buildRule(
    ruleName: string,
    pattern: ExtractedAttackPattern,
    extraction: ExtractionResult
  ): string {
    const lines: string[] = [];
    const strings = YARA_STRINGS[pattern.attackType] ?? [];
    const description = ATTACK_DESCRIPTIONS[pattern.attackType] ?? `Detects ${pattern.attackType} attack patterns`;
    const date = new Date().toISOString().slice(0, 10);

    // Rule header
    lines.push(`rule ${ruleName}`);
    lines.push('{');

    // Meta section
    lines.push('    meta:');
    lines.push(`        description = "${this.escapeYaraString(description)}"`);
    lines.push(`        author = "Panguard Threat Intel (auto-generated)"`);
    lines.push(`        date = "${date}"`);
    lines.push(`        reference = "${extraction.reportUrl}"`);
    lines.push(`        report_title = "${this.escapeYaraString(extraction.reportTitle)}"`);
    lines.push(`        confidence = ${pattern.confidence}`);
    if (pattern.cweIds.length > 0) {
      lines.push(`        cwe = "${pattern.cweIds.join(', ')}"`);
    }
    if (pattern.mitreTechniques.length > 0) {
      lines.push(`        mitre = "${pattern.mitreTechniques.join(', ')}"`);
    }

    // Strings section
    lines.push('');
    lines.push('    strings:');
    for (const s of strings) {
      if (s.type === 'hex') {
        lines.push(`        $${s.name} = { ${this.formatHex(s.value)} }`);
      } else if (s.type === 'regex') {
        lines.push(`        $${s.name} = /${s.value}/ nocase`);
      } else {
        lines.push(`        $${s.name} = "${this.escapeYaraString(s.value)}" nocase`);
      }
    }

    // Condition section
    lines.push('');
    lines.push('    condition:');
    lines.push(`        ${this.buildCondition(pattern, strings.length)}`);

    lines.push('}');

    return lines.join('\n');
  }

  /** Build the condition expression */
  private buildCondition(pattern: ExtractedAttackPattern, stringCount: number): string {
    // High confidence: require fewer matches; low confidence: more matches
    if (stringCount <= 2) {
      return 'any of them';
    }

    if (pattern.confidence >= 70) {
      return '2 of them';
    }

    // Lower confidence → require more matches to reduce false positives
    const threshold = Math.min(3, Math.ceil(stringCount / 2));
    return `${threshold} of them`;
  }

  /** Escape special characters in YARA strings */
  private escapeYaraString(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  }

  /** Format hex string for YARA (space-separated byte pairs) */
  private formatHex(hex: string): string {
    const clean = hex.replace(/\s/g, '').toLowerCase();
    const pairs: string[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      pairs.push(clean.slice(i, i + 2));
    }
    return pairs.join(' ');
  }
}
