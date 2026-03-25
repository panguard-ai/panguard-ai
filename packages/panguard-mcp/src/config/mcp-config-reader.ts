/**
 * MCP Config Reader - Parse installed MCP servers from platform configs
 * MCP 設定讀取器 - 從平台設定檔解析已安裝的 MCP 伺服器
 *
 * Reads each detected platform's config file and extracts all mcpServers
 * entries, enabling skill discovery across Claude Code, Cursor, OpenClaw, etc.
 *
 * @module @panguard-ai/panguard-mcp/config/mcp-config-reader
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { homedir } from 'node:os';
import { createLogger } from '@panguard-ai/core';
import { detectPlatforms, getConfigPath } from './platform-detector.js';
import type { PlatformId } from './platform-detector.js';

const logger = createLogger('panguard-mcp:config-reader');

/** A single MCP server entry discovered from a platform config. */
export interface MCPServerEntry {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly configPath: string;
  readonly platformId: PlatformId;
}

/**
 * Parse mcpServers from a platform config file.
 * Returns empty array on failure (missing file, bad JSON, etc.).
 */
export function parseMCPServers(
  configPath: string,
  platformId: PlatformId
): readonly MCPServerEntry[] {
  if (!existsSync(configPath)) return [];

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

    const config = parsed as Record<string, unknown>;
    const servers = config['mcpServers'] as Record<string, unknown> | undefined;
    if (!servers || typeof servers !== 'object') return [];

    const entries: MCPServerEntry[] = [];

    for (const [name, value] of Object.entries(servers)) {
      if (!value || typeof value !== 'object') continue;
      const server = value as Record<string, unknown>;
      const command = typeof server['command'] === 'string' ? server['command'] : '';
      const args = Array.isArray(server['args'])
        ? (server['args'] as unknown[]).filter((a): a is string => typeof a === 'string')
        : [];

      if (!command) continue;

      const env =
        server['env'] && typeof server['env'] === 'object'
          ? Object.fromEntries(
              Object.entries(server['env'] as Record<string, unknown>)
                .filter(([, v]) => typeof v === 'string')
                .map(([k, v]) => [k, v as string])
            )
          : undefined;

      entries.push({ name, command, args, env, configPath, platformId });
    }

    return entries;
  } catch (err) {
    logger.warn(
      `Failed to parse MCP config at ${configPath}: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}

/**
 * Resolve the skill directory from an MCP server entry.
 * For npx packages: attempts require.resolve. For local paths: uses command dir.
 * Returns null if resolution fails.
 */
export function resolveSkillDir(entry: MCPServerEntry): string | null {
  // Claude Code skill/command/agent: args[0] is the .md file path
  if (['skill', 'command', 'agent'].includes(entry.command)) {
    const mdPath = entry.args[0];
    if (mdPath && existsSync(mdPath)) {
      // If it's a file, return its directory; if it's in a skill dir with SKILL.md, return that
      return mdPath.endsWith('.md') ? dirname(mdPath) : mdPath;
    }
    // configPath is the skill directory for directory-based skills
    if (entry.configPath && existsSync(entry.configPath)) {
      return entry.configPath;
    }
    return null;
  }

  // npx -y @package/name pattern
  if (entry.command === 'npx' && entry.args.length >= 1) {
    const pkgArg = entry.args.find((a) => !a.startsWith('-'));
    if (pkgArg) {
      try {
        const resolved = require.resolve(`${pkgArg}/package.json`, { paths: [process.cwd()] });
        return dirname(resolved);
      } catch {
        return null;
      }
    }
  }

  // node /path/to/server.js pattern
  if (entry.command === 'node' && entry.args.length >= 1) {
    const scriptPath = entry.args[0];
    if (scriptPath && existsSync(scriptPath)) {
      return dirname(scriptPath);
    }
  }

  // Direct command path
  if (entry.command.startsWith('/') || entry.command.startsWith('.')) {
    if (existsSync(entry.command)) {
      return dirname(entry.command);
    }
  }

  return null;
}

/**
 * Remove a specific MCP server entry from a platform config file.
 * Returns true if the server was found and removed, false otherwise.
 *
 * @param platformId - The platform to remove the server from
 * @param serverName - The name of the server entry to remove
 */
export function removeServer(platformId: PlatformId, serverName: string): boolean {
  const configPath = getConfigPath(platformId);
  if (!existsSync(configPath)) return false;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

    const config = parsed as Record<string, unknown>;
    const servers = config['mcpServers'] as Record<string, unknown> | undefined;
    if (!servers || typeof servers !== 'object') return false;

    if (!(serverName in servers)) return false;

    // Create new servers object without the target entry (immutable pattern)
    const updatedServers = Object.fromEntries(
      Object.entries(servers).filter(([key]) => key !== serverName)
    );
    const updatedConfig = { ...config, mcpServers: updatedServers };

    writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    logger.info(`Removed server "${serverName}" from ${platformId} config at ${configPath}`);
    return true;
  } catch (err) {
    logger.warn(
      `Failed to remove server "${serverName}" from ${platformId}: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

/**
 * Discover Claude Code skills, commands, and agents from ~/.claude/.
 * These are .md-based skills that Claude Code loads natively.
 */
function discoverClaudeCodeSkills(): readonly MCPServerEntry[] {
  const claudeDir = join(homedir(), '.claude');
  const entries: MCPServerEntry[] = [];

  const dirs = [
    { path: join(claudeDir, 'skills'), type: 'skill' },
    { path: join(claudeDir, 'commands'), type: 'command' },
    { path: join(claudeDir, 'agents'), type: 'agent' },
  ];

  for (const { path: dirPath, type } of dirs) {
    if (!existsSync(dirPath)) continue;
    try {
      const items = readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        // Directory with SKILL.md inside (e.g. ~/.claude/skills/browse/SKILL.md)
        if (item.isDirectory()) {
          const skillMd = join(dirPath, item.name, 'SKILL.md');
          const readmeMd = join(dirPath, item.name, 'README.md');
          const hasContent = existsSync(skillMd) || existsSync(readmeMd);
          if (hasContent) {
            entries.push({
              name: item.name,
              command: type,
              args: [existsSync(skillMd) ? skillMd : readmeMd],
              configPath: join(dirPath, item.name),
              platformId: 'claude-code',
            });
          }
        }
        // Direct .md file (e.g. ~/.claude/commands/plan.md)
        if (item.isFile() && item.name.endsWith('.md')) {
          const name = basename(item.name, '.md');
          entries.push({
            name,
            command: type,
            args: [join(dirPath, item.name)],
            configPath: join(dirPath, item.name),
            platformId: 'claude-code',
          });
        }
      }
    } catch {
      // Directory not readable
    }
  }

  return entries;
}

/**
 * Discover all skills installed across all detected platforms.
 * Includes MCP servers (JSON config) AND Claude Code skills (.md files).
 * Filters out Panguard's own entries.
 */
export async function discoverAllSkills(): Promise<readonly MCPServerEntry[]> {
  const platforms = await detectPlatforms();
  const detected = platforms.filter((p) => p.detected);
  const allSkills: MCPServerEntry[] = [];

  // 1. MCP servers from platform JSON configs
  for (const platform of detected) {
    // OpenClaw uses native skills, not MCP JSON config
    if (platform.id === 'openclaw') continue;
    const configPath = getConfigPath(platform.id);
    const servers = parseMCPServers(configPath, platform.id);

    for (const server of servers) {
      // Skip Panguard's own entry
      if (server.name === 'panguard') continue;
      // Skip entries that resolve to panguard packages
      if (server.args.some((a) => a.includes('panguard'))) continue;
      allSkills.push(server);
    }
  }

  // 2. Claude Code skills, commands, agents (.md files)
  const claudeSkills = discoverClaudeCodeSkills();
  allSkills.push(...claudeSkills);

  logger.info(`Discovered ${allSkills.length} skill(s) across ${detected.length} platform(s)`);
  return allSkills;
}
