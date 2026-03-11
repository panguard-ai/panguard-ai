/**
 * panguard setup - One-command platform setup with skill scanning
 * panguard setup - 一行指令平台安裝並掃描技能
 *
 * Detects installed AI agent platforms, injects MCP config,
 * scans and audits all installed skills, and optionally starts Guard.
 * 偵測已安裝的 AI Agent 平台，注入 MCP 設定，掃描審核所有已安裝技能，可選啟動 Guard。
 */

import { Command } from 'commander';
import { spawn } from 'node:child_process';
import {
  c,
  banner,
  divider,
  symbols,
  promptConfirm,
} from '@panguard-ai/core';
import {
  scanInstalledSkills,
  renderSkillScanResults,
  reviewFlaggedSkills,
  collectSafeSkillNames,
} from './setup-skill-scan.js';

/** Platform-specific restart instructions */
const PLATFORM_RESTART_HINTS: Record<string, string> = {
  'claude-code': 'Close and reopen your terminal',
  'claude-desktop': 'Quit and reopen Claude Desktop',
  'cursor': 'Cmd+Shift+P (or Ctrl+Shift+P) > "Reload Window"',
  'openclaw': 'Close and reopen OpenClaw',
  'codex': 'Restart the Codex CLI session',
  'workbuddy': 'Close and reopen WorkBuddy',
  'nemoclaw': 'Close and reopen NemoClaw',
};

