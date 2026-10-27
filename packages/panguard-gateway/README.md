# @panguard-ai/panguard-gateway

An [Open Responses](https://www.openresponses.org/specification) gateway that sits between an agent
and its model provider and checks the traffic against ATR (Agent Threat Rules): tool definitions,
user input, tool results, the model's tool calls before the client can run them, and the model's
text.

Status: proof of concept, phase 1. Private package, not published. Verified only against the
deterministic mock provider in `tests/fixtures/`; no real provider has been connected yet.

## What it checks

Request side, before anything reaches the provider:

| Checkpoint                      | ATR event                                                    | On a hit                                               |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `tools[]` function definitions  | `mcp_exchange`, tool-definition scope, `inputSchema` naming  | tool removed from `tools` and `allowed_tools` (or 400) |
| `function_call_output`          | `tool_response` (PostToolUse shape), call resolved by ledger | output replaced, `call_id` kept (or 400)               |
| role=user messages              | `llm_input`                                                  | 400 `policy_violation`                                 |
| other tool outputs (`*_output`) | `tool_response`                                              | 400 `policy_violation` (their shape is the provider's) |
| `previous_response_id`          | ledger lookup                                                | synthetic output for each call the gateway withheld    |
| system/developer, images, files | not scanned                                                  | counted under `not_inspected`                          |

The input of `/responses/compact` gets the same checks: the compacted window comes back encrypted
and is never readable again.

Stream and JSON responses:

| Checkpoint                          | What happens                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `output_item.added` (function_call) | the whole item is held, `added` included                                                   |
| `function_call_arguments.done`      | main check: declared tool scope, Guard blocklist, ATR `tool_call`                          |
| `output_item.done` (function_call)  | name, `call_id`, every `arguments.done` and the joined deltas must match what was checked  |
| `output_text.delta` / `.done`       | all new text (plus 4K of context) checked every 256 characters and at the end              |
| text in any other carrier           | pre-filled `added` content, `text` parts, differing `.done` text: checked before it leaves |
| provider-hosted tool receipts       | scanned and recorded, never blocked (the tool already ran)                                 |
| events outside the spec's set       | dropped and counted (their content cannot be inspected)                                    |

Event shapes follow ATR's own builders (`src/hook-handler.ts`, `src/cli/mcp-tools-document.ts`,
`src/corpus-event.ts`), the shapes ATR's false-positive gate measures rules on. Arguments are parsed
and re-serialized so `tool_args` matches `JSON.stringify` output.

## How a block looks

- **Refusal (default, A):** the blocked `function_call` never reaches the client; a refusal message
  takes its output slot and the response still completes, so the agent loop keeps going.
- **Incomplete (B):** the response ends as `incomplete`, reason `content_filter`. Text the model
  already streamed cannot be recalled, so a text hit always ends this way; set
  `PANGUARD_GATEWAY_TEXT_HOLDBACK` to keep that many characters back until checked.
- **Rewritten tool output (E):** `[PanGuard] tool output withheld: <rule ids>`, same `call_id`.
- **Failed:** reserved for the gateway's own faults under fail-closed (an evaluation that errors or
  passes its deadline): `error` event, then `response.failed`, code `gateway_evaluation_failed`.

Every event the client receives is renumbered from 0 and the terminal event carries a complete
response snapshot. The gateway adds no events or items of its own: the official conformance suite
validates both against closed unions. Its verdict travels in the terminal response's
`panguard:verdict` field (outcome, every non-allow decision with rule ids, what was not inspected,
and `evaluated_with`: the agent-threat-rules release, lane and Open Responses version the verdict was
reached with, so a result can be reproduced against the same rules),
and every decision, allow included, is appended to a tamper-evident `AuditChain`
(`~/.panguard-guard/gateway-verdicts.jsonl`).

## State

An in-memory verdict ledger keeps metadata about relayed responses, never their text: per response,
its function calls with name, canonical arguments (or only their hash), verdict and rule ids. It
resolves the call behind each `function_call_output`, rejects outputs for calls the gateway withheld
or that no recorded call matches, and answers the provider's pending calls after a rewrite, so
provider and client state agree. A restart forgets it.

## Running

```bash
pnpm --filter @panguard-ai/panguard-gateway... build
PANGUARD_GATEWAY_UPSTREAM=https://provider.example/v1 node packages/panguard-gateway/dist/cli.js
```

`node dist/cli.js --help` lists the settings (lane, fail mode, block style, text hold-back,
evaluation deadline, audit log, blocklist, allowed browser origins). Requests that carry a browser
`Origin` header, HTTP and WebSocket alike, are refused unless the origin is allowed; agents and
SDKs send none. ATR runs in worker threads with a hard deadline per
evaluation. Texts over 100,000 characters, which ATR would skip, are scanned the way the MCP proxy
scans long tool responses (`ProxyEvaluator.evaluateEvent`: 90,000-character windows overlapping by
10,000), and in that range only maturity=stable rules block; other critical hits are flagged. Per text the gateway scans the
first 400,000 characters and the last 90,000; a longer text counts as partially scanned and is
blocked under fail-closed.

## Tests

```bash
pnpm --filter @panguard-ai/panguard-gateway... build   # the ATR worker runs compiled JS
pnpm exec vitest run packages/panguard-gateway
bash packages/panguard-gateway/scripts/conformance.sh  # official suite, needs bun and network
```

`conformance.sh` runs the official Open Responses compliance suite (pinned commit `8907bc3`)
against the gateway in front of the mock provider, then sends every block the gateway can emit
through the official SSE parser and response schema. The CI test job skips that part: it needs the
official repository.

## Known limits

- One mock provider only; real providers' event slicing, `obfuscation` and `logprobs` are untested.
- Hunt-lane false positives on real Open Responses traffic have not been measured.
- The ledger is per process and in memory. `background: true` is refused (400): its results come
  back through provider routes the gateway never sees.
- Only client-executed function tools can be stopped before they run. Every other `*_call` item is
  treated as the receipt of a tool the provider already ran: scanned and recorded, not held. A
  provider tool that the client executes (a local shell or computer-use action, say) therefore is
  not stopped yet; that needs a per-provider list of client-executed item types. Their results
  are scanned on the next request.
- Model refusals and reasoning text are relayed unscanned and counted (`unscanned_output_parts`).
- With text hold-back 0 (the default), text the model streamed before a hit has reached the client
  by the time the response is cut.
- Past 100,000 characters only maturity=stable rules block (shared with the MCP proxy, because the
  broad test-maturity rules block large benign files there). An attack padded past that length and
  caught only by non-stable rules is flagged, not blocked.
- Items that appear only in the provider's terminal event, never streamed, are left out of the
  terminal response the client receives.
