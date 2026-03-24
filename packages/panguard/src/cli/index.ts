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
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { serveCommand } from './commands/serve.js';
import { adminCommand } from './commands/admin.js';
import { hardeningCommand } from './commands/hardening.js';
import { managerCommand } from './commands/manager.js';
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
  .description('Panguard AI - Security for AI Agents / AI Agent 資安防護')
  .version(PANGUARD_VERSION);

// ── Core commands (shown in help) ──
program.addCommand(upCommand());
program.addCommand(setupCommand());
program.addCommand(auditCommand());
program.addCommand(skillsCommand());
program.addCommand(scanCommand());
program.addCommand(guardCommand());
program.addCommand(statusCommand());
program.addCommand(upgradeCommand());

// ── Secondary commands (shown in help) ──
program.addCommand(chatCommand());
program.addCommand(configCommand());
program.addCommand(doctorCommand());

// ── Advanced commands (hidden from help, still usable) ──
const hidden = { hidden: true };
program.addCommand(reportCommand().helpOption(false), hidden);
program.addCommand(trapCommand().helpOption(false), hidden);
program.addCommand(threatCommand(), hidden);
program.addCommand(demoCommand(), hidden);
program.addCommand(initCommand(), hidden);
program.addCommand(deployCommand(), hidden);
program.addCommand(loginCommand(), hidden);
program.addCommand(logoutCommand(), hidden);
program.addCommand(whoamiCommand(), hidden);
program.addCommand(serveCommand(), hidden);
program.addCommand(adminCommand(), hidden);
program.addCommand(hardeningCommand(), hidden);
program.addCommand(managerCommand(), hidden);
program.addCommand(hacktivityCommand(), hidden);

const userArgs = process.argv.slice(2);
const helpFlags = new Set(['-h', '--help', '-V', '--version']);
const hasSubcommand = userArgs.some((a) => !a.startsWith('-'));
const hasHelpOrVersion = userArgs.some((a) => helpFlags.has(a));

async function main(): Promise<void> {
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