export function setupCommand(): Command {
  const cmd = new Command('setup')
    .description('Auto-detect AI agent platforms and configure Panguard MCP / 自動偵測 AI Agent 平台並設定 Panguard MCP')
    .option('--platform <name>', 'Target a specific platform (claude-code, cursor, openclaw, codex, workbuddy, nemoclaw, claude-desktop)')
    .option('--remove', 'Remove Panguard MCP config from platforms / 移除設定', false)
    .option('--json', 'Output as JSON / 以 JSON 格式輸出', false)
    .option('--yes', 'Skip confirmation prompts / 跳過確認提示', false)
    .option('--skip-scan', 'Skip skill scanning / 跳過技能掃描', false)
    .option('--skip-guard', 'Skip guard start prompt / 跳過 Guard 啟動', false)
    .action(async (options: {
      platform?: string;
      remove: boolean;
      json: boolean;
      yes: boolean;
      skipScan: boolean;
      skipGuard: boolean;
    }) => {
      const mcpConfig = await import('@panguard-ai/panguard-mcp/config');
      const { detectPlatforms, injectMCPConfig, removeMCPConfig } = mcpConfig;

      if (!options.json) {
        banner('Panguard Setup');
        console.log();
      }

      // 1. Detect platforms
      if (!options.json) {
        console.log(c.dim('  Scanning for AI agent platforms...'));
        console.log();
      }

      const allPlatforms = await detectPlatforms();

      // Filter to target platform if specified
      const validIds = ['claude-code', 'claude-desktop', 'cursor', 'openclaw', 'codex', 'workbuddy', 'nemoclaw'];
      let targets = allPlatforms;
      if (options.platform) {
        if (!validIds.includes(options.platform)) {
          console.error(c.red(`  Unknown platform: ${options.platform}`));
          console.error(c.dim(`  Valid platforms: ${validIds.join(', ')}`));
          process.exitCode = 1;
          return;
        }
        targets = allPlatforms.filter((p) => p.id === options.platform);
      }

      // 2. Show detection results
      if (!options.json) {
        console.log(c.bold('  Detected Platforms:'));
        console.log();
        for (const p of allPlatforms) {
          const status = p.detected
            ? p.alreadyConfigured
              ? c.green(`${symbols.pass} configured`)
              : c.yellow(`${symbols.warn} not configured`)
            : c.dim(`${symbols.dot} not found`);
          console.log(`    ${p.detected ? c.bold(p.name) : c.dim(p.name)}  ${status}`);
        }
        console.log();
        divider();
        console.log();
      }

      // Determine which platforms to act on
      const actionable = options.remove
        ? targets.filter((p) => p.alreadyConfigured)
        : targets.filter((p) => p.detected && !p.alreadyConfigured);

      if (actionable.length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ action: options.remove ? 'remove' : 'setup', results: [] }));
        } else {
          const msg = options.remove
            ? 'No platforms have Panguard configured.'
            : 'All detected platforms are already configured, or no platforms found.';
          console.log(c.green(`  ${symbols.pass} ${msg}`));
          console.log();
          console.log(c.dim('  Run with --platform <name> to target a specific platform.'));
        }
        return;
      }

      // 3. Execute injection or removal
      if (!options.json) {
        const action = options.remove ? 'Removing from' : 'Configuring';
        console.log(c.bold(`  ${action} ${actionable.length} platform(s):`));
        console.log();
      }

      const results: Array<{ success: boolean; platformId: string; configPath?: string; error?: string }> = [];
      for (const p of actionable) {
        const result = options.remove
          ? removeMCPConfig(p.id)
          : injectMCPConfig(p.id);
        results.push(result);

        if (!options.json) {
          const icon = result.success ? c.green(symbols.pass) : c.red(symbols.fail);
          console.log(`    ${icon} ${p.name}`);
          if (result.success) {
            console.log(c.dim(`      ${result.configPath}`));
          } else {
            console.log(c.red(`      Error: ${result.error}`));
          }
        }
      }

      if (options.json) {
        console.log(JSON.stringify({
          action: options.remove ? 'remove' : 'setup',
          results: results.map((r) => ({
            platform: r.platformId,
            success: r.success,
            configPath: r.configPath,
            error: r.error,
          })),
        }, null, 2));
        return;
      }

      console.log();
      divider();
      console.log();

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed === 0) {
        console.log(c.green(`  ${symbols.pass} All ${succeeded} platform(s) configured successfully.`));
      } else {
        console.log(c.yellow(`  ${succeeded} succeeded, ${failed} failed.`));
      }

      // ── 4. Scan installed skills ──────────────────────────────────
      if (!options.remove && !options.skipScan) {
        console.log();
        divider('Skill Security Scan');
        console.log();
        console.log(c.dim('  Scanning installed MCP skills across all platforms...'));
        console.log();

        try {
          const { discoverAllSkills } = await import('@panguard-ai/panguard-mcp/config');
          const skills = await discoverAllSkills();

          if (skills.length > 0) {
            const scanResults = await scanInstalledSkills(skills);
            renderSkillScanResults(scanResults);

            // Whitelist safe skills
            const safeNames = collectSafeSkillNames(scanResults);
            if (safeNames.length > 0) {
              console.log();
              console.log(c.green(`  ${symbols.pass} ${safeNames.length} safe skill(s) auto-whitelisted.`));
            }

            // Review flagged skills interactively
            const flagged = scanResults.filter((r) => r.status === 'flagged');
            if (flagged.length > 0 && !options.yes) {
              await reviewFlaggedSkills(flagged);
            } else if (flagged.length > 0) {
              console.log(c.yellow(`  ${symbols.warn} ${flagged.length} flagged skill(s) — run panguard guard --interactive to review.`));
            }
          } else {
            console.log(c.dim(`  ${symbols.info} No MCP skills found. Skills will be audited as you install them.`));
          }
        } catch {
          console.log(c.dim(`  ${symbols.info} Skill scanning skipped (auditor not available).`));
        }

        console.log();
        divider();
      }

      // ── 5. Start guard ─────────────────────────────────────────────
      if (!options.remove && !options.skipGuard) {
        console.log();
        const startGuard = options.yes || await promptConfirm({
          message: {
            en: 'Start Panguard Guard now? (24/7 protection)',
            'zh-TW': '現在啟動 Panguard Guard 嗎？（24/7 防護）',
          },
          defaultValue: true,
          lang: 'en',
        });

        if (startGuard) {
          console.log();
          console.log(c.dim('  Starting Panguard Guard in background...'));

          try {
            const child = spawn('npx', ['panguard-guard', 'start'], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
            console.log(c.green(`  ${symbols.pass} Guard started (PID: ${child.pid}).`));
            console.log(c.dim('    Run "panguard guard --watch" to see the live dashboard.'));
          } catch {
            console.log(c.yellow(`  ${symbols.warn} Could not start guard automatically.`));
            console.log(c.dim('    Run manually: panguard guard --watch'));
          }
        }
      }

      // ── Next steps ─────────────────────────────────────────────────
      console.log();
      console.log(c.dim('  Next steps:'));
      console.log(c.dim('    1. Restart your AI agent:'));

      const configuredPlatforms = actionable.filter((_, i) => results[i]?.success);
      for (const p of configuredPlatforms) {
        const restartHint = PLATFORM_RESTART_HINTS[p.id] ?? 'Restart the application';
        console.log(c.dim(`       ${p.name}: ${restartHint}`));
      }

      console.log(c.dim('    2. Ask your agent: "Run panguard_status to check security"'));
      console.log(c.dim('    3. Try: "Audit the skills in this project with panguard_audit_skill"'));
      console.log();
    });

  return cmd;
}
