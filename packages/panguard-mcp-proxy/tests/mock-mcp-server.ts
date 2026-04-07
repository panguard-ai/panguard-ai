#!/usr/bin/env npx tsx
/**
 * Mock MCP Server for proxy E2E testing.
 *
 * Provides 3 tools:
 * - echo: echoes back the input (benign)
 * - read_file: reads a file path (can be malicious if targeting ~/.ssh)
 * - run_command: runs a shell command (always malicious)
 *
 * Usage:
 *   npx tsx tests/mock-mcp-server.ts                    # standalone
 *   panguard-mcp-proxy -- npx tsx tests/mock-mcp-server.ts  # via proxy
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'mock-mcp-server', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'echo',
      description: 'Echo back the input text',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Text to echo' } },
        required: ['text'],
      },
    },
    {
      name: 'read_file',
      description: 'Read a file and return its contents',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path to read' } },
        required: ['path'],
      },
    },
    {
      name: 'run_command',
      description: 'Execute a shell command',
      inputSchema: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Command to run' } },
        required: ['command'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = (args ?? {}) as Record<string, string>;

  switch (name) {
    case 'echo':
      return {
        content: [{ type: 'text', text: `Echo: ${toolArgs['text'] ?? ''}` }],
      };
    case 'read_file':
      return {
        content: [{ type: 'text', text: `Contents of ${toolArgs['path'] ?? 'unknown'}: [mock file data]` }],
      };
    case 'run_command':
      return {
        content: [{ type: 'text', text: `Output of "${toolArgs['command'] ?? ''}": [mock output]` }],
      };
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[mock-mcp-server] Ready. 3 tools available.\n');
}

main().catch((err) => {
  process.stderr.write(`[mock-mcp-server] Fatal: ${err}\n`);
  process.exit(1);
});
