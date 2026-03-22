/**
 * Hardcoded secret detection.
 *
 * Detects exposed API keys, tokens, and private keys in skill content.
 */

import type { Finding, CheckResult } from './types.js';

interface SecretPattern {
  readonly id: string;
  readonly pattern: RegExp;
  readonly title: string;
}

const SECRET_PATTERNS: readonly SecretPattern[] = [
  { id: 'secret-aws', pattern: /AKIA[0-9A-Z]{16}/, title: 'AWS Access Key exposed' },
  { id: 'secret-github', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/, title: 'GitHub token exposed' },
  { id: 'secret-sk', pattern: /sk-[A-Za-z0-9]{20,}/, title: 'API secret key exposed' },
  {
    id: 'secret-private-key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    title: 'Private key exposed',
  },
];

/**
 * Scan content for hardcoded secrets.
 *
 * @returns Findings for each detected secret type + a check summary.
 */
export function detectSecrets(content: string): {
  findings: Finding[];
  check: CheckResult;
} {
  const findings: Finding[] = [];

  for (const p of SECRET_PATTERNS) {
    if (p.pattern.test(content)) {
      findings.push({
        id: p.id,
        title: p.title,
        description: 'Hardcoded secret found in content',
        severity: 'critical',
        category: 'secrets',
      });
    }
  }

  return {
    findings,
    check: {
      status: findings.length > 0 ? 'fail' : 'pass',
      label: findings.length > 0 ? `Secrets: ${findings.length} exposed` : 'Secrets: none found',
    },
  };
}
