/**
 * Sigma Rule Generator from Extracted Attack Patterns
 * 從萃取的攻擊模式生成 Sigma 偵測規則
 *
 * Converts extracted attack patterns into valid Sigma YAML rules
 * with proper MITRE ATT&CK tagging and detection logic.
 *
 * @module @panguard-ai/threat-cloud/threat-intel/sigma-rule-generator
 */

import { randomUUID } from 'node:crypto';
import type { ExtractedAttackPattern, ExtractionResult, GeneratedRule } from './types.js';

/** MITRE technique ID → tactic name for Sigma tags */
const TECHNIQUE_TACTIC: Record<string, string> = {
  T1190: 'initial_access',
  T1059: 'execution',
  'T1059.001': 'execution',
  'T1059.007': 'execution',
  T1068: 'privilege_escalation',
  T1071: 'command_and_control',
  T1078: 'defense_evasion',
  T1082: 'discovery',
  T1083: 'discovery',
  T1105: 'command_and_control',
  T1185: 'collection',
  T1499: 'impact',
  'T1566.002': 'initial_access',
};

/** Severity mapping from report severity to Sigma level */
const SEVERITY_TO_LEVEL: Record<string, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  none: 'informational',
};

export class SigmaRuleGenerator {
  /**
   * Generate Sigma rules from an extraction result.
   * Each pattern produces one rule.
   */
  generate(extraction: ExtractionResult): GeneratedRule[] {
    return extraction.patterns
      .filter((p) => p.payloadSignatures.length > 0 || p.endpointPatterns.length > 0)
      .map((pattern) => this.patternToRule(pattern, extraction));
  }

