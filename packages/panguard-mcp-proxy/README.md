# @panguard-ai/panguard-mcp-proxy

MCP Proxy — runtime interception for AI agent tool calls using ATR (Agent Threat Rules).

Transparent tool-call evaluation:

- Intercepts MCP tool calls at runtime
- Evaluates threats against 675+ ATR rules
- Allows or blocks execution based on policy
- Integration with Claude, Cursor, and other AI agents

Part of the **PanGuard Community** suite — 100% free and open source (MIT).

```bash
npm install @panguard-ai/panguard-mcp-proxy
```

## Failure mode and the scan time limit

Each scan has a time limit (`evalTimeout`, 15 s by default). A scan that errors, or does not finish within the limit, is decided by the fail mode:

- `closed` (the default): the call or response is blocked.
- `open` (`failMode: 'open'` or `PANGUARD_PROXY_FAIL_MODE=open`): the call or response is allowed.

Under `open`, a scan that does not finish within the limit is allowed through, so an upstream server that makes a scan exceed the limit gets its content forwarded unscanned. Use `open` only where availability matters more than that guarantee.

**License**: MIT
