/**
 * CLI smoke tests.
 * Spawns the built dist/cli.js via child_process to verify observable
 * CLI behaviour: exit codes, stdout/stderr, and file output.
 *
 * Requires dist/cli.js to be built (pnpm build). Tests skip gracefully if
 * the binary is absent so CI doesn't hard-fail on a clean checkout.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Resolve the CLI path (dist must be built)
// ---------------------------------------------------------------------------

const CLI = new URL('../dist/cli.js', import.meta.url).pathname;

function runCli(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 15_000,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ---------------------------------------------------------------------------
// Minimal valid Sigma rule YAML (string literal — no fixture files)
// ---------------------------------------------------------------------------

const SIGMA_YAML = `
title: CLI Smoke Test Rule
id: dddddddd-0000-0000-0000-000000000001
status: experimental
description: CLI smoke test — do not use in production
level: medium
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains: smoke-test-payload
  condition: selection
`.trimStart();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cli-smoke', () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      console.warn(`[cli-smoke] dist/cli.js not found at ${CLI} — tests will be skipped`);
    }
  });

  it('panguard-migrate --help prints usage and exits 0', () => {
    if (!existsSync(CLI)) return;

    const { exitCode, stdout, stderr } = runCli(['--help']);
    expect(exitCode).toBe(0);
    // Commander writes help to stdout
    const output = stdout + stderr;
    expect(output).toMatch(/panguard-migrate/i);
    expect(output).toMatch(/input/i);
    expect(output).toMatch(/output/i);
  });

  it('panguard-migrate --input <dir> --output <dir> converts a Sigma file and produces output', () => {
    if (!existsSync(CLI)) return;

    // Set up temp dirs: one for input, one for output
    const inputDir = mkdtempSync(join(tmpdir(), 'atr-cli-in-'));
    const outputDir = mkdtempSync(join(tmpdir(), 'atr-cli-out-'));
    writeFileSync(join(inputDir, 'smoke-rule.yml'), SIGMA_YAML, 'utf-8');

    const { exitCode, stderr } = runCli(['--input', inputDir, '--output', outputDir]);

    expect(exitCode).toBe(0);
    // CLI logs to stderr with [migrate] prefix
    expect(stderr).toContain('[migrate]');
    expect(stderr).toMatch(/converted.*1|1.*converted/i);

    // At least one .yaml file must be produced in the output dir
    const produced = readdirSync(outputDir).filter((f) => f.endsWith('.yaml'));
    expect(produced.length).toBeGreaterThan(0);

    // Output filename should encode the ATR id
    expect(produced[0]).toMatch(/^ATR-\d{4}-\d{5}/);
  });

  it('panguard-migrate --input <single-file> --output <file-in-missing-parent-dir> creates the parent dir and writes output', () => {
    if (!existsSync(CLI)) return;

    // Single-file input flow: output path's parent directory does not exist yet.
    // The CLI must mkdir -p the parent before writeFile, otherwise ENOENT.
    const inputDir = mkdtempSync(join(tmpdir(), 'atr-cli-single-in-'));
    const inputFile = join(inputDir, 'single-rule.yml');
    writeFileSync(inputFile, SIGMA_YAML, 'utf-8');

    // Build an output path whose parent dir does NOT yet exist.
    const outputBase = mkdtempSync(join(tmpdir(), 'atr-cli-single-out-'));
    const missingParent = join(outputBase, 'does', 'not', 'exist', 'yet');
    const outputFile = join(missingParent, 'rule.yaml');
    expect(existsSync(missingParent)).toBe(false);

    const { exitCode, stderr } = runCli(['--input', inputFile, '--output', outputFile]);

    expect(exitCode).toBe(0);
    expect(stderr).toContain('[migrate]');
    expect(stderr).toMatch(/converted.*1|1.*converted/i);
    // The output file should now exist and parent dirs must have been created.
    expect(existsSync(outputFile)).toBe(true);
    const produced = readdirSync(missingParent);
    expect(produced).toContain('rule.yaml');
  });

  it('panguard-migrate --input <nonexistent-path> exits non-zero with error on stderr', () => {
    if (!existsSync(CLI)) return;

    const { exitCode, stderr, stdout } = runCli([
      '--input',
      '/nonexistent/path/that/does/not/exist.yml',
      '--output',
      '/tmp/atr-out-nowhere',
    ]);

    expect(exitCode).not.toBe(0);
    const combinedOutput = stderr + stdout;
    expect(combinedOutput.toLowerCase()).toMatch(/error|not found/);
  });
});
