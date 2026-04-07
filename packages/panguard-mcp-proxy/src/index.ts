#!/usr/bin/env node
/**
 * PanGuard MCP Proxy — entry point
 *
 * Usage:
 *   panguard-mcp-proxy -- <upstream-command> [args...]
 *   npx @panguard-ai/panguard-mcp-proxy -- npx @modelcontextprotocol/server-filesystem /tmp
 *
 * Sits between the AI agent and any MCP server.
 * Every tool call is evaluated against 100+ ATR detection rules.
 * Malicious calls are blocked. Clean calls are forwarded.
 *
 * @module @panguard-ai/panguard-mcp-proxy
 */

import { MCPProxy } from './proxy.js';

function parseArgs(argv: readonly string[]): { command: string; args: string[] } | null {
  // Find "--" separator
  const sepIdx = argv.indexOf('--');
  if (sepIdx === -1 || sepIdx >= argv.length - 1) {
    return null;
  }

  const upstreamArgs = argv.slice(sepIdx + 1);
  const command = upstreamArgs[0]!;
  const args = upstreamArgs.slice(1);

  return { command, args };
}

async function main(): Promise<void> {
  const upstream = parseArgs(process.argv);

  if (!upstream) {
    process.stderr.write(
      'PanGuard MCP Proxy — runtime protection for AI agent tool calls\n\n' +
        'Usage: panguard-mcp-proxy -- <command> [args...]\n\n' +
        'Examples:\n' +
        '  panguard-mcp-proxy -- npx @modelcontextprotocol/server-filesystem /tmp\n' +
        '  panguard-mcp-proxy -- node my-mcp-server.js\n\n' +
        'In MCP config:\n' +
        '  { "command": "npx", "args": ["-y", "@panguard-ai/panguard-mcp-proxy", "--", "npx", "your-server"] }\n'
    );
    process.exit(1);
  }

  const proxy = new MCPProxy({
    upstreamCommand: upstream.command,
    upstreamArgs: upstream.args,
  });

  await proxy.start();
}

main().catch((err) => {
  process.stderr.write(
    `[panguard-proxy] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
