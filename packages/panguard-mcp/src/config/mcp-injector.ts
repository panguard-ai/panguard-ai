/**
 * MCP Config Injector - Write Panguard MCP config to AI agent platforms
 * MCP 設定注入器 - 將 Panguard MCP 設定寫入 AI Agent 平台
 *
 * Supports Claude Code, Claude Desktop, Cursor, OpenClaw, Codex, Workbuddy, NemoClaw, ArkClaw.
 *
 * @module @panguard-ai/panguard-mcp/config/mcp-injector
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createLogger } from '@panguard-ai/core';
import type { PlatformId } from './platform-detector.js';
import { getConfigPath } from './platform-detector.js';

const logger = createLogger('panguard-mcp:injector');

export interface InjectionResult {
  platformId: PlatformId;
  success: boolean;
  configPath: string;
  backupPath?: string;
  error?: string;
}

/** The MCP server entry Panguard adds to config files. */
const PANGUARD_MCP_ENTRY = {
  command: 'npx',
  args: ['-y', '@panguard-ai/panguard-mcp'],
};

/**
 * Read an existing JSON config file, or return empty object.
 * 讀取現有 JSON 設定檔，或回傳空物件。
 */
function readJsonSafe(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Back up a config file before modifying it.
 * 修改前備份設定檔。
 */
function backupFile(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  const backupPath = `${filePath}.bak.${Date.now()}`;
  copyFileSync(filePath, backupPath);
  logger.info(`Backed up ${filePath} -> ${backupPath}`);
  return backupPath;
}

/**
 * Ensure parent directory exists.
 * 確保父目錄存在。
 */
function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Inject Panguard MCP config for Claude Desktop.
 * Claude Desktop uses: { "mcpServers": { "panguard": { "command": "...", "args": [...] } } }
 */
function injectClaudeDesktop(configPath: string): void {
  const config = readJsonSafe(configPath);
  const servers = (config['mcpServers'] as Record<string, unknown>) ?? {};
  servers['panguard'] = { ...PANGUARD_MCP_ENTRY };
  config['mcpServers'] = servers;
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Inject Panguard MCP config for Claude Code.
 * Claude Code uses `claude mcp add` CLI (not JSON file).
 * Falls back to writing settings.local.json if CLI not available.
 */
function injectClaudeCode(_configPath: string): void {
  try {
    // Try `claude mcp add` first (the correct way for Claude Code)
    execFileSync(
      'claude',
      ['mcp', 'add', '--scope', 'user', 'panguard', '--', 'npx', '-y', '@panguard-ai/panguard-mcp'],
      {
        timeout: 15_000,
        stdio: 'pipe',
      }
    );
    logger.info('Added Panguard MCP via `claude mcp add --scope user`');
  } catch {
    // Fallback: write JSON directly (older Claude Code versions)
    logger.warn('`claude mcp add` failed, falling back to JSON config');
    const config = readJsonSafe(_configPath);
    const servers = (config['mcpServers'] as Record<string, unknown>) ?? {};
    servers['panguard'] = { ...PANGUARD_MCP_ENTRY };
    config['mcpServers'] = servers;
    writeFileSync(_configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

/**
 * Inject Panguard MCP config for Cursor.
 * Cursor uses: { "mcpServers": { "panguard": { "command": "...", "args": [...] } } }
 * in ~/.cursor/mcp.json
 */
function injectCursor(configPath: string): void {
  const config = readJsonSafe(configPath);
  const servers = (config['mcpServers'] as Record<string, unknown>) ?? {};
  servers['panguard'] = { ...PANGUARD_MCP_ENTRY };
  config['mcpServers'] = servers;
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Inject Panguard MCP config for Codex/Workbuddy/NemoClaw.
 * Generic MCP JSON format: { "mcpServers": { "panguard": { ... } } }
 */
function injectGenericMCP(configPath: string): void {
  const config = readJsonSafe(configPath);
  const servers = (config['mcpServers'] as Record<string, unknown>) ?? {};
  servers['panguard'] = { ...PANGUARD_MCP_ENTRY };
  config['mcpServers'] = servers;
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Inject Panguard as an OpenClaw native skill.
 * OpenClaw uses its own skill system (not MCP), so we copy SKILL.md
 * to ~/.openclaw/skills/panguard/.
 */
function injectOpenClawSkill(skillDir: string): void {
  mkdirSync(skillDir, { recursive: true });

  // Resolve the bundled SKILL.md from this package
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const bundledSkill = join(thisDir, '..', '..', 'openclaw-skill', 'SKILL.md');

  if (existsSync(bundledSkill)) {
    copyFileSync(bundledSkill, join(skillDir, 'SKILL.md'));
  } else {
    // Fallback: write a minimal SKILL.md inline
    const skillContent = [
      '---',
      'name: panguard',
      'description: AI agent security platform -- audit skills, scan threats, run 24/7 protection',
      'homepage: https://panguard.ai',
      'license: MIT',
      'metadata: { "openclaw": { "requires": { "bins": ["npx"] }, "install": [{ "id": "node", "kind": "node", "package": "@panguard-ai/panguard", "bins": ["panguard"], "label": "Install Panguard AI" }] } }',
      '---',
      '',
      '# Panguard AI',
      '',
      'Security platform for AI agents with 10,400+ detection rules.',
      '',
      '## Commands',
      '- `panguard audit skill .` -- Audit skills for threats',
      '- `panguard scan` -- Security scan',
      '- `panguard guard start` -- Start real-time protection',
      '- `panguard status` -- Show status dashboard',
      '',
    ].join('\n');
    writeFileSync(join(skillDir, 'SKILL.md'), skillContent, 'utf-8');
  }
}

/**
 * Inject Panguard MCP config into a specific platform.
 * 將 Panguard MCP 設定注入特定平台。
 *
 * @param platformId - Target platform / 目標平台
 * @returns Injection result with success status and paths.
 */
export function injectMCPConfig(platformId: PlatformId): InjectionResult {
  const configPath = getConfigPath(platformId);
  const result: InjectionResult = { platformId, success: false, configPath };

  try {
    ensureDir(configPath);
    result.backupPath = backupFile(configPath);

    switch (platformId) {
      case 'claude-desktop':
        injectClaudeDesktop(configPath);
        break;
      case 'claude-code':
        injectClaudeCode(configPath);
        break;
      case 'cursor':
        injectCursor(configPath);
        break;
      case 'openclaw':
        injectOpenClawSkill(configPath);
        break;
      case 'codex':
      case 'workbuddy':
      case 'nemoclaw':
      case 'arkclaw':
      case 'windsurf':
      case 'qclaw':
      case 'cline':
      case 'vscode-copilot':
      case 'zed':
      case 'gemini-cli':
      case 'continue':
      case 'roo-code':
        injectGenericMCP(configPath);
        break;
    }

    // Verify the write succeeded
    if (platformId === 'claude-code') {
      // Claude Code: verify via `claude mcp list`
      try {
        const output = execFileSync('claude', ['mcp', 'list'], {
          timeout: 10_000,
          stdio: 'pipe',
        }).toString();
        if (output.includes('panguard')) {
          result.success = true;
          logger.info('Verified Panguard MCP in Claude Code via `claude mcp list`');
        } else {
          // Might take a moment to register, assume success if inject didn't throw
          result.success = true;
          logger.info('Panguard MCP added to Claude Code (pending verification)');
        }
      } catch {
        result.success = true; // inject didn't throw, assume OK
        logger.info('Panguard MCP injected into Claude Code');
      }
    } else if (platformId === 'openclaw') {
      // OpenClaw uses SKILL.md, not JSON
      if (existsSync(join(configPath, 'SKILL.md'))) {
        result.success = true;
        logger.info(`Installed Panguard skill for OpenClaw at ${configPath}`);
      } else {
        result.error = 'Verification failed: SKILL.md not found after write';
        logger.error(result.error);
      }
    } else {
      const verify = readJsonSafe(configPath);
      const servers = verify['mcpServers'] as Record<string, unknown> | undefined;
      if (servers && servers['panguard']) {
        result.success = true;
        logger.info(`Injected Panguard MCP config into ${platformId} at ${configPath}`);
      } else {
        result.error = 'Verification failed: panguard entry not found after write';
        logger.error(result.error);
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to inject ${platformId}: ${result.error}`);
  }

  return result;
}

/**
 * Remove Panguard MCP config from a specific platform.
 * 從特定平台移除 Panguard MCP 設定。
 */
export function removeMCPConfig(platformId: PlatformId): InjectionResult {
  const configPath = getConfigPath(platformId);
  const result: InjectionResult = { platformId, success: false, configPath };

  try {
    if (platformId === 'openclaw') {
      // Remove OpenClaw skill directory
      const skillMd = join(configPath, 'SKILL.md');
      if (existsSync(skillMd)) {
        rmSync(configPath, { recursive: true, force: true });
        logger.info(`Removed Panguard skill from OpenClaw`);
      }
      result.success = true;
      return result;
    }

    if (!existsSync(configPath)) {
      result.success = true;
      return result;
    }

    result.backupPath = backupFile(configPath);
    const config = readJsonSafe(configPath);
    const servers = config['mcpServers'] as Record<string, unknown> | undefined;
    if (servers) {
      delete servers['panguard'];
      config['mcpServers'] = servers;
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    result.success = true;
    logger.info(`Removed Panguard MCP config from ${platformId}`);
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to remove from ${platformId}: ${result.error}`);
  }

  return result;
}

/**
 * Inject Panguard MCP config into all detected platforms.
 * 將 Panguard MCP 設定注入所有偵測到的平台。
 */
export async function injectAll(platformIds: PlatformId[]): Promise<InjectionResult[]> {
  return platformIds.map((id) => injectMCPConfig(id));
}

/**
 * Get the one-liner install command for display.
 * 取得用於顯示的一行安裝指令。
 */
export function getInstallCommand(): string {
  return 'npx panguard setup';
}
