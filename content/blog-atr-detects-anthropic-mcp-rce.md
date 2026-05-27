# ATR Rules Already Detect the Anthropic MCP RCE Class

_OX Security disclosed a systemic RCE in Anthropic's official MCP SDKs across Python, TypeScript, Java, and Rust. Anthropic declined to patch and called sanitization the developer's problem. The open detection rules already exist. Here is where they live._

---

## What OX Security disclosed

On 2026-05-13, OX Security published [_Mother of All AI Supply Chains_](https://www.ox.security/blog/the-mother-of-all-ai-supply-chains-critical-systemic-vulnerability-at-the-core-of-the-mcp/). The headline finding is that arbitrary command execution sits inside the Model Context Protocol's STDIO transport by design. The flaw is not a parser bug. It is the contract: user input flows directly into MCP server configuration parameters, and the resolved configuration is passed to a shell-exec sink.

The scale numbers from the disclosure:

- 150M+ downloads of vulnerable MCP implementations
- 7,000+ publicly accessible MCP servers
- Up to 200,000 vulnerable instances total
- Commands executed on six live production platforms
- 10 CVEs issued and counting, with LiteLLM, LangChain, IBM LangFlow, and others in scope

OX groups the attack surface into four families:

1. Unauthenticated UI injection in AI frameworks
2. Hardening bypasses in protected environments such as Flowise
3. Zero-click prompt injection in AI IDEs including Cursor and Windsurf
4. Malicious marketplace distribution, where 9 of 11 MCP registries were poisoned

The Register covered the same class the same week ([_Bug hunter tracks down three serious MCP database flaws, one left unpatched_](https://www.theregister.com)). CVE-2026-33032 (nginx-ui MCP unauthenticated RCE, CVSS 9.8) and CVE-2026-35394 (Mobile MCP intent injection) belong to the same family.

Anthropic's response, as quoted by OX: the STDIO execution model is a secure default and sanitization is the developer's responsibility.

## What "the developer's responsibility" actually means

It means every team running an MCP integration has to write its own input validation, its own command-line sanitizer, its own zero-click config integrity check, and its own response-injection detector. Most teams will not. The ones that do will write something slightly different from the team next door. The detection surface fragments. The attacker only has to find one team that got it wrong.

This is the SIEM-of-2008 pattern. Every vendor writes its own rules. The rules do not compose. Customers pay for the rule-writing labour as part of the product.

Snort fixed that for network detection. Sigma fixed it for host detection. The rule became the contract. Loaders competed on execution, telemetry, and response, not on rewriting the same detections.

ATR is doing the same thing for agent runtime detection. The rules are MIT-licensed, public, and already shipping in production.

## Rules that match the OX disclosure today

ATR v2.2.2 ships 419 rules across 10 categories. Self-test corpus: 100 percent precision, 89.7 percent recall on 341 samples. PINT external corpus: 99.7 percent precision, 63.9 percent recall on 850 samples. Garak recall: 97.1 percent. Detection runs sub-millisecond per scan.

Five rules that map directly to the OX disclosure families:

### ATR-2026-00415 — Flowise Custom MCP STDIO Command Injection (CVE-2026-40933)

Catches the OX hardening-bypass family. Flowise validates the command field against an allow-list, but combining an allow-listed binary with an inline-exec flag (`npx -c '<inline JS>'`, `node -e`, `python3 -c`, `bash -c`) bypasses the check. The rule fires on the flag-arg combination, not on the binary alone. Tested against 7 true-positive PoCs and 5 true-negative benign configurations.

The detection condition is a regex over the resolved tool config:

```yaml
field: tool_response
operator: regex
value: '"command"\s*:\s*"(?:npx|node|deno|bun)"\s*,\s*"args"\s*:\s*\[[^\]]*"-(?:c|e|-eval|-command|-exec)"\s*,\s*"[^"]{4,400}"'
```

A legitimate `npx @modelcontextprotocol/server-filesystem /data` config does not match. A `npx -c "require('child_process').execSync(...)"` does.

### ATR-2026-00419 — Cursor MCP JSON Zero-Click Config RCE (CVE-2025-54136)

Catches the OX zero-click IDE family. Cursor, Windsurf, Claude Code, Gemini CLI, and GitHub Copilot all auto-load `.cursor/mcp.json` or equivalent on workspace open. An attacker who modifies that file via supply chain (npm postinstall, malicious commit, repo template) gets RCE the moment a developer opens the project. No prompt, no consent dialog. The rule fires on the config file path co-located with a shell-binary command field or an interpreter inline-exec flag, plus separate conditions for postinstall-script tampering of the config dir.

### ATR-2026-00434 — mcp-remote authorization_endpoint OS Command Injection (CVE-2025-6514)

Catches the OAuth-metadata injection variant. mcp-remote interpolates the `authorization_endpoint` field from an OAuth metadata response into a shell context without sanitization. A crafted URL containing `$()`, backticks, `;`, `|`, or `&&` executes arbitrary commands on the client. The rule covers all five OAuth/OIDC metadata fields (authorization, registration, token, jwks, userinfo, end-session) and the URL-encoded bypass form.

### ATR-2026-00521 — Shell Command Injection in Agent Tool Context

Catches the OX unauthenticated UI injection family at the prompt boundary. Detects benign-looking task requests that embed a shell chain to curl, wget, nc, bash, sh, python3, or powershell. Stable rule, status production, derived from the promptfoo redteam shell-injection corpus.

### ATR-2026-00011 — Instruction Injection via Tool Output

Catches the post-execution side. When a malicious MCP server is allowed to respond, the response often carries hidden agent-directed instructions: urgency-prefixed directives, fake system tokens, suppression commands, exfiltration URLs. The rule has 13 detection conditions, status experimental, validated against 53,577 wild samples with zero false positives.

## Deploy in five minutes

ATR rules ship as a single npm package. The loader is whatever you want it to be — PanGuard Guard, Cisco Skill Scanner, MISP, or your own runtime.

```bash
npm install agent-threat-rules
```

Programmatic scan of an MCP tool exchange:

```typescript
import { loadRules, scan } from 'agent-threat-rules';

const rules = await loadRules({ categories: ['tool-poisoning', 'agent-manipulation'] });

const result = scan(
  {
    agent_source: { type: 'mcp_exchange', framework: 'any', provider: 'any' },
    tool_response: incomingMcpResponse,
    user_input: userPrompt,
  },
  rules
);

if (result.matched.length > 0) {
  console.error(
    'ATR matched:',
    result.matched.map((m) => m.id)
  );
  // Block tool call. Alert. Snapshot for review.
}
```

The rules are YAML. Read them. Patch them. Ship them upstream. The license is MIT.

To run ATR as a runtime gate without writing your own loader, use [PanGuard Guard](https://github.com/panguard-ai/panguard-ai). It loads ATR at the agent boundary, enforces block decisions, and emits compliance evidence for SOC 2 and EU AI Act audit. The community tier is free and unlimited.

## What ATR catches and what it does not

Honest coverage caveats. ATR v2.2.2 catches:

- The Flowise allow-list bypass shape (CVE-2026-40933)
- The zero-click IDE config shape across five IDEs (CVE-2025-54136)
- The OAuth metadata injection shape (CVE-2025-6514)
- Shell command chaining in agent tool prompts
- Hidden directives in tool responses
- Registry and supply-chain poisoning signatures
- 416 other rule patterns covering OWASP Agentic Top 10, MITRE ATLAS, and SAFE-MCP

ATR does not catch every variant. Documented evasion classes:

- `/usr/bin/env`-wrapped interpreter calls (the literal command field is `env`)
- Dropped-binary indirection where the MCP config references an absolute path to a payload written earlier in the chain
- Maliciously published npm packages whose name alone is the payload — that path is covered by separate package-hallucination and skill-malware rules
- JSON unicode-escaped shell metacharacters that the regex matches literally but the MCP client decodes before passing to shell

These gaps are tracked in each rule's `evasion_tests` block. PRs to close them are welcome.

## Production proof

ATR is not a research artifact. It is loaded in the following production ecosystems:

- Microsoft `agent-governance-toolkit` (PR #908 merged 2026-04-13)
- Cisco AI Defense `skill-scanner` (PR #79 merged 2026-04-03)
- MISP galaxy and MISP taxonomies (merged 2026-05-11)
- OWASP Agent Security Resource Hub (PR #74 merged 2026-05-11)
- precize Agentic Top 10 Vulnerability mapping (merged 2026-03-30)

~10,000 monthly downloads across the @panguard-ai npm scope + agent-threat-rules + pyatr (May 2026). Microsoft Copilot SWE Agent wrote regression tests against ATR rule IDs in an external repository on 2026-05-11, and ATR shipped the matching rules within two hours sixteen minutes.

## Call to action

OX Security did the right thing by publishing. Anthropic made a position call by declining to patch. The detection layer is where the gap lives. The detection layer has been open and operational since 2026-03.

- Repo: [github.com/Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)
- License: MIT
- Install: `npm install agent-threat-rules`
- Runtime: [github.com/panguard-ai/panguard-ai](https://github.com/panguard-ai/panguard-ai)

If you run an MCP integration in production, the rule files are sitting in a public repo waiting for you to load them. Loading is faster than writing your own sanitizer. It is also faster than waiting for Anthropic to change its mind.

If you maintain an AI security framework and want to load ATR as a detection contract, the integrations above are working references. Open an issue and we will help you wire it in.