  /** Convert a single extracted pattern to a GeneratedRule */
  private patternToRule(
    pattern: ExtractedAttackPattern,
    extraction: ExtractionResult
  ): GeneratedRule {
    const ruleId = randomUUID();
    const status = pattern.confidence >= 70 ? 'experimental' : 'draft';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');

    // Extract CVE IDs from the report title for per-report uniqueness
    const cveIds = this.extractCveIds(extraction.reportTitle);

    const yamlContent = this.buildYaml(ruleId, pattern, extraction, date, cveIds);

    return {
      id: ruleId,
      yamlContent,
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

  /** Extract CVE IDs from a string (e.g. report title or description) */
  private extractCveIds(text: string): string[] {
    const matches = text.match(/CVE-\d{4}-\d{4,}/g);
    if (!matches) return [];
    return [...new Set(matches)];
  }

  /** Build the YAML content for a Sigma rule */
  private buildYaml(
    ruleId: string,
    pattern: ExtractedAttackPattern,
    extraction: ExtractionResult,
    date: string,
    cveIds: string[] = []
  ): string {
    const lines: string[] = [];

    // Header — include report ID and CVE in title for per-report uniqueness
    const title = this.buildTitle(pattern, extraction.reportId, cveIds);
    lines.push(`title: ${this.escapeYaml(title)}`);
    lines.push(`id: ${ruleId}`);
    lines.push(`status: experimental`);
    lines.push('description: |');
    lines.push(`  ${this.escapeYaml(pattern.description)}`);
    if (cveIds.length > 0) {
      lines.push(`  Related vulnerabilities: ${cveIds.join(', ')}`);
    }
    lines.push(`  Source report: ${extraction.reportTitle} (${extraction.reportId})`);
    lines.push(`  Auto-generated from HackerOne report analysis.`);

    // References — include report URL and any CVE references
    lines.push('references:');
    lines.push(`  - ${extraction.reportUrl}`);
    for (const cve of cveIds) {
      lines.push(`  - https://nvd.nist.gov/vuln/detail/${cve}`);
    }

    // Author & date
    lines.push('author: Panguard Threat Intel (auto-generated)');
    lines.push(`date: ${date}`);

    // Tags — include CVE tags for uniqueness
    const tags = this.buildTags(pattern, cveIds);
    if (tags.length > 0) {
      lines.push('tags:');
      for (const tag of tags) {
        lines.push(`  - ${tag}`);
      }
    }

    // Log source
    lines.push('logsource:');
    lines.push(`  category: ${pattern.logSourceCategory}`);
    if (pattern.logSourceProduct !== 'any') {
      lines.push(`  product: ${pattern.logSourceProduct}`);
    }

    // Detection
    const detection = this.buildDetection(pattern);
    lines.push('detection:');
    lines.push(detection);

    // False positives
    lines.push('falsepositives:');
    lines.push('  - Legitimate internal API calls');
    lines.push('  - Development/testing environments');

    // Level
    const level = this.inferLevel(pattern);
    lines.push(`level: ${level}`);

    return lines.join('\n');
  }

  /** Build a descriptive title, including report ID and CVE for uniqueness */
  private buildTitle(
    pattern: ExtractedAttackPattern,
    reportId: string,
    cveIds: string[] = []
  ): string {
    let base: string;
    switch (pattern.attackType) {
      case 'SSRF':
        base = 'Potential SSRF via Internal Network Access';
        break;
      case 'XSS':
        base = 'Potential Cross-Site Scripting (XSS) Attempt';
        break;
      case 'SQLi':
        base = 'Potential SQL Injection Attempt';
        break;
      case 'Command Injection':
        base = 'Potential OS Command Injection';
        break;
      case 'Path Traversal':
        base = 'Potential Directory/Path Traversal Attempt';
        break;
      case 'XXE':
        base = 'Potential XML External Entity (XXE) Injection';
        break;
      case 'IDOR':
        base = 'Potential Insecure Direct Object Reference';
        break;
      case 'CSRF':
        base = 'Potential Cross-Site Request Forgery';
        break;
      case 'File Upload':
        base = 'Potential Malicious File Upload Attempt';
        break;
      case 'Open Redirect':
        base = 'Potential Open Redirect Attempt';
        break;
      case 'Auth Bypass':
        base = 'Potential Authentication Bypass Attempt';
        break;
      case 'Deserialization':
        base = 'Potential Insecure Deserialization Attack';
        break;
      case 'Privilege Escalation':
        base = 'Potential Privilege Escalation Attempt';
        break;
      default:
        base = `Potential ${pattern.attackType} Attack`;
        break;
    }

    // Append CVE or report ID suffix to differentiate rules for different reports
    const suffix = cveIds.length > 0
      ? ` (${cveIds[0]})`
      : ` [Report ${reportId}]`;
    return `${base}${suffix}`;
  }

  /** Build MITRE ATT&CK tags, including CVE tags for per-report uniqueness */
  private buildTags(pattern: ExtractedAttackPattern, cveIds: string[] = []): string[] {
    const tags: string[] = [];
    const addedTactics = new Set<string>();

    for (const technique of pattern.mitreTechniques) {
      const tactic = TECHNIQUE_TACTIC[technique];
      if (tactic && !addedTactics.has(tactic)) {
        tags.push(`attack.${tactic}`);
        addedTactics.add(tactic);
      }
      tags.push(`attack.${technique.toLowerCase()}`);
    }

    for (const cwe of pattern.cweIds) {
      const num = cwe.replace(/\D/g, '');
      if (num) tags.push(`cwe.${num}`);
    }

    // Add CVE tags for per-vulnerability uniqueness
    for (const cve of cveIds) {
      tags.push(`cve.${cve.toLowerCase()}`);
    }

    return tags;
  }

  /** Build detection block based on attack type */
  private buildDetection(pattern: ExtractedAttackPattern): string {
    const lines: string[] = [];

    if (pattern.attackType === 'SSRF' || pattern.attackType === 'Open Redirect') {
      // URI query/body contains internal IPs or redirect targets
      lines.push('  selection:');
      lines.push('    cs-uri-query|contains:');
      for (const sig of pattern.payloadSignatures) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      if (pattern.endpointPatterns.length > 0) {
        lines.push('  filter_endpoint:');
        lines.push('    cs-uri-stem|contains:');
        for (const ep of pattern.endpointPatterns) {
          lines.push(`      - '${this.escapeYamlValue(ep)}'`);
        }
        lines.push('  condition: selection and filter_endpoint');
      } else {
        lines.push('  condition: selection');
      }
    } else if (pattern.attackType === 'XSS') {
      lines.push('  selection_query:');
      lines.push('    cs-uri-query|contains:');
      for (const sig of pattern.payloadSignatures.slice(0, 6)) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  selection_body:');
      lines.push('    cs-body|contains:');
      for (const sig of pattern.payloadSignatures.slice(0, 6)) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  condition: selection_query or selection_body');
    } else if (pattern.attackType === 'SQLi') {
      lines.push('  selection:');
      lines.push('    cs-uri-query|contains:');
      for (const sig of pattern.payloadSignatures) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  condition: selection');
    } else if (pattern.attackType === 'Path Traversal') {
      lines.push('  selection:');
      lines.push('    cs-uri|contains:');
      for (const sig of pattern.payloadSignatures) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  condition: selection');
    } else if (pattern.attackType === 'Command Injection') {
      lines.push('  selection:');
      lines.push('    cs-uri-query|contains:');
      for (const sig of pattern.payloadSignatures) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  condition: selection');
    } else if (pattern.attackType === 'XXE') {
      lines.push('  selection:');
      lines.push('    cs-body|contains:');
      for (const sig of pattern.payloadSignatures) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  condition: selection');
    } else if (pattern.attackType === 'File Upload') {
      lines.push('  selection_method:');
      lines.push("    cs-method: 'POST'");
      lines.push('  selection_ext:');
      lines.push('    cs-uri|endswith:');
      for (const sig of pattern.payloadSignatures) {
        lines.push(`      - '${this.escapeYamlValue(sig)}'`);
      }
      lines.push('  condition: selection_method and selection_ext');
    } else {
      // Generic: payload signatures in URI query
      if (pattern.payloadSignatures.length > 0) {
        lines.push('  selection:');
        lines.push('    cs-uri-query|contains:');
        for (const sig of pattern.payloadSignatures) {
          lines.push(`      - '${this.escapeYamlValue(sig)}'`);
        }
        lines.push('  condition: selection');
      } else if (pattern.endpointPatterns.length > 0) {
        lines.push('  selection:');
        lines.push('    cs-uri-stem|contains:');
        for (const ep of pattern.endpointPatterns) {
          lines.push(`      - '${this.escapeYamlValue(ep)}'`);
        }
        lines.push('  condition: selection');
      } else {
        lines.push('  selection:');
        lines.push("    cs-uri-query|contains: '*'");
        lines.push('  condition: selection');
      }
    }

    return lines.join('\n');
  }

  /** Infer Sigma level from pattern confidence and attack type */
  private inferLevel(pattern: ExtractedAttackPattern): string {
    if (pattern.confidence >= 80) return 'high';
    if (pattern.confidence >= 60) return 'medium';
    return 'low';
  }

  /** Escape YAML special characters in values */
  private escapeYaml(value: string): string {
    if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.startsWith("'") || value.startsWith('"')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  /** Escape a value for use inside single-quoted YAML string */
  private escapeYamlValue(value: string): string {
    return value.replace(/'/g, "''");
  }
}
