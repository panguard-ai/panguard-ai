#!/usr/bin/env node

/**
 * Panguard MCP - CLI Entry Point
 * Panguard MCP - CLI 入口點
 *
 * Starts the Panguard MCP server on stdio for integration with
 * Claude Desktop, Cursor, or Claude Code.
 * 在 stdio 上啟動 Panguard MCP 伺服器，用於與 Claude Desktop、Cursor 或 Claude Code 整合。
 *
 * @module @panguard-ai/panguard-mcp/cli
 */

import { startMCPServer, PANGUARD_MCP_VERSION } from '../server.js';
import { createLogger } from '@panguard-ai/core';

const logger = createLogger('panguard-mcp:cli');

// Print version if --version or -v flag provided
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  process.stdout.write(PANGUARD_MCP_VERSION + '\n');
  process.exit(0);
}

// Print help if --help or -h flag provided
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(`
Panguard MCP Server v${PANGUARD_MCP_VERSION}
Usage: panguard-mcp [options]

Options:
  --version, -v    Print version and exit
  --help, -h       Print this help and exit

Description:
  Starts the Panguard MCP server on stdio, allowing Claude Desktop,
  Cursor, or Claude Code to control Panguard security scanning and
  real-time threat monitoring via conversation.

  透過 stdio 啟動 Panguard MCP 伺服器，讓 Claude Desktop、Cursor
  或 Claude Code 透過對話控制 Panguard 安全掃描和即時威脅監控。

Claude Desktop configuration (~/Library/Application Support/Claude/claude_desktop_config.json):
  {
    "mcpServers": {
      "panguard": {
        "command": "panguard-mcp"
      }
    }
  }

Available tools:
  panguard_scan           Run system security health check
  panguard_scan_code      Scan source code for vulnerabilities (SAST)
  panguard_guard_start    Start real-time threat monitoring
  panguard_guard_stop     Stop threat monitoring daemon
  panguard_status         Get status of all Panguard services
  panguard_alerts         Get recent security alerts
  panguard_block_ip       Manually block an IP address
  panguard_generate_report Generate PDF compliance report
  panguard_init           Initialize Panguard configuration
  panguard_deploy         One-click deployment of all Panguard services
`);
  process.exit(0);
}

// Start the MCP server
startMCPServer().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error('MCP server failed to start: ' + message);
  process.exit(1);
});
