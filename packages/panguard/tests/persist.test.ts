/**
 * Reboot-persistence plist builder.
 *
 * The plist is the security-critical artifact: a wrong command or a missing
 * RunAtLoad/KeepAlive = protection silently does NOT come back after reboot.
 * These pin the exact shape against the proven-working installed service
 * (`pga guard --watch`, RunAtLoad + KeepAlive, user LaunchAgent). We test the
 * pure builder only — never launchctl — so the suite can't touch a real machine.
 */

import { describe, it, expect } from 'vitest';
import { buildGuardPlist } from '../src/cli/commands/persist.js';

describe('buildGuardPlist — matches the proven launchd service contract', () => {
  const plist = buildGuardPlist('/usr/local/bin/node', '/opt/homebrew/lib/node_modules/@panguard-ai/panguard/bin/panguard.cjs', '/Users/x/.panguard-guard');

  it('runs the proven command: <node> <script> guard --watch', () => {
    expect(plist).toContain('<string>/usr/local/bin/node</string>');
    expect(plist).toContain('<string>guard</string>');
    expect(plist).toContain('<string>--watch</string>');
    // ordering: node, script, guard, --watch
    const iNode = plist.indexOf('node</string>');
    const iGuard = plist.indexOf('<string>guard</string>');
    const iWatch = plist.indexOf('<string>--watch</string>');
    expect(iNode).toBeLessThan(iGuard);
    expect(iGuard).toBeLessThan(iWatch);
  });

  it('survives reboot + respawns: RunAtLoad and KeepAlive both true', () => {
    expect(plist).toMatch(/<key>RunAtLoad<\/key>\s*<true\/>/);
    expect(plist).toMatch(/<key>KeepAlive<\/key>\s*<true\/>/);
  });

  it('uses the canonical label so installs are idempotent with the existing service', () => {
    expect(plist).toContain('<string>com.panguard.panguard-guard</string>');
  });

  it('gives the daemon a usable PATH (launchd minimal env would starve npx/node)', () => {
    expect(plist).toContain('<key>PATH</key>');
    expect(plist).toContain('/usr/local/bin'); // dirname(node)
    expect(plist).toContain('/opt/homebrew/bin');
  });

  it('points logs into the data dir', () => {
    expect(plist).toContain('/Users/x/.panguard-guard/panguard-guard.log');
    expect(plist).toContain('/Users/x/.panguard-guard/panguard-guard-error.log');
  });

  it('escapes XML metacharacters in paths (no raw & < > breaking the plist)', () => {
    const p = buildGuardPlist('/usr/bin/node', '/tmp/a&b<c>/panguard.cjs', '/tmp/d');
    expect(p).toContain('/tmp/a&amp;b&lt;c&gt;/panguard.cjs');
    expect(p).not.toContain('a&b<c>');
  });

  it('is well-formed plist XML (single dict, balanced array)', () => {
    expect(plist.startsWith('<?xml')).toBe(true);
    expect((plist.match(/<array>/g) ?? []).length).toBe(1);
    expect((plist.match(/<\/array>/g) ?? []).length).toBe(1);
    expect(plist.trimEnd().endsWith('</plist>')).toBe(true);
  });
});
