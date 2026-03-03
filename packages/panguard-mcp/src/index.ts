/**
 * Panguard MCP - Public API
 * Panguard MCP - 公開 API
 *
 * MCP server for Panguard AI — control security scanning and guard from
 * Claude Desktop, Cursor, or Claude Code via conversation.
 * 用於 Panguard AI 的 MCP 伺服器 — 透過對話從 Claude Desktop、Cursor 或 Claude Code 控制安全掃描和守護。
 *
 * @module @panguard-ai/panguard-mcp
 */

export { startMCPServer, getAllToolDefinitions, dispatchTool, PANGUARD_MCP_VERSION } from './server.js';
