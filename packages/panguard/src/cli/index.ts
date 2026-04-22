#!/usr/bin/env node
/**
 * Panguard AI - Unified CLI
 * Panguard AI - 統一命令列介面
 *
 * Single entry point for all Panguard security tools.
 * 所有 Panguard 資安工具的統一入口。
 *
 * @module @panguard-ai/panguard/cli
 */

import { Command } from 'commander';
import { PANGUARD_VERSION } from '../index.js';
import { scanCommand } from './commands/scan.js';
import { guardCommand } from './commands/guard.js';
import { reportCommand } from './commands/report.js';
import { chatCommand } from './commands/chat.js';
import { trapCommand } from './commands/trap.js';
import { threatCommand } from './commands/threat.js';
import { demoCommand } from './commands/demo.js';
import { initCommand } from './commands/init.js';
import { deployCommand } from './commands/deploy.js';
import { statusCommand } from './commands/status.js';
import { sensorCommand } from './commands/sensor.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
// Lazy-loaded: these depend on optional packages that may not be installed.
function lazyCommand(
  name: string,
  desc: string,
  modulePath: string,
  exportName: string
): () => Command {
  return () => {
    const cmd = new Command(name).description(desc);
    cmd.allowUnknownOption(true);
    cmd.action(async () => {
      try {
        const mod = await import(modulePath);
        const realCmd = mod[exportName]() as Command;
        await realCmd.parseAsync(process.argv);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  Error: ${msg}`);
        process.exitCode = 1;
      }
    });
    return cmd;
  };
}
const hardeningCommand = lazyCommand(
  'hardening',
  'Security hardening',
  './commands/hardening.js',
  'hardeningCommand'
);
import { upgradeCommand } from './commands/upgrade.js';
import { configCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';
import { auditCommand } from './commands/audit.js';
import { skillsCommand } from './commands/skills.js';
import { hacktivityCommand } from './commands/hacktivity.js';
import { setupCommand } from './commands/setup.js';
import { startInteractive } from './interactive.js';
import { upCommand } from './commands/up.js';

const program = new Command();

program
  .name('panguard')
  .description('Panguard AI - Security for AI Agents')
  .version(PANGUARD_VERSION);

// ── Core commands (shown in help) ──
program.addCommand(upCommand());
program.addCommand(setupCommand());
program.addCommand(auditCommand());
program.addCommand(skillsCommand());
program.addCommand(scanCommand());
program.addCommand(guardCommand());
program.addCommand(statusCommand());
program.addCommand(sensorCommand());
program.addCommand(upgradeCommand());

// ── Account / auth commands (shown in help) ──
program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(whoamiCommand());

// ── Secondary commands (shown in help) ──
program.addCommand(chatCommand());
program.addCommand(configCommand());
program.addCommand(doctorCommand());
// report is no longer a stub — surface it as a primary command now that
// the AI Compliance Audit Evidence generator is real (D1 Sprint 1).
program.addCommand(reportCommand());

// ── Advanced commands (hidden from help, still usable) ──
const hidden = { hidden: true };
program.addCommand(trapCommand().helpOption(false), hidden);
program.addCommand(threatCommand(), hidden);
program.addCommand(demoCommand(), hidden);
program.addCommand(initCommand(), hidden);
program.addCommand(deployCommand(), hidden);
program.addCommand(hardeningCommand(), hidden);
program.addCommand(hacktivityCommand(), hidden);

const userArgs = process.argv.slice(2);
const helpFlags = new Set(['-h', '--help', '-V', '--version']);
const hasSubcommand = userArgs.some((a) => !a.startsWith('-'));
const hasHelpOrVersion = userArgs.some((a) => helpFlags.has(a));

/**
 * Show "What's new" message once after upgrade.
 * Compares current version against ~/.panguard/.last-seen-version.
 * Only shown on interactive commands (no args, no --json).
 */
async function showWhatsNewIfUpgraded(): Promise<void> {
  const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');

  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.';
  const dir = join(home, '.panguard');
  const versionFile = join(dir, '.last-seen-version');

  // Read last seen version
  let lastSeen = '';
  try {
    if (existsSync(versionFile)) {
      lastSeen = readFileSync(versionFile, 'utf-8').trim();
    }
  } catch {
    // Non-critical
  }

  // Compare with current
  if (lastSeen === PANGUARD_VERSION) return;

  // Show what's new (only if upgrading, not first install)
  if (lastSeen !== '') {
    console.log(`\n  Panguard AI updated: ${lastSeen} \u2192 ${PANGUARD_VERSION}\n`);

    // Try to read CHANGELOG.md for current version's highlights
    try {
      const { fileURLToPath } = await import('node:url');
      const { dirname } = await import('node:path');
      const cliDir = dirname(fileURLToPath(import.meta.url));
      // CHANGELOG.md is at repo root, CLI is at packages/panguard/dist/cli/
      const changelogPaths = [
        join(cliDir, '..', '..', '..', '..', 'CHANGELOG.md'), // from dist
        join(cliDir, '..', '..', 'CHANGELOG.md'), // fallback
      ];
      let changelog = '';
      for (const p of changelogPaths) {
        if (existsSync(p)) {
          changelog = readFileSync(p, 'utf-8');
          break;
        }
      }
      if (changelog) {
        // Extract current version section
        const versionHeader = `## [${PANGUARD_VERSION}]`;
        const startIdx = changelog.indexOf(versionHeader);
        if (startIdx >= 0) {
          const afterHeader = changelog.indexOf('\n', startIdx) + 1;
          const nextVersion = changelog.indexOf('\n## [', afterHeader);
          const section = changelog.substring(
            afterHeader,
            nextVersion > 0 ? nextVersion : undefined
          );
          // Extract "### Added" and "### Fixed" bullet points (first 6 lines max)
          const bullets = section
            .split('\n')
            .filter((l: string) => l.startsWith('- **'))
            .slice(0, 6)
            .map((l: string) => {
              const match = l.match(/^- \*\*(.+?)\*\*\.?\s*(.*)$/);
              if (!match) return l;
              const title = (match[1] ?? '').replace(/\.$/, '');
              const desc = match[2] ?? '';
              return desc ? `  - ${title} -- ${desc}` : `  - ${title}`;
            });
          if (bullets.length > 0) {
            console.log("  What's new:");
            for (const b of bullets) {
              console.log(`  ${b}`);
            }
            console.log('');
          }
        }
      }
    } catch {
      // CHANGELOG read failed — show simple message
      console.log(`  Run "pg --help" to see new commands.\n`);
    }
  }

  // Write current version
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(versionFile, PANGUARD_VERSION, 'utf-8');
  } catch {
    // Non-critical
  }
}

