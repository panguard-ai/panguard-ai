/**
 * Trust-root test (S1): network-delivered detection rules must be publisher-signed
 * before the engine will load them. Detection rules are executable trust (regex →
 * ReDoS, auto-block → destructive response), so cloud rule sync fails CLOSED:
 * no provisioned key, no signature, or a tampered body → rejected.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { generateKeyPairSync, sign as edSign } from 'node:crypto';
import { verifyCloudRuleSignature } from '../src/rule-loader.js';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUB_PEM = publicKey.export({ type: 'spki', format: 'pem' }) as string;

function signRule(content: string): string {
  return edSign(null, Buffer.from(content, 'utf-8'), privateKey).toString('base64');
}

describe('verifyCloudRuleSignature — cloud rule trust root', () => {
  afterEach(() => {
    delete process.env['PANGUARD_RULE_PUBKEY'];
  });

  it('fails closed when no publisher key is provisioned (default)', () => {
    delete process.env['PANGUARD_RULE_PUBKEY'];
    const content = '{"id":"ATR-X","title":"t"}';
    expect(verifyCloudRuleSignature({ ruleContent: content, signature: signRule(content) })).toBe(
      false
    );
  });

  it('accepts a rule correctly signed by the provisioned publisher key', () => {
    process.env['PANGUARD_RULE_PUBKEY'] = PUB_PEM;
    const content = '{"id":"ATR-X","title":"t","detection":{}}';
    expect(verifyCloudRuleSignature({ ruleContent: content, signature: signRule(content) })).toBe(
      true
    );
  });

  it('rejects a rule whose body was tampered after signing', () => {
    process.env['PANGUARD_RULE_PUBKEY'] = PUB_PEM;
    const sig = signRule('{"id":"ATR-X","title":"original"}');
    expect(
      verifyCloudRuleSignature({ ruleContent: '{"id":"ATR-X","title":"TAMPERED"}', signature: sig })
    ).toBe(false);
  });

  it('rejects an unsigned rule even when a key is provisioned', () => {
    process.env['PANGUARD_RULE_PUBKEY'] = PUB_PEM;
    expect(verifyCloudRuleSignature({ ruleContent: '{"id":"ATR-X"}' })).toBe(false);
  });

  it('rejects a rule signed by the WRONG key', () => {
    process.env['PANGUARD_RULE_PUBKEY'] = PUB_PEM;
    const other = generateKeyPairSync('ed25519').privateKey;
    const content = '{"id":"ATR-X"}';
    const wrongSig = edSign(null, Buffer.from(content, 'utf-8'), other).toString('base64');
    expect(verifyCloudRuleSignature({ ruleContent: content, signature: wrongSig })).toBe(false);
  });
});
