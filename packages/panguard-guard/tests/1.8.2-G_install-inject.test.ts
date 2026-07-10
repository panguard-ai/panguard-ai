/**
 * Regression tests for the install-script generator command-injection fix
 * (finding G_install-inject, 1.8.2 audit).
 *
 * The bug: generateInstallScript() charset-validated `licenseKey` at the
 * function boundary but NOT `dataDir`. `dataDir` was interpolated raw into the
 * bash `DATA_DIR="..."` assignment, the config JSON body, and the PowerShell
 * `$dataDir = "..."` string. The CLI's --data-dir filter rejects `..`, `;&|$`
 * and backtick but NOT the double-quote or newline character, so a value like
 *   x"<newline>touch /tmp/pwned<newline>"
 * closed the double-quoted assignment and injected a standalone command line —
 * with no forbidden character, fully bypassing the filter.
 *
 * These tests assert the injection can no longer recur: generateInstallScript
 * now fails CLOSED (throws) for any dataDir outside a safe path charset, and
 * safe paths are embedded via JSON.stringify in the config body.
 */

import { describe, it, expect } from 'vitest';
import { generateInstallScript } from '../src/install/index.js';

// The proof-of-concept payload from the finding: closes the double-quoted
// assignment and injects `touch /tmp/panguard_pwned` as its own command line.
const NEWLINE_INJECTION = 'x"\ntouch /tmp/panguard_pwned\n"';

describe('generateInstallScript dataDir command-injection guard', () => {
  it('throws (fail-closed) on the newline + quote breakout payload', () => {
    expect(() => generateInstallScript({ dataDir: NEWLINE_INJECTION })).toThrow(/dataDir/);
  });

  it('rejects a bare double-quote (the character the CLI filter misses)', () => {
    expect(() => generateInstallScript({ dataDir: 'safe"still' })).toThrow(/dataDir/);
  });

  it('rejects a single-quote (breaks single-quoted PowerShell / heredoc)', () => {
    expect(() => generateInstallScript({ dataDir: "safe'still" })).toThrow(/dataDir/);
  });

  it('rejects a raw newline on its own', () => {
    expect(() => generateInstallScript({ dataDir: 'safe\nrm -rf /' })).toThrow(/dataDir/);
  });

  it('rejects a carriage return', () => {
    expect(() => generateInstallScript({ dataDir: 'safe\rrm -rf /' })).toThrow(/dataDir/);
  });

  it('rejects a backtick', () => {
    expect(() => generateInstallScript({ dataDir: 'a`whoami`b' })).toThrow(/dataDir/);
  });

  it('rejects a command separator', () => {
    expect(() => generateInstallScript({ dataDir: 'a; rm -rf /' })).toThrow(/dataDir/);
    expect(() => generateInstallScript({ dataDir: 'a && curl evil' })).toThrow(/dataDir/);
    expect(() => generateInstallScript({ dataDir: 'a | sh' })).toThrow(/dataDir/);
  });

  it('accepts the legitimate POSIX default with $HOME expansion', () => {
    expect(() => generateInstallScript({ dataDir: '$HOME/.panguard-guard' })).not.toThrow();
  });

  it('accepts the legitimate Windows default with $env and backslash', () => {
    expect(() =>
      generateInstallScript({ dataDir: '$env:USERPROFILE\\.panguard-guard' })
    ).not.toThrow();
  });

  it('accepts a plausible absolute path with a drive letter and spaces', () => {
    expect(() => generateInstallScript({ dataDir: 'C:\\Program Files\\panguard' })).not.toThrow();
    expect(() => generateInstallScript({ dataDir: '/opt/panguard/data' })).not.toThrow();
    expect(() => generateInstallScript({ dataDir: '~/pg data' })).not.toThrow();
  });

  it('accepts omitting dataDir entirely (uses the built-in default)', () => {
    expect(() => generateInstallScript({})).not.toThrow();
  });
});

describe('generated script never contains an injected command line', () => {
  // The validation throw happens before the platform switch, so it holds on any
  // OS. When a safe dataDir IS embedded, prove the marker string never appears
  // on its own line in the output regardless of which platform branch ran.
  it('does not embed the injection marker for any generated platform', () => {
    // Guard threw, so nothing is generated — assert that explicitly.
    expect(() => generateInstallScript({ dataDir: NEWLINE_INJECTION })).toThrow();
  });

  it('embeds a safe path into the config JSON as a valid JSON string', () => {
    // On non-Windows this returns the bash script; the config JSON body must
    // contain the JSON-encoded path (quotes included), never a raw breakout.
    const script = generateInstallScript({ dataDir: '/opt/pg' });
    // JSON.stringify of the path is the honest encoding used in the config body.
    expect(script).toContain(JSON.stringify('/opt/pg'));
    // No standalone injected command line.
    expect(script).not.toMatch(/^touch \/tmp\/panguard_pwned$/m);
  });

  it('a backslash Windows path stays valid JSON in the config body (no raw \\ breakage)', () => {
    // Even a valid-charset path with a backslash must be JSON-escaped in the
    // config body; JSON.stringify handles this. This asserts we did not leave
    // the old raw `"${dataDir}"` interpolation that would produce invalid JSON.
    const win = 'C:\\pg';
    const script = generateInstallScript({ dataDir: win });
    // The config body must contain the properly escaped form ("C:\\pg").
    expect(script).toContain(JSON.stringify(win));
  });
});