/**
 * Check npm for a newer version of Panguard CLI.
 * Non-blocking, max once per 24 hours, best-effort.
 */
async function checkForUpdates(): Promise<void> {
  const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');

  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.';
  const dir = join(home, '.panguard');
  const checkFile = join(dir, '.last-update-check');

  // Only check once per 24 hours
  try {
    if (existsSync(checkFile)) {
      const lastCheck = parseInt(readFileSync(checkFile, 'utf-8').trim(), 10);
      if (Date.now() - lastCheck < 24 * 60 * 60 * 1000) return;
    }
  } catch {
    // Non-critical
  }

  // Write timestamp immediately to avoid duplicate checks
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(checkFile, String(Date.now()), 'utf-8');
  } catch {
    // Non-critical
  }

  try {
    const res = await fetch('https://registry.npmjs.org/@panguard-ai/panguard/latest', {
      signal: AbortSignal.timeout(3_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { version?: string };
    const latest = data.version;
    if (!latest || latest === PANGUARD_VERSION) return;

    // Simple semver comparison: split on dots, compare numerically
    const cur = PANGUARD_VERSION.split('.').map(Number);
    const lat = latest.split('.').map(Number);
    const isNewer =
      (lat[0] ?? 0) > (cur[0] ?? 0) ||
      ((lat[0] ?? 0) === (cur[0] ?? 0) && (lat[1] ?? 0) > (cur[1] ?? 0)) ||
      ((lat[0] ?? 0) === (cur[0] ?? 0) &&
        (lat[1] ?? 0) === (cur[1] ?? 0) &&
        (lat[2] ?? 0) > (cur[2] ?? 0));

    if (isNewer) {
      console.log(
        `\n  Update available: ${PANGUARD_VERSION} \u2192 ${latest}` + `\n  Run: pga upgrade\n`
      );
    }
  } catch {
    // Network failure — silently skip
  }
}

async function main(): Promise<void> {
  // Show "what's new" on interactive use (not --json, not --help)
  const isJsonMode = userArgs.includes('--json');
  if (!hasHelpOrVersion && !isJsonMode) {
    await showWhatsNewIfUpgraded();
    // Non-blocking update check (fire and forget on non-JSON interactive use)
    void checkForUpdates();
  }

  if (!hasSubcommand && !hasHelpOrVersion) {
    // First-run detection: if no config exists, auto-run setup wizard
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const configPath = join(
      process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
      '.panguard',
      'config.json'
    );
    const isFirstRun = !existsSync(configPath);

    if (isFirstRun) {
      // First time user — run setup wizard directly
      console.log('\n  Welcome to Panguard AI! / Panguard AI!\n');
      console.log('  First time detected. Starting setup wizard...\n');
      await program.parseAsync(['node', 'panguard', 'setup']);
      return;
    }

    // Extract --lang value if present
    const langIdx = userArgs.indexOf('--lang');
    const lang = langIdx >= 0 ? userArgs[langIdx + 1] : undefined;
    await startInteractive(lang);
  } else {
    await program.parseAsync();
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
